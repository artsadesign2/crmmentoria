import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth/jwt';
import { dealVisibilityFilter, canSeeAllDeals } from './visibility';
import { stageBelongsToOrg } from './pipelines';
import { formatPhoneBr } from './phone';
import type { ChannelType, DealCardDTO, PriorityLevel, TagDTO } from './types';

/** Erro de domínio: etapa informada não pertence à organização da sessão. */
export class InvalidStageError extends Error {
  constructor() {
    super('A etapa informada não pertence a um funil desta organização.');
    this.name = 'InvalidStageError';
  }
}

const withRelations = {
  contact: { include: { tags: { include: { tag: true } } } },
  assignedUser: { select: { id: true, name: true } },
} as const;

type DealRow = {
  id: string;
  contactId: string;
  stageId: string;
  assignedUserId: string | null;
  departmentId: string | null;
  channel: string;
  title: string;
  dealValue: unknown;
  priority: string;
  position: number;
  lastMessageText: string | null;
  lastMessageAt: Date | null;
  reminderAt: Date | null;
  slaDueAt: Date | null;
  totalTasks: number;
  completedTasks: number;
  isPrivate: boolean;
  lostReason: string | null;
  customFields: unknown;
  createdAt: Date;
  updatedAt: Date;
  assignedUser: { id: string; name: string } | null;
  contact: {
    id: string;
    name: string;
    phone: string | null;
    avatarUrl: string | null;
    company: string | null;
    tags: Array<{ tag: { id: string; name: string; colorHex: string } }>;
  };
};

function toDTO(deal: DealRow): DealCardDTO {
  return {
    id: deal.id,
    contactId: deal.contactId,
    stageId: deal.stageId,
    assignedUserId: deal.assignedUserId,
    assignedUserName: deal.assignedUser?.name ?? null,
    departmentId: deal.departmentId,
    channel: deal.channel as ChannelType,
    title: deal.title,
    // Decimal do Prisma não sobrevive ao JSON; a conversão acontece só aqui.
    dealValue: Number(deal.dealValue),
    priority: deal.priority as PriorityLevel,
    position: deal.position,
    lastMessageText: deal.lastMessageText,
    lastMessageAt: deal.lastMessageAt?.toISOString() ?? null,
    reminderAt: deal.reminderAt?.toISOString() ?? null,
    slaDueAt: deal.slaDueAt?.toISOString() ?? null,
    totalTasks: deal.totalTasks,
    completedTasks: deal.completedTasks,
    isPrivate: deal.isPrivate,
    lostReason: deal.lostReason,
    customFields: (deal.customFields as Record<string, unknown> | null) ?? null,
    contact: {
      id: deal.contact.id,
      name: deal.contact.name,
      phone: deal.contact.phone,
      phoneFormatted: deal.contact.phone ? formatPhoneBr(deal.contact.phone) : null,
      avatarUrl: deal.contact.avatarUrl,
      company: deal.contact.company,
      tags: deal.contact.tags.map<TagDTO>(({ tag }) => ({
        id: tag.id,
        name: tag.name,
        colorHex: tag.colorHex,
      })),
    },
    createdAt: deal.createdAt.toISOString(),
    updatedAt: deal.updatedAt.toISOString(),
  };
}

export interface ListDealsOptions {
  stageId?: string;
  assignedUserId?: string;
  search?: string;
}

export async function listDeals(
  session: SessionPayload,
  options: ListDealsOptions = {}
): Promise<DealCardDTO[]> {
  const search = options.search?.trim();

  const deals = await prisma.dealCard.findMany({
    where: {
      // dealVisibilityFilter já traz organizationId e a regra por atendente.
      ...dealVisibilityFilter(session),
      ...(options.stageId ? { stageId: options.stageId } : {}),
      ...(options.assignedUserId ? { assignedUserId: options.assignedUserId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { contact: { name: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    },
    include: withRelations,
    orderBy: [{ stageId: 'asc' }, { position: 'asc' }],
  });

  return deals.map(toDTO);
}

export async function getDeal(
  session: SessionPayload,
  id: string
): Promise<DealCardDTO | null> {
  const deal = await prisma.dealCard.findFirst({
    where: { id, ...dealVisibilityFilter(session) },
    include: withRelations,
  });
  return deal ? toDTO(deal) : null;
}

export interface CreateDealInput {
  contactId: string;
  stageId: string;
  title: string;
  dealValue?: number;
  channel?: ChannelType;
  priority?: PriorityLevel;
  assignedUserId?: string | null;
  departmentId?: string | null;
  isPrivate?: boolean;
  customFields?: Record<string, unknown> | null;
}

export async function createDeal(
  session: SessionPayload,
  input: CreateDealInput
): Promise<DealCardDTO | null> {
  if (!(await stageBelongsToOrg(session.organizationId, input.stageId))) {
    throw new InvalidStageError();
  }

  // O contato precisa ser da mesma organização; senão o card cruzaria tenants.
  const contact = await prisma.contact.findFirst({
    where: { id: input.contactId, organizationId: session.organizationId },
    select: { id: true },
  });
  if (!contact) return null;

  // Novo card entra no fim da coluna.
  const last = await prisma.dealCard.findFirst({
    where: { stageId: input.stageId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  const deal = await prisma.dealCard.create({
    data: {
      organizationId: session.organizationId,
      contactId: input.contactId,
      stageId: input.stageId,
      title: input.title.trim(),
      dealValue: input.dealValue ?? 0,
      channel: input.channel ?? 'WHATSAPP',
      priority: input.priority ?? 'MEDIUM',
      assignedUserId: input.assignedUserId ?? null,
      departmentId: input.departmentId ?? null,
      isPrivate: input.isPrivate ?? false,
      position: (last?.position ?? -1) + 1,
      customFields: (input.customFields ?? undefined) as never,
    },
    include: withRelations,
  });

  return toDTO(deal);
}

export interface UpdateDealInput {
  stageId?: string;
  title?: string;
  dealValue?: number;
  priority?: PriorityLevel;
  channel?: ChannelType;
  assignedUserId?: string | null;
  departmentId?: string | null;
  position?: number;
  isPrivate?: boolean;
  reminderAt?: string | null;
  slaDueAt?: string | null;
  totalTasks?: number;
  completedTasks?: number;
  lostReason?: string | null;
  customFields?: Record<string, unknown> | null;
}

export async function updateDeal(
  session: SessionPayload,
  id: string,
  input: UpdateDealInput
): Promise<DealCardDTO | null> {
  // A visibilidade entra já na leitura: um Editor não edita o que não vê.
  const current = await prisma.dealCard.findFirst({
    where: { id, ...dealVisibilityFilter(session) },
    select: { id: true },
  });
  if (!current) return null;

  if (input.stageId && !(await stageBelongsToOrg(session.organizationId, input.stageId))) {
    throw new InvalidStageError();
  }

  const data: Record<string, unknown> = { updatedAt: new Date() };

  if (input.stageId !== undefined) data.stageId = input.stageId;
  if (input.title !== undefined) data.title = input.title.trim();
  if (input.dealValue !== undefined) data.dealValue = input.dealValue;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.channel !== undefined) data.channel = input.channel;
  if (input.departmentId !== undefined) data.departmentId = input.departmentId;
  if (input.position !== undefined) data.position = input.position;
  if (input.totalTasks !== undefined) data.totalTasks = input.totalTasks;
  if (input.completedTasks !== undefined) data.completedTasks = input.completedTasks;
  if (input.lostReason !== undefined) data.lostReason = input.lostReason;
  if (input.customFields !== undefined) data.customFields = input.customFields;
  if (input.reminderAt !== undefined) {
    data.reminderAt = input.reminderAt ? new Date(input.reminderAt) : null;
  }
  if (input.slaDueAt !== undefined) {
    data.slaDueAt = input.slaDueAt ? new Date(input.slaDueAt) : null;
  }

  // Reatribuir e tornar privado mexem em quem enxerga o card. Um atendente que
  // fizesse isso poderia esconder a própria oportunidade da gestão.
  if (input.assignedUserId !== undefined) {
    if (!canSeeAllDeals(session) && input.assignedUserId !== session.userId) {
      return null;
    }
    data.assignedUserId = input.assignedUserId;
  }
  if (input.isPrivate !== undefined) {
    if (!canSeeAllDeals(session)) return null;
    data.isPrivate = input.isPrivate;
  }

  const deal = await prisma.dealCard.update({
    where: { id },
    data,
    include: withRelations,
  });

  // Se a etapa mudou, dispara as automações assíncronas do CRM (WhatsApp + Hostinger/n8n)
  if (input.stageId !== undefined) {
    (async () => {
      try {
        const stage = await prisma.stage.findUnique({
          where: { id: input.stageId },
          select: { name: true },
        });
        if (stage) {
          const { handleDealStageAutomation } = await import('./crm-automations');
          await handleDealStageAutomation({
            organizationId: session.organizationId,
            dealId: deal.id,
            dealTitle: deal.title,
            dealValue: Number(deal.dealValue),
            contactName: deal.contact.name,
            contactPhone: deal.contact.phone,
            stageName: stage.name,
          });
        }
      } catch (err) {
        console.warn('[CRM Stage Automation Warning]:', err);
      }
    })();
  }

  return toDTO(deal);
}

export async function deleteDeal(session: SessionPayload, id: string): Promise<boolean> {
  const current = await prisma.dealCard.findFirst({
    where: { id, ...dealVisibilityFilter(session) },
    select: { id: true },
  });
  if (!current) return false;

  await prisma.dealCard.delete({ where: { id } });
  return true;
}
