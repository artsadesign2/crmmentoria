import type { ChannelType } from './types';
import type { MessageContentType } from './inbound';

/**
 * DTOs do Inbox.
 *
 * Declarados aqui, e não inferidos do Prisma, pelo mesmo motivo dos DTOs da F1:
 * a interface não deve receber tudo o que a tabela guarda, e `Date` não
 * sobrevive à serialização JSON. Datas saem como ISO, convertidas num ponto só.
 */

/**
 * `INTERNAL` é a nota que a equipe lê e o cliente nunca recebe. A coluna
 * `direction` é VARCHAR(10) e comporta a palavra sem migração.
 */
export type MessageDirection = 'INBOUND' | 'OUTBOUND' | 'INTERNAL';

/**
 * `OPEN` sem responsável é o que a interface chama de "fila". Um estado a menos
 * para manter coerente do que um quarto valor aqui.
 */
export type ConversationStatus = 'OPEN' | 'PENDING' | 'CLOSED';

export type MessageStatus = 'PENDING' | 'SCHEDULED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

/** Estado da transcrição de um áudio. Ver a coluna transcription_status. */
export type TranscriptionStatus = 'DONE' | 'FAILED' | 'UNSUPPORTED';

export const CONVERSATION_STATUSES: ConversationStatus[] = ['OPEN', 'PENDING', 'CLOSED'];

export interface MessageDTO {
  id: string;
  direction: MessageDirection;
  contentType: MessageContentType;
  content: string | null;
  mediaUrl: string | null;
  /** Preenchida na F4. Distinta de `content`: o dito e o entendido são coisas diferentes. */
  transcription: string | null;
  /**
   * NULL (ainda não tentado) | DONE | FAILED | UNSUPPORTED.
   * A interface precisa distinguir "vai chegar" de "falhou, tente de novo" e de
   * "não adianta tentar".
   */
  transcriptionStatus: TranscriptionStatus | null;
  status: MessageStatus;
  isFromBot: boolean;
  /** Quem escreveu, do lado da empresa. Nulo quando veio do cliente ou do robô. */
  userId: string | null;
  userName: string | null;
  createdAt: string;
}

export interface ConversationContactDTO {
  id: string;
  name: string;
  phone: string | null;
  phoneFormatted: string | null;
  avatarUrl: string | null;
  company: string | null;
}

export interface ConversationDTO {
  id: string;
  contactId: string;
  /** Oportunidade vinculada. Nula até alguém clicar em "Criar oportunidade". */
  dealCardId: string | null;
  assignedUserId: string | null;
  assignedUserName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  channel: ChannelType;
  status: ConversationStatus;
  unreadCount: number;
  lastMessageAt: string | null;
  /** Última mensagem do cliente ou do atendente. Notas internas não entram. */
  lastMessagePreview: string | null;
  contact: ConversationContactDTO;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetailDTO extends ConversationDTO {
  messages: MessageDTO[];
  /** Só para exibir no painel lateral; o valor vem em número, nunca em Decimal. */
  deal: {
    id: string;
    title: string;
    dealValue: number;
    stageName: string;
    /** Análise da F4. Nulos até alguém pedir "Analisar com IA". */
    aiScore: number | null;
    aiSummary: string | null;
    aiAnalyzedAt: string | null;
    customFields: Record<string, unknown> | null;
  } | null;
}

export type InboxScope = 'mine' | 'queue' | 'all';

export interface InboxFilters {
  scope: InboxScope;
  status?: ConversationStatus;
  search?: string;
}

/** Resposta do cursor de tempo real. */
export interface InboxUpdatesDTO {
  /** Próximo cursor. O cliente consulta a partir daqui menos a sobreposição. */
  now: string;
  conversations: ConversationDTO[];
  messages: MessageDTO[];
  queueCount: number;
  unreadTotal: number;
}
