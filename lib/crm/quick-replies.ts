import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth/jwt';
import { assertRole } from '@/lib/auth/session';
import { normalizeShortcut, QuickReplyError, type QuickReplyDTO } from './quick-reply-text';

/**
 * Respostas prontas para o atendente: `/preco`, `/endereco`, `/horario`.
 *
 * No banco, não no navegador. Os modelos que existiam antes viviam em
 * `localStorage`: cada atendente tinha os seus, ninguém via os dos outros, e
 * limpar o navegador apagava tudo. Aqui a organização inteira compartilha a
 * mesma lista.
 *
 * A interpolação e a normalização do atalho moram em `quick-reply-text.ts`,
 * porque o compositor precisa delas no navegador e este arquivo importa sessão
 * e Prisma — que só existem no servidor.
 */

export { QuickReplyError, type QuickReplyDTO } from './quick-reply-text';

export async function listQuickReplies(session: SessionPayload): Promise<QuickReplyDTO[]> {
  const linhas = await prisma.quickReply.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { shortcut: 'asc' },
    select: { id: true, shortcut: true, title: true, content: true },
  });

  return linhas;
}

/**
 * Cria ou atualiza. Editor ou acima — quem atende é quem sabe o que responder.
 *
 * O atalho é único por organização: dois `/preco` fariam o menu do atendente
 * mostrar duas linhas idênticas, e ele mandaria a errada metade das vezes.
 */
export async function saveQuickReply(
  session: SessionPayload,
  input: { id?: string; shortcut: string; title: string; content: string }
): Promise<QuickReplyDTO> {
  assertRole(session, 'Editor');

  const shortcut = normalizeShortcut(input.shortcut);

  const title = input.title.trim();
  if (!title) throw new QuickReplyError('Dê um título à resposta.');

  const content = input.content.trim();
  if (!content) throw new QuickReplyError('Escreva o texto da resposta.');

  const conflito = await prisma.quickReply.findFirst({
    where: { organizationId: session.organizationId, shortcut, id: { not: input.id } },
    select: { title: true },
  });

  if (conflito) {
    throw new QuickReplyError(`O atalho /${shortcut} já é usado por "${conflito.title}".`, 409);
  }

  if (input.id) {
    // updateMany escopado: id de outra organização atinge zero linhas em vez de
    // editar o que não deveria nem ser visível.
    const alterados = await prisma.quickReply.updateMany({
      where: { id: input.id, organizationId: session.organizationId },
      data: { shortcut, title, content, updatedAt: new Date() },
    });

    if (alterados.count === 0) {
      throw new QuickReplyError('Resposta rápida não encontrada.', 400);
    }

    return { id: input.id, shortcut, title, content };
  }

  const criada = await prisma.quickReply.create({
    data: { organizationId: session.organizationId, shortcut, title, content },
    select: { id: true, shortcut: true, title: true, content: true },
  });

  return criada;
}

/** `false` quando não existe ou é de outra organização — a rota devolve 404. */
export async function deleteQuickReply(
  session: SessionPayload,
  id: string
): Promise<boolean> {
  assertRole(session, 'Editor');

  const apagados = await prisma.quickReply.deleteMany({
    where: { id, organizationId: session.organizationId },
  });

  return apagados.count > 0;
}
