/**
 * Ritmo do disparo — o anti-bloqueio inteiro.
 *
 * Puro e sem I/O de propósito: esta é a parte que erra em silêncio. Um jitter
 * que na prática não varia, ou uma janela calculada no fuso errado, não produz
 * exceção nenhuma — só aumenta a chance de o número ser bloqueado, e ninguém
 * liga uma coisa à outra semanas depois.
 *
 * Nenhum destes parâmetros impede o WhatsApp de bloquear um número. Eles
 * reduzem o risco.
 */

export interface DispatchPolicy {
  minIntervalMs: number;
  jitterMs: number;
  maxPerMinute: number;
  windowStartHour: number;
  windowEndHour: number;
  dailyCap: number;
  timeZone: string;
}

export const POLITICA_PADRAO: DispatchPolicy = {
  /** 1,5 s — o valor do laço antigo — é rápido demais para conversa humana. */
  minIntervalMs: 4000,
  /**
   * O item que o código antigo não tinha e o que mais importa aqui. Um envio a
   * cada 1500 ms exatos é mais suspeito que um a cada 4 s variando: o padrão
   * perfeito é justamente o que nenhum humano produz.
   */
  jitterMs: 3000,
  maxPerMinute: 12,
  windowStartHour: 8,
  windowEndHour: 20,
  dailyCap: 300,
  timeZone: 'America/Sao_Paulo',
};

/**
 * Quanto esperar antes do próximo envio.
 *
 * `rng` é injetável porque é a única forma de testar jitter: com
 * `Math.random` embutido, o teste só poderia afirmar que o valor cai numa
 * faixa — nunca que a variação existe de fato.
 */
export function nextSendDelay(
  p: DispatchPolicy,
  rng: () => number = Math.random
): number {
  const jitter = Math.max(0, p.jitterMs);
  return Math.round(p.minIntervalMs + rng() * jitter);
}

/**
 * A hora local da organização, não a do servidor.
 *
 * Função serverless roda em UTC. Sem esta conversão, "não enviar depois das
 * 20h" viraria "não enviar depois das 17h" em São Paulo — e, pior, a janela da
 * madrugada ficaria aberta.
 */
function horaLocal(timeZone: string, instante: Date): number {
  const formatador = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hour12: false,
  });

  return Number(formatador.format(instante));
}

/** Verdadeiro quando o instante está dentro da janela de envio. */
export function withinWindow(p: DispatchPolicy, now: Date): boolean {
  const hora = horaLocal(p.timeZone, now);

  // Janela normal: início antes do fim, no mesmo dia.
  if (p.windowStartHour <= p.windowEndHour) {
    return hora >= p.windowStartHour && hora < p.windowEndHour;
  }

  // Janela que cruza a meia-noite (22h às 6h): vale de qualquer um dos lados.
  return hora >= p.windowStartHour || hora < p.windowEndHour;
}

/**
 * Quantos envios ainda cabem agora.
 *
 * Vale o menor dos dois tetos, e nunca menos que zero — uma cota negativa
 * viraria um `LIMIT -3` na consulta do worker.
 */
export function remainingQuota(
  p: DispatchPolicy,
  sentLastMinute: number,
  sentToday: number
): number {
  const noMinuto = p.maxPerMinute - sentLastMinute;
  const noDia = p.dailyCap - sentToday;

  return Math.max(0, Math.min(noMinuto, noDia));
}
