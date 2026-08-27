import { prisma } from '@/lib/prisma';
import { hasAtLeastRole } from '@/lib/auth/roles';
import type { SessionPayload } from '@/lib/auth/jwt';
import { formatPhoneBr } from './phone';
import { routeConversation } from './routing';
import type { ChannelType } from './types';
import type {
  ConversationDTO,
  ConversationDetailDTO,
  ConversationStatus,
  InboxFilters,
  MessageDTO,
  MessageDirection,
  MessageStatus,
} from './inbox-types';
import type { MessageContentType } from './inbound';

/**
 * Conversas do Inbox: quem enxerga o quê, listagem e ciclo de vida.
 *
 * A regra de visibilidade espelha `lib/crm/visibility.ts`, com o setor no lugar
 * do sigilo, e vive na cláusula `where` — filtrar na interface não é
 * privacidade, os dados já teriam saído do servidor.
 */

/** Erro de domínio: a ação exige rank que a sessão não tem. */
export class ConversationForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConversationForbiddenError';
  }
}

export interface ConversationVisibilityFilter {
  organizationId: string;
  OR?: Array<{ assignedUserId: string | null; departmentId?: string | null }>;
}

export function canSeeAllConversations(session: SessionPayload): boolean {
  return hasAtLeastRole(session.role, 'Administrador');
}

/**
 * Cláusula `where` das consultas de conversa.
 *
 * O escopo de organização está presente em todos os casos — é o que impede um
 * tenant de enxergar outro, e nunca deve ser condicional.
 *
 * Um atendente sem setor é generalista: enxerga a fila sem setor. Um atendente
 * do Comercial não enxerga a fila do Suporte, que é para isso que setor existe.
 */
export function conversationVisibilityFilter(
  session: SessionPayload,
  userDepartmentId: string | null
): ConversationVisibilityFilter {
  if (canSeeAllConversations(session)) {
    return { organizationId: session.organizationId };
  }

  const fila: ConversationVisibilityFilter['OR'] = [{ assignedUserId: session.userId }];

  if (userDepartmentId) {
    fila.push({ assignedUserId: null, departmentId: userDepartmentId });
  }
  // A fila sem setor é de todo mundo: ninguém a reivindicou ainda.
  fila.push({ assignedUserId: null, departmentId: null });

  return { organizationId: session.organizationId, OR: fila };
}

const withRelations = {
  contact: {
    select: { id: true, name: true, phone: true, avatarUrl: true, company: true },
  },
  assignedUser: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
} as const;

type ConversationRow = {
  id: string;
  contactId: string;
  dealCardId: string | null;
  assignedUserId: string | null;
  departmentId: string | null;
  channel: string;
  status: string;
  unreadCount: number;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  contact: { id: string; name: string; phone: string | null; avatarUrl: string | null; company: string | null };
  assignedUser: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
};

export function conversationToDTO(row: ConversationRow, preview: string | null): ConversationDTO {
  return {
    id: row.id,
    contactId: row.contactId,
    dealCardId: row.dealCardId,
    assignedUserId: row.assignedUserId,
    assignedUserName: row.assignedUser?.name ?? null,
    departmentId: row.departmentId,
    departmentName: row.department?.name ?? null,
    channel: row.channel as ChannelType,
    status: row.status as ConversationStatus,
    unreadCount: row.unreadCount,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    lastMessagePreview: preview,
    contact: {
      id: row.contact.id,
      name: row.contact.name,
      phone: row.contact.phone,
      phoneFormatted: row.contact.phone ? formatPhoneBr(row.contact.phone) : null,
      avatarUrl: row.contact.avatarUrl,
      company: row.contact.company,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function messageToDTO(row: {
  id: string;
  direction: string;
  contentType: string;
  content: string | null;
  mediaUrl: string | null;
  transcription: string | null;
  transcriptionStatus?: string | null;
  status: string;
  isFromBot: boolean;
  userId: string | null;
  createdAt: Date;
  user?: { name: string } | null;
}): MessageDTO {
  return {
    id: row.id,
    direction: row.direction as MessageDirection,
    contentType: row.contentType as MessageContentType,
    content: row.content,
    mediaUrl: row.mediaUrl,
    transcription: row.transcription,
    transcriptionStatus: (row.transcriptionStatus as MessageDTO['transcriptionStatus']) ?? null,
    status: row.status as MessageStatus,
    isFromBot: row.isFromBot,
    userId: row.userId,
    userName: row.user?.name ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Setor do usuário da sessão, necessário para montar o filtro de visibilidade. */
export async function sessionDepartmentId(session: SessionPayload): Promise<string | null> {
  const usuario = await prisma.user.findFirst({
    where: { id: session.userId, organizationId: session.organizationId },
    select: { departmentId: true },
  });
  return usuario?.departmentId ?? null;
}

export async function listConversations(
  session: SessionPayload,
  filters: InboxFilters
): Promise<ConversationDTO[]> {
  const setor = await sessionDepartmentId(session);
  const visivel = conversationVisibilityFilter(session, setor);

  const escopo =
    filters.scope === 'mine'
      ? { assignedUserId: session.userId }
      : filters.scope === 'queue'
        ? { assignedUserId: null }
        : {};

  const busca = filters.search?.trim();
  const porBusca = busca
    ? {
        OR: [
          { contact: { name: { contains: busca, mode: 'insensitive' as const } } },
          { contact: { company: { contains: busca, mode: 'insensitive' as const } } },
          { contact: { phone: { contains: busca.replace(/\D/g, '') } } },
        ],
      }
    : {};

  const linhas = await prisma.conversation.findMany({
    where: {
      AND: [
        visivel,
        escopo,
        filters.status ? { status: filters.status } : {},
        porBusca,
      ],
    },
    include: withRelations,
    orderBy: [{ lastMessageAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    take: 200,
  });

  return anexarPrevia(linhas);
}

/**
 * A prévia é a última mensagem que o cliente veria — nota interna não conta.
 * Uma consulta só para todas as conversas, em vez de uma por linha.
 */
async function anexarPrevia(linhas: ConversationRow[]): Promise<ConversationDTO[]> {
  if (linhas.length === 0) return [];

  const previas = await prisma.message.findMany({
    where: {
      conversationId: { in: linhas.map((c) => c.id) },
      direction: { in: ['INBOUND', 'OUTBOUND'] },
    },
    select: { conversationId: true, content: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: linhas.length * 4,
  });

  const porConversa = new Map<string, string | null>();
  for (const m of previas) {
    if (!porConversa.has(m.conversationId)) porConversa.set(m.conversationId, m.content);
  }

  return linhas.map((linha) => conversationToDTO(linha, porConversa.get(linha.id) ?? null));
}

/** Devolve `null` — nunca 403 — quando a conversa não existe ou não é visível. */
export async function getConversation(
  session: SessionPayload,
  id: string
): Promise<ConversationDetailDTO | null> {
  const setor = await sessionDepartmentId(session);
  const visivel = conversationVisibilityFilter(session, setor);

  const conversa = await prisma.conversation.findFirst({
    where: { AND: [{ id }, visivel] },
    include: {
      ...withRelations,
      dealCard: {
        select: {
          id: true,
          title: true,
          dealValue: true,
          aiScore: true,
          aiSummary: true,
          aiAnalyzedAt: true,
          customFields: true,
          stage: { select: { name: true } },
        },
      },
      messages: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
        take: 300,
      },
    },
  });

  if (!conversa) return null;

  const mensagens = conversa.messages.map(messageToDTO);
  const previa = [...mensagens]
    .reverse()
    .find((m) => m.direction !== 'INTERNAL')?.content ?? null;

  return {
    ...conversationToDTO(conversa, previa),
    messages: mensagens,
    deal: conversa.dealCard
      ? {
          id: conversa.dealCard.id,
          title: conversa.dealCard.title,
          // Decimal não sobrevive ao JSON; a conversão acontece num ponto só.
          dealValue: Number(conversa.dealCard.dealValue),
          stageName: conversa.dealCard.stage.name,
          aiScore: conversa.dealCard.aiScore,
          aiSummary: conversa.dealCard.aiSummary,
          aiAnalyzedAt: conversa.dealCard.aiAnalyzedAt?.toISOString() ?? null,
          customFields:
            (conversa.dealCard.customFields as Record<string, unknown> | null) ?? null,
        }
      : null,
  };
}

/**
 * Localiza a conversa do contato no canal, ou cria uma nova já distribuída.
 *
 * Uma conversa por número, para sempre: o índice único
 * `conversations_org_external_key` sobre (organização, canal, external_id) já
 * decidiu isso. Mensagem que chega numa conversa encerrada reabre a conversa em
 * vez de abrir uma segunda thread.
 */
export async function findOrCreateConversation(
  organizationId: string,
  contactId: string,
  channel: ChannelType,
  externalId: string
): Promise<{ id: string; created: boolean; reopened: boolean }> {
  const existente = await prisma.conversation.findFirst({
    where: { organizationId, channel, externalId },
    select: { id: true, status: true, assignedUserId: true, departmentId: true },
  });

  if (existente) {
    if (existente.status !== 'CLOSED') {
      return { id: existente.id, created: false, reopened: false };
    }

    // Reabre e volta para a distribuição: quem atendeu da última vez pode não
    // estar mais na equipe, e o card não deve ressuscitar na caixa de ninguém.
    const destino = await routeConversation(organizationId, existente.departmentId);

    await prisma.conversation.update({
      where: { id: existente.id },
      data: {
        status: 'OPEN',
        closedAt: null,
        assignedUserId: destino.assignedUserId,
        departmentId: destino.departmentId,
        updatedAt: new Date(),
      },
    });

    return { id: existente.id, created: false, reopened: true };
  }

  const destino = await routeConversation(organizationId, null);

  const criada = await prisma.conversation.create({
    data: {
      organizationId,
      contactId,
      channel,
      externalId,
      status: 'OPEN',
      assignedUserId: destino.assignedUserId,
      departmentId: destino.departmentId,
    },
    select: { id: true },
  });

  return { id: criada.id, created: true, reopened: false };
}

/** Carrega a conversa respeitando visibilidade, ou lança 404 pela ausência. */
async function conversaVisivel(session: SessionPayload, id: string) {
  const setor = await sessionDepartmentId(session);
  const visivel = conversationVisibilityFilter(session, setor);

  return prisma.conversation.findFirst({
    where: { AND: [{ id }, visivel] },
    select: { id: true, assignedUserId: true, status: true },
  });
}

/**
 * Atribui a conversa.
 *
 * Um atendente pode **assumir** conversa da fila; não pode tomar a de outro.
 * Reatribuir o que já tem dono é ação de Administrador para cima — sem isso,
 * qualquer um puxaria para si o cliente que o colega está atendendo.
 */
export async function assignConversation(
  session: SessionPayload,
  id: string,
  targetUserId: string | null
): Promise<ConversationDTO | null> {
  const conversa = await conversaVisivel(session, id);
  if (!conversa) return null;

  const ehAdmin = canSeeAllConversations(session);

  if (!ehAdmin) {
    if (targetUserId !== session.userId) {
      throw new ConversationForbiddenError('Só é possível assumir a conversa para você.');
    }
    if (conversa.assignedUserId !== null && conversa.assignedUserId !== session.userId) {
      throw new ConversationForbiddenError('Esta conversa já está com outro atendente.');
    }
  }

  if (targetUserId) {
    const destino = await prisma.user.findFirst({
      where: { id: targetUserId, organizationId: session.organizationId },
      select: { id: true },
    });
    if (!destino) throw new ConversationForbiddenError('Atendente não encontrado nesta organização.');
  }

  const atualizada = await prisma.conversation.update({
    where: { id },
    data: { assignedUserId: targetUserId, updatedAt: new Date() },
    include: withRelations,
  });

  return conversationToDTO(atualizada, null);
}

export async function setConversationStatus(
  session: SessionPayload,
  id: string,
  status: ConversationStatus
): Promise<ConversationDTO | null> {
  const conversa = await conversaVisivel(session, id);
  if (!conversa) return null;

  const atualizada = await prisma.conversation.update({
    where: { id },
    data: {
      status,
      closedAt: status === 'CLOSED' ? new Date() : null,
      updatedAt: new Date(),
    },
    include: withRelations,
  });

  return conversationToDTO(atualizada, null);
}

export async function transferConversation(
  session: SessionPayload,
  id: string,
  departmentId: string | null
): Promise<ConversationDTO | null> {
  const conversa = await conversaVisivel(session, id);
  if (!conversa) return null;

  if (departmentId) {
    const setor = await prisma.department.findFirst({
      where: { id: departmentId, organizationId: session.organizationId },
      select: { id: true },
    });
    if (!setor) throw new ConversationForbiddenError('Setor não encontrado nesta organização.');
  }

  // Transferir de setor devolve a conversa à fila do setor de destino: manter o
  // responsável antigo esvaziaria o sentido da transferência.
  const atualizada = await prisma.conversation.update({
    where: { id },
    data: { departmentId, assignedUserId: null, updatedAt: new Date() },
    include: withRelations,
  });

  return conversationToDTO(atualizada, null);
}

export async function markAsRead(session: SessionPayload, id: string): Promise<void> {
  // updateMany com o escopo no `where`: sem conversa visível, zera nada e não
  // revela que o registro existe.
  await prisma.conversation.updateMany({
    where: { id, organizationId: session.organizationId, unreadCount: { gt: 0 } },
    data: { unreadCount: 0 },
  });
}

/**
 * Batimento de presença, alimentado pelo polling do Inbox: quem está com a tela
 * aberta está online, por definição.
 *
 * A escrita é limitada a uma por minuto pela própria cláusula `where`. Sem isso
 * seriam trinta escritas por minuto por atendente, para registrar o mesmo fato.
 */
export async function touchPresence(userId: string): Promise<void> {
  const limite = new Date(Date.now() - 60_000);

  await prisma.user.updateMany({
    where: { id: userId, OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: limite } }] },
    data: { lastActiveAt: new Date() },
  });
}
