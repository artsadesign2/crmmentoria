/**
 * Estado de SLA e tempo relativo, para o indicador do card.
 *
 * Funções puras com o "agora" injetado: é o que as torna testáveis sem congelar
 * o relógio do processo inteiro.
 */

export type SlaState = 'none' | 'ok' | 'warning' | 'overdue';

/** Faltando menos que isto para o prazo, o card passa a avisar. */
const WARNING_THRESHOLD_MS = 2 * 3_600_000; // 2 horas

/**
 * Estado do prazo de atendimento.
 *
 * `none` quando não há prazo definido — nesse caso o indicador não aparece.
 * Um trilho cinza em todo card seria ruído: a maior parte das oportunidades
 * não tem SLA, e desenhar um marcador vazio para elas não informa nada.
 */
export function slaState(slaDueAt: string | null | undefined, now: Date = new Date()): SlaState {
  if (!slaDueAt) return 'none';

  const restante = new Date(slaDueAt).getTime() - now.getTime();
  if (Number.isNaN(restante)) return 'none';

  if (restante <= 0) return 'overdue';
  if (restante <= WARNING_THRESHOLD_MS) return 'warning';
  return 'ok';
}

/**
 * Fração de 0 a 1 do prazo já consumida, para preencher o filete.
 *
 * Sem uma referência de início, usa uma janela padrão de 24 horas antes do
 * prazo — é a leitura mais útil: "quanto falta do dia de atendimento".
 */
export function slaProgress(
  slaDueAt: string | null | undefined,
  startedAt: string | null | undefined,
  now: Date = new Date()
): number | null {
  if (!slaDueAt) return null;

  const fim = new Date(slaDueAt).getTime();
  if (Number.isNaN(fim)) return null;

  const inicio = startedAt ? new Date(startedAt).getTime() : fim - 86_400_000;
  if (Number.isNaN(inicio) || fim <= inicio) return null;

  const fracao = (now.getTime() - inicio) / (fim - inicio);
  return Math.min(1, Math.max(0, fracao));
}

/** Tempo decorrido em forma curta, para caber ao lado do nome no card. */
export function relativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '';

  const ms = now.getTime() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';

  const minutos = Math.floor(ms / 60_000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `${minutos}min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas}h`;

  const dias = Math.floor(horas / 24);
  return `${dias}d`;
}

/** Hora no formato do card (`18:46`). */
export function clockTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';

  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Duração de espera por extenso, para uma frase.
 *
 * Diferente de `relativeTime`, que é o "26h" curto do card: aqui o texto entra
 * numa frase que uma pessoa lê no WhatsApp ou no e-mail, então precisa
 * concordar em número — "1 hora", nunca "1 horas".
 */
export function esperaLegivel(horas: number): string {
  const inteiras = Math.max(1, Math.round(horas));

  if (inteiras === 1) return '1 hora';
  if (inteiras < 48) return `${inteiras} horas`;

  const dias = Math.floor(inteiras / 24);
  return dias === 1 ? '1 dia' : `${dias} dias`;
}
