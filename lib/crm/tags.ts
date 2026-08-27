import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth/jwt';
import type { TagDTO } from './types';

export async function listTags(session: SessionPayload): Promise<TagDTO[]> {
  const tags = await prisma.tag.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { name: 'asc' },
  });
  return tags.map((t) => ({ id: t.id, name: t.name, colorHex: t.colorHex }));
}

/**
 * Cria a tag, ou devolve a existente de mesmo nome.
 *
 * Idempotente de propósito: a interface adiciona tags digitando, e um nome
 * repetido deve reaproveitar a tag em vez de falhar na frente do usuário.
 */
export async function createTag(
  session: SessionPayload,
  name: string,
  colorHex = '#64748B'
): Promise<TagDTO> {
  const clean = name.trim();

  const tag = await prisma.tag.upsert({
    where: { organizationId_name: { organizationId: session.organizationId, name: clean } },
    update: { colorHex },
    create: { organizationId: session.organizationId, name: clean, colorHex },
  });

  return { id: tag.id, name: tag.name, colorHex: tag.colorHex };
}

export async function deleteTag(session: SessionPayload, id: string): Promise<boolean> {
  const { count } = await prisma.tag.deleteMany({
    where: { id, organizationId: session.organizationId },
  });
  return count > 0;
}

/** Vincula tag a contato. Ambos precisam ser da organização da sessão. */
export async function attachTag(
  session: SessionPayload,
  contactId: string,
  tagId: string
): Promise<boolean> {
  const [contact, tag] = await Promise.all([
    prisma.contact.findFirst({
      where: { id: contactId, organizationId: session.organizationId },
      select: { id: true },
    }),
    prisma.tag.findFirst({
      where: { id: tagId, organizationId: session.organizationId },
      select: { id: true },
    }),
  ]);
  if (!contact || !tag) return false;

  await prisma.contactTag.upsert({
    where: { contactId_tagId: { contactId, tagId } },
    update: {},
    create: { contactId, tagId },
  });

  return true;
}

/** Remove o vínculo — a remoção em um clique das tags do card. */
export async function detachTag(
  session: SessionPayload,
  contactId: string,
  tagId: string
): Promise<boolean> {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organizationId: session.organizationId },
    select: { id: true },
  });
  if (!contact) return false;

  const { count } = await prisma.contactTag.deleteMany({ where: { contactId, tagId } });
  return count > 0;
}
