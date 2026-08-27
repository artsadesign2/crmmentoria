import { prisma } from '@/lib/prisma';
import { sendText } from '@/lib/evolution/server';
import { findOrCreateConversation } from '@/lib/crm/conversations';
import { renderTemplate } from './template';
import {
  POLITICA_PADRAO,
  nextSendDelay,
  remainingQuota,
  withinWindow,
  type DispatchPolicy,
} from './policy';

/**
 * O worker da fila.
 *
 * Substitui um laço que rodava **no navegador do usuário**: fechar a aba
 * interrompia o disparo no meio, e nada ficava gravado sobre quem já tinha
 * recebido. Aqui cada destinatário tem estado próprio no banco, então parar é
 * seguro e recomeçar não repete ninguém.
 *
 * É chamado por um endpoint com segredo, não por um cron de plano específico.
 * Qualquer agendador serve — Vercel Cron, cron externo, ou a própria tela do
 * disparo enquanto está aberta.
 */

/** Teto de tempo de uma passada. Abaixo do limite de função serverless. */
const ORCAMENTO_MS = 50_000;

/** Reivindicação vencida: a função que a pegou morreu antes de terminar. */
const CLAIM_VENCIDO_MS = 5 * 60_000;

/** Teto de destinatários por passada, mesmo com cota disponível. */
const LOTE_PADRAO = 40;

export interface DrainResult {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  /** Quantos ficaram para a próxima passada. Diz se vale chamar de novo. */
  remaining: number;
}

const VAZIO: DrainResult = { processed: 0, sent: 0, failed: 0, skipped: 0, remaining: 0 };

/**
 * Processa o que a fila permitir agora.
 *
 * Sem sessão de propósito: quem chama é um agendador, não um usuário. O
 * isolamento entre organizações vem de processar uma organização por vez, com
 * a política e as cotas dela.
 */
export async function drainQueue(limite = LOTE_PADRAO): Promise<DrainResult> {
  const ateQuando = Date.now() + ORCAMENTO_MS;

  await promoverAgendadas();
  await devolverReivindicacoesVencidas();

  const campanhas = await prisma.dispatchCampaign.findMany({
    where: { status: 'RUNNING' },
    orderBy: { startedAt: 'asc' },
    select: { id: true, organizationId: true, messageTemplate: true },
  });

  if (campanhas.length === 0) return VAZIO;

  const total = { ...VAZIO };
  const politicas = new Map<string, DispatchPolicy>();

  for (const campanha of campanhas) {
    if (Date.now() >= ateQuando) break;

    let politica = politicas.get(campanha.organizationId);
    if (!politica) {
      politica = await carregarPolitica(campanha.organizationId);
      politicas.set(campanha.organizationId, politica);
    }

    // Fora da janela a campanha não é pausada nem cancelada: ela simplesmente
    // não anda agora. Amanhã de manhã a próxima chamada retoma de onde parou.
    if (!withinWindow(politica, new Date())) continue;

    const cota = await cotaDisponivel(campanha.organizationId, politica);
    if (cota <= 0) continue;

    const resultado = await processarCampanha(
      campanha,
      politica,
      Math.min(cota, limite),
      ateQuando
    );

    total.processed += resultado.processed;
    total.sent += resultado.sent;
    total.failed += resultado.failed;
    total.skipped += resultado.skipped;
    total.remaining += resultado.remaining;
  }

  return total;
}

/** Agendada cuja hora chegou vira `RUNNING`. */
async function promoverAgendadas(): Promise<void> {
  await prisma.dispatchCampaign.updateMany({
    where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
    data: { status: 'RUNNING', startedAt: new Date(), updatedAt: new Date() },
  });
}

/**
 * Devolve à fila o que ficou preso em `SENDING`.
 *
 * Uma função serverless pode ser encerrada no meio do envio. Sem esta volta, o
 * destinatário reivindicado ficaria `SENDING` para sempre e a campanha nunca
 * concluiria. O risco assumido é o oposto: se a mensagem chegou a sair antes da
 * morte da função, ela é enviada duas vezes — por isso a espera é de cinco
 * minutos, e não de segundos.
 */
async function devolverReivindicacoesVencidas(): Promise<void> {
  const limite = new Date(Date.now() - CLAIM_VENCIDO_MS);

  const devolvidos = await prisma.dispatchTarget.updateMany({
    where: { status: 'SENDING', claimedAt: { lt: limite } },
    data: { status: 'PENDING', claimedAt: null },
  });

  if (devolvidos.count > 0) {
    console.warn(`[dispatch] ${devolvidos.count} envio(s) presos devolvidos para a fila.`);
  }
}

async function carregarPolitica(organizationId: string): Promise<DispatchPolicy> {
  const salva = await prisma.dispatchSettings.findUnique({ where: { organizationId } });
  if (!salva) return POLITICA_PADRAO;

  return {
    minIntervalMs: salva.minIntervalMs,
    jitterMs: salva.jitterMs,
    maxPerMinute: salva.maxPerMinute,
    windowStartHour: salva.windowStartHour,
    windowEndHour: salva.windowEndHour,
    dailyCap: salva.dailyCap,
    timeZone: salva.timeZone,
  };
}

/**
 * Cota da organização, contada sobre o que realmente saiu.
 *
 * Conta por organização, não por campanha: o WhatsApp vê um número só, e três
 * campanhas simultâneas somando 36 por minuto seriam 36 envios pelo mesmo
 * número.
 */
async function cotaDisponivel(
  organizationId: string,
  politica: DispatchPolicy
): Promise<number> {
  const agora = Date.now();

  const [noMinuto, noDia] = await Promise.all([
    prisma.dispatchTarget.count({
      where: {
        organizationId,
        status: 'SENT',
        sentAt: { gte: new Date(agora - 60_000) },
      },
    }),
    prisma.dispatchTarget.count({
      where: {
        organizationId,
        status: 'SENT',
        sentAt: { gte: new Date(agora - 24 * 60 * 60_000) },
      },
    }),
  ]);

  return remainingQuota(politica, noMinuto, noDia);
}

interface Reivindicado {
  id: string;
  contact_id: string | null;
  phone: string;
  name: string;
}

async function processarCampanha(
  campanha: { id: string; organizationId: string; messageTemplate: string },
  politica: DispatchPolicy,
  quantos: number,
  ateQuando: number
): Promise<DrainResult> {
  const alvos = await reivindicar(campanha.id, quantos);
  if (alvos.length === 0) {
    await concluirSeAcabou(campanha.id);
    return VAZIO;
  }

  // `{{empresa}}` mora no contato, não no destinatário: o registro copia nome e
  // telefone para sobreviver à edição do cadastro, mas empresa é enfeite.
  const empresas = await carregarEmpresas(alvos);

  const resultado = { ...VAZIO };

  for (const alvo of alvos) {
    if (Date.now() >= ateQuando) {
      // Devolve o que não deu tempo: ficar `SENDING` até vencer o claim atrasa
      // a campanha inteira em cinco minutos sem motivo.
      await prisma.dispatchTarget.updateMany({
        where: { id: alvo.id, status: 'SENDING' },
        data: { status: 'PENDING', claimedAt: null },
      });
      continue;
    }

    const texto = renderTemplate(campanha.messageTemplate, {
      nome: alvo.name,
      empresa: alvo.contact_id ? (empresas.get(alvo.contact_id) ?? null) : null,
    });

    const enviado = await enviarUm(campanha, alvo, texto);

    resultado.processed += 1;
    if (enviado) resultado.sent += 1;
    else resultado.failed += 1;

    // O ritmo é o anti-bloqueio: intervalo com jitter, nunca cadência exata.
    // Ver lib/dispatch/policy.ts.
    await esperar(nextSendDelay(politica));
  }

  resultado.remaining = await prisma.dispatchTarget.count({
    where: { campaignId: campanha.id, status: 'PENDING' },
  });

  await concluirSeAcabou(campanha.id);

  return resultado;
}

/**
 * Reivindica o próximo lote.
 *
 * `FOR UPDATE SKIP LOCKED` é o que torna seguro chamar o worker duas vezes ao
 * mesmo tempo — e ele *será* chamado duas vezes, porque o cron e a tela aberta
 * não se conhecem. A segunda chamada pula as linhas travadas pela primeira em
 * vez de esperar por elas, e ninguém recebe a mensagem em dobro.
 *
 * O `UPDATE` e o `SELECT ... FOR UPDATE` estão na mesma instrução de propósito:
 * assim o Postgres garante a atomicidade sem uma transação explícita.
 */
async function reivindicar(campaignId: string, quantos: number): Promise<Reivindicado[]> {
  return prisma.$queryRaw<Reivindicado[]>`
    UPDATE dispatch_targets AS t
       SET status     = 'SENDING',
           claimed_at = now(),
           attempts   = t.attempts + 1
     WHERE t.id IN (
       SELECT id
         FROM dispatch_targets
        WHERE campaign_id = ${campaignId}::uuid
          AND status = 'PENDING'
        ORDER BY created_at
        LIMIT ${quantos}
        FOR UPDATE SKIP LOCKED
     )
    RETURNING t.id, t.contact_id, t.phone, t.name
  `;
}

async function carregarEmpresas(alvos: Reivindicado[]): Promise<Map<string, string | null>> {
  const ids = alvos.map((a) => a.contact_id).filter((id): id is string => Boolean(id));
  if (ids.length === 0) return new Map();

  const contatos = await prisma.contact.findMany({
    where: { id: { in: ids } },
    select: { id: true, company: true },
  });

  return new Map(contatos.map((c) => [c.id, c.company]));
}

/**
 * Envia um destinatário e deixa rastro nos dois lugares.
 *
 * A mensagem vira `Message` numa `Conversation` real, e não um registro à
 * parte: é o que faz o disparo aparecer no Inbox e a resposta do cliente
 * chegar com contexto. Um atendente que abre a conversa vê o que a empresa
 * mandou, não uma resposta solta a uma pergunta invisível.
 */
async function enviarUm(
  campanha: { id: string; organizationId: string },
  alvo: Reivindicado,
  texto: string
): Promise<boolean> {
  let conversationId: string | null = null;
  let messageId: string | null = null;

  try {
    if (alvo.contact_id) {
      conversationId = await conversaDoDisparo(
        campanha.organizationId,
        alvo.contact_id,
        alvo.phone
      );

      const gravada = await prisma.message.create({
        data: {
          organizationId: campanha.organizationId,
          conversationId,
          direction: 'OUTBOUND',
          contentType: 'TEXT',
          content: texto,
          status: 'PENDING',
        },
        select: { id: true },
      });

      messageId = gravada.id;
    }

    const envio = await sendText(alvo.phone, texto);
    const agora = new Date();

    if (messageId) {
      await prisma.message.update({
        where: { id: messageId },
        data: envio.ok
          ? { status: 'SENT', externalId: envio.externalId }
          : { status: 'FAILED' },
      });
    }

    if (conversationId && envio.ok) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: agora, updatedAt: agora },
      });
    }

    await prisma.dispatchTarget.update({
      where: { id: alvo.id },
      data: envio.ok
        ? { status: 'SENT', sentAt: agora, claimedAt: null, messageId, error: null }
        : { status: 'FAILED', claimedAt: null, messageId, error: envio.error },
    });

    await prisma.dispatchCampaign.update({
      where: { id: campanha.id },
      data: {
        updatedAt: agora,
        ...(envio.ok ? { sentCount: { increment: 1 } } : { failedCount: { increment: 1 } }),
      },
    });

    return envio.ok;
  } catch (error) {
    // Falha de banco, não de envio. O destinatário não pode ficar `SENDING`:
    // travaria a campanha por cinco minutos até o claim vencer.
    const motivo = error instanceof Error ? error.message : String(error);
    console.error(`[dispatch] falha ao processar ${alvo.id}:`, error);

    await prisma.dispatchTarget
      .update({
        where: { id: alvo.id },
        data: { status: 'FAILED', claimedAt: null, error: motivo.slice(0, 500) },
      })
      .catch(() => undefined);

    await prisma.dispatchCampaign
      .update({ where: { id: campanha.id }, data: { failedCount: { increment: 1 } } })
      .catch(() => undefined);

    return false;
  }
}

/**
 * A conversa onde o disparo vai aparecer.
 *
 * Reaproveita o `externalId` de uma conversa que já exista com o contato em vez
 * de inventar um. O JID sintetizado a partir do telefone quase sempre bate com
 * o que a Evolution manda, mas "quase sempre" aqui significaria duas conversas
 * com a mesma pessoa na tela do atendente.
 */
async function conversaDoDisparo(
  organizationId: string,
  contactId: string,
  phone: string
): Promise<string> {
  const existente = await prisma.conversation.findFirst({
    where: { organizationId, contactId, channel: 'WHATSAPP' },
    orderBy: { updatedAt: 'desc' },
    select: { externalId: true },
  });

  const jid = existente?.externalId ?? `${phone}@s.whatsapp.net`;

  const conversa = await findOrCreateConversation(organizationId, contactId, 'WHATSAPP', jid);
  return conversa.id;
}

/** Sem nada pendente nem em envio, a campanha acabou. */
async function concluirSeAcabou(campaignId: string): Promise<void> {
  const abertos = await prisma.dispatchTarget.count({
    where: { campaignId, status: { in: ['PENDING', 'SENDING'] } },
  });

  if (abertos > 0) return;

  await prisma.dispatchCampaign.updateMany({
    where: { id: campaignId, status: 'RUNNING' },
    data: { status: 'DONE', finishedAt: new Date(), updatedAt: new Date() },
  });
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
