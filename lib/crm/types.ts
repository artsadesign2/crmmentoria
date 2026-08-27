/**
 * DTOs que as rotas do CRM devolvem.
 *
 * São declarados aqui, e não inferidos do Prisma, porque a interface não deve
 * receber tudo o que a tabela guarda — e porque `Decimal` do Prisma não
 * sobrevive à serialização JSON. Valores monetários saem como `number`,
 * convertidos num único ponto.
 */

export type ChannelType = 'WHATSAPP' | 'INSTAGRAM' | 'VOIP' | 'WEBCHAT' | 'WEBHOOK';
export type ContactType = 'LEAD' | 'CUSTOMER' | 'PARTNER';
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export const CHANNELS: ChannelType[] = ['WHATSAPP', 'INSTAGRAM', 'VOIP', 'WEBCHAT', 'WEBHOOK'];
export const CONTACT_TYPES: ContactType[] = ['LEAD', 'CUSTOMER', 'PARTNER'];
export const PRIORITIES: PriorityLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export interface TagDTO {
  id: string;
  name: string;
  colorHex: string;
}

export interface ContactDTO {
  id: string;
  name: string;
  /** E.164 sem "+". Use formatPhoneBr para exibir. */
  phone: string | null;
  phoneFormatted: string | null;
  email: string | null;
  documentCpf: string | null;
  avatarUrl: string | null;
  company: string | null;
  type: ContactType;
  source: string | null;
  notes: string | null;
  customFields: Record<string, unknown> | null;
  tags: TagDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface DealCardDTO {
  id: string;
  contactId: string;
  stageId: string;
  assignedUserId: string | null;
  assignedUserName: string | null;
  departmentId: string | null;
  channel: ChannelType;
  title: string;
  /** Convertido de Decimal; `Decimal` não sobrevive ao JSON. */
  dealValue: number;
  priority: PriorityLevel;
  position: number;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  reminderAt: string | null;
  slaDueAt: string | null;
  totalTasks: number;
  completedTasks: number;
  isPrivate: boolean;
  lostReason: string | null;
  customFields: Record<string, unknown> | null;
  contact: Pick<ContactDTO, 'id' | 'name' | 'phone' | 'phoneFormatted' | 'avatarUrl' | 'company'> & {
    tags: TagDTO[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface StageDTO {
  id: string;
  name: string;
  colorHex: string;
  position: number;
  isWon: boolean;
  isLost: boolean;
  /** Agregados no banco, não somados no cliente. */
  cardCount: number;
  totalValue: number;
}

export interface PipelineDTO {
  id: string;
  name: string;
  isDefault: boolean;
  position: number;
  stages: StageDTO[];
}
