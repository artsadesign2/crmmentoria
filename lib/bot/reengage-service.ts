import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { leadParadoEmail } from '@/lib/email/templates';
import { formatPhoneBr } from '@/lib/crm/phone';
import { decidirRetomada, type EstadoConversa, type Retomada } from './reengage';
import { getBotSettings, notificaPorEmail } from './settings';

/**
 * A parte suja da retomada: descobrir no banco o que a regra pura precisa
 * saber, e realizar o que ela decidiu.
 *
 * `reengage.ts` decide e não toca em nada; este arquivo toca em tudo e não
 * decide nada. É a mesma divisão do motor e do executor, pelo mesmo motivo.
 */

/**
 * Monta o estado da conversa para a regra.
 *
 * O `esperandoDesde` é a parte que precisa estar certa: é a mensagem mais
 * antiga do cliente que **nenhuma pessoa** respondeu. Mensagem de robô não
 * conta como resposta — e é justamente por isso que o executor grava as dele
 * com `userId: null`. A disciplina de não assinar texto de robô com nome de
 * gente, tomada por honestidade no histórico, é o que faz esta consulta
 * funcionar.
 */
export async function estadoDaConversa(
  conversationId: string,
  assignedUserId: string | null
): Promise<EstadoConversa> {
  const ultimaHumana = await prisma.message.findFirst({
    where: { conversationId, direction: 'OUTBOUND', userId: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  const esperando = await prisma.message.findFirst({
    where: {
      conversationId,
      direction: 'INBOUND',
      ...(ultimaHumana ? { createdAt: { gt: ultimaHumana.createdAt } } : {}),
    },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  });

  const ultimaSessao = await prisma.botSession.findFirst({
    where: { conversationId },
    orderBy: { startedAt: 'desc' },
    select: { startedAt: true },
  });

  return {
    assignedUserId,
    esperandoDesde: esperando?.createdAt ?? null,
    ultimaRetomada: ultimaSessao?.startedAt ?? null,
  };
}

export interface RetomadaAvaliada extends Retomada {
  /** Horas de espera, para o e-mail e para a trilha. */
  horasParado: number;
}

/** Junta configuração, estado e regra. `null` quando está tudo bem. */
export async function avaliarRetomada(
  organizationId: string,
  conversationId: string,
  assignedUserId: string | null,
  agora: Date = new Date()
): Promise<RetomadaAvaliada | null> {
  const config = await getBotSettings(organizationId);
  const estado = await estadoDaConversa(conversationId, assignedUserId);
  const decisao = decidirRetomada(estado, agora, config);

  if (!decisao) return null;

  const espera = estado.esperandoDesde
    ? (agora.getTime() - estado.esperandoDesde.getTime()) / 3_600_000
    : 0;

  return { ...decisao, horasParado: espera };
}

/**
 * Executa o que a regra decidiu, antes de o robô abrir a sessão.
 *
 * A ordem importa: devolver para a fila primeiro. É a parte que garante
 * atendimento e a única que não depende de existir bot nenhum — se tudo daqui
 * para baixo falhar, a conversa já está visível para a equipe inteira.
 */
export async function aplicarRetomada(
  organizationId: string,
  conversationId: string,
  retomada: RetomadaAvaliada
): Promise<void> {
  const conversa = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
    select: {
      id: true,
      assignedUserId: true,
      contactId: true,
      contact: { select: { name: true, phone: true } },
    },
  });

  if (!conversa) return;

  const donoAnterior = conversa.assignedUserId;

  if (retomada.devolveParaFila) {
    // O setor permanece: a conversa volta para a fila de quem já era dela, não
    // para o meio da organização.
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { assignedUserId: null, updatedAt: new Date() },
    });
  }

  await registrarNaTrilha(organizationId, conversa.contactId, retomada);

  if (retomada.notifica && donoAnterior) {
    await avisarAtendente(organizationId, donoAnterior, conversa.contact, retomada);
  }
}

const TITULO: Record<Retomada['motivo'], string> = {
  ABANDONO: 'Robô retomou o atendimento: lead sem resposta',
  FORA_DE_HORARIO: 'Robô cobriu o atendimento fora do expediente',
};

async function registrarNaTrilha(
  organizationId: string,
  contactId: string,
  retomada: RetomadaAvaliada
): Promise<void> {
  try {
    const horas = Math.round(retomada.horasParado);
    const detalhe = retomada.motivo === 'ABANDONO' ? ` (${horas}h de espera)` : '';

    await prisma.activityLog.create({
      data: {
        organizationId,
        contactId,
        userId: null,
        channel: 'SYSTEM',
        title: `${TITULO[retomada.motivo]}${detalhe}`.slice(0, 250),
      },
    });
  } catch (error) {
    // Perder uma linha de histórico não pode impedir o atendimento.
    console.error('[retomada] falha ao registrar na trilha:', error);
  }
}

async function avisarAtendente(
  organizationId: string,
  userId: string,
  contato: { name: string; phone: string | null },
  retomada: RetomadaAvaliada
): Promise<void> {
  if (!(await notificaPorEmail(organizationId))) return;

  const atendente = await prisma.user.findFirst({
    where: { id: userId, organizationId },
    select: { name: true, email: true, status: true },
  });

  // Cadastro inativo é metade do motivo de a conversa ter parado. Mandar
  // e-mail para quem saiu da empresa não recupera lead nenhum.
  if (!atendente || atendente.status !== 'ATIVO') return;

  const base = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';

  const conteudo = leadParadoEmail({
    atendente: atendente.name,
    contato: contato.name,
    telefone: contato.phone ? formatPhoneBr(contato.phone) : null,
    horasParado: retomada.horasParado,
    url: `${base.replace(/\/$/, '')}/inbox`,
  });

  await sendEmail({ to: atendente.email, ...conteudo });
}
