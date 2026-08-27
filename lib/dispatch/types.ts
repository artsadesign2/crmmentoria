/**
 * Formatos que atravessam a fronteira servidor → navegador.
 *
 * Datas viajam como ISO string, não como `Date`: o que passa pelo JSON não é
 * `Date` do outro lado, e tipar assim é mentir para o componente.
 */

export type CampaignStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'RUNNING'
  | 'PAUSED'
  | 'DONE'
  | 'CANCELED';

export type TargetStatus = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

/** Estados a partir dos quais a fila ainda pode andar. */
export const STATUS_ATIVOS: CampaignStatus[] = ['SCHEDULED', 'RUNNING'];

/** Estados finais: não voltam mais. */
export const STATUS_FINAIS: CampaignStatus[] = ['DONE', 'CANCELED'];

export interface CampaignDTO {
  id: string;
  name: string;
  messageTemplate: string;
  status: CampaignStatus;
  scheduledAt: string | null;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  /** Quantos ainda faltam sair. Poupa a tela de recalcular e errar a conta. */
  pendingCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  createdByName: string | null;
}

export interface TargetDTO {
  id: string;
  contactId: string | null;
  name: string;
  phone: string;
  phoneFormatted: string;
  status: TargetStatus;
  /** Por que este não recebeu. É o que a tela mostra em vez de sumir com ele. */
  skipReason: string | null;
  error: string | null;
  attempts: number;
  sentAt: string | null;
}

export interface CampaignDetailDTO extends CampaignDTO {
  targets: TargetDTO[];
}

/** Erro de domínio da campanha — vira 400, não 500. */
export class CampaignError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CampaignError';
  }
}
