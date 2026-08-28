import { prisma } from '@/lib/prisma';
import { decidirRetomada, type EstadoConversa, type Retomada } from './reengage';
import { avisarAtendente, type RotaAviso } from './notify';
import { getBotSettings } from './settings';

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

  // Avisar antes de registrar, para a trilha poder dizer por onde o aviso foi.
  // "O robô retomou" sem essa informação deixa a pergunta que sempre vem
  // depois — "e o atendente ficou sabendo?" — sem resposta no histórico.
  const rota =
    retomada.notifica && donoAnterior
      ? await avisarAtendente({
          organizationId,
          userId: donoAnterior,
          contato: conversa.contact,
          horasParado: retomada.horasParado,
        })
      : 'NENHUMA';

  await registrarNaTrilha(organizationId, conversa.contactId, retomada, rota);
}

const TITULO: Record<Retomada['motivo'], string> = {
  ABANDONO: 'Robô retomou o atendimento: lead sem resposta',
  FORA_DE_HORARIO: 'Robô cobriu o atendimento fora do expediente',
};

const AVISO: Record<RotaAviso, string> = {
  WHATSAPP: 'atendente avisado pelo WhatsApp',
  EMAIL: 'atendente avisado por e-mail',
  NENHUMA: 'não foi possível avisar o atendente',
};

async function registrarNaTrilha(
  organizationId: string,
  contactId: string,
  retomada: RetomadaAvaliada,
  rota: RotaAviso
): Promise<void> {
  try {
    const partes: string[] = [];

    if (retomada.motivo === 'ABANDONO') {
      partes.push(`${Math.round(retomada.horasParado)}h de espera`);
      partes.push(AVISO[rota]);
    }

    const detalhe = partes.length > 0 ? ` (${partes.join('; ')})` : '';

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
