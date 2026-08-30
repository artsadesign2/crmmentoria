import { prisma } from '@/lib/prisma';
import { POLITICA_PADRAO, withinWindow } from '@/lib/dispatch/policy';
import { executarBot } from './executor';
import { aplicarRetomada, avaliarRetomada } from './reengage-service';

/**
 * A varredura.
 *
 * O gatilho normal da retomada é o cliente escrever de novo. Mas o lead que
 * escreveu uma vez, foi ignorado e desistiu de insistir é justamente o que mais
 * importa recuperar — e esse nunca produz um webhook. Ninguém o encontra a não
 * ser procurando.
 */

/** Teto por passagem: uma varredura é um pente fino, não um mutirão. */
const LIMITE_VARREDURA = 50;

/**
 * Piso para a consulta. Nenhuma organização retoma em menos de uma hora
 * (`LIMITES.reengageAfterHours`), então conversa com movimento recente não
 * precisa nem ser lida.
 */
const PISO_MS = 3_600_000;

export interface ResultadoVarredura {
  examinadas: number;
  /** Devolvidas para a fila e notificadas. */
  retomadas: number;
  /** Quantas delas o robô também abordou pelo WhatsApp. */
  abordadas: number;
}

export async function varrerParadas(
  limite = LIMITE_VARREDURA,
  agora: Date = new Date()
): Promise<ResultadoVarredura> {
  const candidatas = await prisma.conversation.findMany({
    where: {
      status: 'OPEN',
      assignedUserId: { not: null },
      lastMessageAt: { lt: new Date(agora.getTime() - PISO_MS) },
    },
    orderBy: { lastMessageAt: 'asc' },
    take: limite,
    select: {
      id: true,
      organizationId: true,
      assignedUserId: true,
      contact: { select: { optedOutAt: true } },
    },
  });

  const resultado: ResultadoVarredura = {
    examinadas: candidatas.length,
    retomadas: 0,
    abordadas: 0,
  };

  for (const conversa of candidatas) {
    const retomada = await avaliarRetomada(
      conversa.organizationId,
      conversa.id,
      conversa.assignedUserId,
      agora
    );

    // Só abandono. "Fora de horário" numa varredura significaria acordar às
    // duas da manhã alguém que não perguntou nada — o oposto do que a regra
    // existe para fazer.
    if (retomada?.motivo !== 'ABANDONO') continue;

    await aplicarRetomada(conversa.organizationId, conversa.id, retomada);
    resultado.retomadas += 1;

    if (await podeAbordar(conversa.organizationId, conversa.contact.optedOutAt, agora)) {
      const bot = await executarBot(conversa.organizationId, conversa.id, '', 'REENGAGE');
      if (bot.enviadas > 0) resultado.abordadas += 1;
    }
  }

  return resultado;
}

/**
 * Se o robô pode puxar conversa, e não só devolver o lead para a fila.
 *
 * Devolver e avisar por e-mail é interno e sempre seguro. Mandar mensagem para
 * o cliente é falar com uma pessoa que não perguntou nada agora — e isso tem
 * hora e tem permissão.
 */
async function podeAbordar(
  organizationId: string,
  optedOutAt: Date | null,
  agora: Date
): Promise<boolean> {
  // Quem escreveu "PARE" pediu para a empresa parar de puxar assunto. A
  // conversa continua aberta e ele continua sendo atendido quando escrever —
  // mas a iniciativa deixou de ser nossa.
  if (optedOutAt) return false;

  const salva = await prisma.dispatchSettings.findUnique({
    where: { organizationId },
    select: {
      minIntervalMs: true,
      jitterMs: true,
      maxPerMinute: true,
      windowStartHour: true,
      windowEndHour: true,
      dailyCap: true,
      timeZone: true,
    },
  });

  return withinWindow(salva ?? POLITICA_PADRAO, agora);
}
