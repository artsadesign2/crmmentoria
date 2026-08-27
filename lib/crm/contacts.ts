import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth/jwt';
import { normalizePhone, formatPhoneBr } from './phone';
import type { ContactDTO, ContactType, TagDTO } from './types';

/** Erro de domínio: telefone já cadastrado nesta organização. */
export class DuplicatePhoneError extends Error {
  constructor(readonly existingContactId: string) {
    super('Já existe um contato com este telefone nesta organização.');
    this.name = 'DuplicatePhoneError';
  }
}

type ContactRow = Awaited<ReturnType<typeof prisma.contact.findFirstOrThrow>> & {
  tags?: Array<{ tag: { id: string; name: string; colorHex: string } }>;
};

function toDTO(contact: ContactRow): ContactDTO {
  return {
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
    phoneFormatted: contact.phone ? formatPhoneBr(contact.phone) : null,
    email: contact.email,
    documentCpf: contact.documentCpf,
    avatarUrl: contact.avatarUrl,
    company: contact.company,
    type: contact.type as ContactType,
    source: contact.source,
    notes: contact.notes,
    customFields: (contact.customFields as Record<string, unknown> | null) ?? null,
    tags: (contact.tags ?? []).map<TagDTO>(({ tag }) => ({
      id: tag.id,
      name: tag.name,
      colorHex: tag.colorHex,
    })),
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}

const withTags = { tags: { include: { tag: true } } } as const;

export interface ListContactsOptions {
  search?: string;
  type?: ContactType;
  take?: number;
  skip?: number;
}

export async function listContacts(
  session: SessionPayload,
  options: ListContactsOptions = {}
): Promise<{ contacts: ContactDTO[]; total: number }> {
  const search = options.search?.trim();

  const where = {
    organizationId: session.organizationId,
    ...(options.type ? { type: options.type } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            // A busca por telefone usa a forma canônica: quem digita
            // "(11) 98765-4321" precisa encontrar "5511987654321".
            { phone: { contains: normalizePhone(search) || search } },
            { company: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: withTags,
      orderBy: { createdAt: 'desc' },
      take: Math.min(options.take ?? 50, 200),
      skip: options.skip ?? 0,
    }),
    prisma.contact.count({ where }),
  ]);

  return { contacts: rows.map(toDTO), total };
}

export async function getContact(
  session: SessionPayload,
  id: string
): Promise<ContactDTO | null> {
  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: session.organizationId },
    include: withTags,
  });
  return contact ? toDTO(contact) : null;
}

export interface CreateContactInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  documentCpf?: string | null;
  company?: string | null;
  type?: ContactType;
  source?: string | null;
  notes?: string | null;
  customFields?: Record<string, unknown> | null;
}

export async function createContact(
  session: SessionPayload,
  input: CreateContactInput
): Promise<ContactDTO> {
  const phone = input.phone ? normalizePhone(input.phone) : null;

  if (phone) {
    const existing = await prisma.contact.findFirst({
      where: { organizationId: session.organizationId, phone },
      select: { id: true },
    });
    if (existing) throw new DuplicatePhoneError(existing.id);
  }

  const contact = await prisma.contact.create({
    data: {
      organizationId: session.organizationId,
      name: input.name.trim(),
      phone,
      email: input.email?.trim().toLowerCase() || null,
      documentCpf: input.documentCpf || null,
      company: input.company?.trim() || null,
      type: input.type ?? 'LEAD',
      source: input.source || null,
      notes: input.notes || null,
      customFields: (input.customFields ?? undefined) as never,
    },
    include: withTags,
  });

  return toDTO(contact);
}

export async function updateContact(
  session: SessionPayload,
  id: string,
  input: Partial<CreateContactInput>
): Promise<ContactDTO | null> {
  const current = await prisma.contact.findFirst({
    where: { id, organizationId: session.organizationId },
    select: { id: true },
  });
  if (!current) return null;

  const data: Record<string, unknown> = { updatedAt: new Date() };

  if (input.name !== undefined) data.name = input.name.trim();
  if (input.email !== undefined) data.email = input.email?.trim().toLowerCase() || null;
  if (input.documentCpf !== undefined) data.documentCpf = input.documentCpf || null;
  if (input.company !== undefined) data.company = input.company?.trim() || null;
  if (input.type !== undefined) data.type = input.type;
  if (input.source !== undefined) data.source = input.source || null;
  if (input.notes !== undefined) data.notes = input.notes || null;
  if (input.customFields !== undefined) data.customFields = input.customFields;

  if (input.phone !== undefined) {
    const phone = input.phone ? normalizePhone(input.phone) : null;
    if (phone) {
      const clash = await prisma.contact.findFirst({
        where: { organizationId: session.organizationId, phone, NOT: { id } },
        select: { id: true },
      });
      if (clash) throw new DuplicatePhoneError(clash.id);
    }
    data.phone = phone;
  }

  const contact = await prisma.contact.update({
    where: { id },
    data,
    include: withTags,
  });

  return toDTO(contact);
}

export async function deleteContact(session: SessionPayload, id: string): Promise<boolean> {
  const { count } = await prisma.contact.deleteMany({
    where: { id, organizationId: session.organizationId },
  });
  return count > 0;
}

/**
 * Busca por telefone ou cria o contato. É o ponto de entrada do webhook da F3:
 * uma mensagem de número desconhecido precisa virar contato sem duplicar quem
 * já existe.
 */
export async function findOrCreateByPhone(
  organizationId: string,
  rawPhone: string,
  fallbackName?: string
): Promise<{ contact: ContactDTO; created: boolean }> {
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new Error('Telefone invalido para localizar ou criar contato.');

  const existing = await prisma.contact.findFirst({
    where: { organizationId, phone },
    include: withTags,
  });
  if (existing) return { contact: toDTO(existing), created: false };

  const contact = await prisma.contact.create({
    data: {
      organizationId,
      name: fallbackName?.trim() || formatPhoneBr(phone),
      phone,
      type: 'LEAD',
      source: 'WhatsApp Direct',
    },
    include: withTags,
  });

  return { contact: toDTO(contact), created: true };
}
