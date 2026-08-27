import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth/jwt';
import { assertRole } from '@/lib/auth/session';
import { renderTemplate } from '@/lib/dispatch/template';

/**
 * Respostas prontas para o atendente: `/preco`, `/endereco`, `/horario`.
 *
 * No banco, não no navegador. Os modelos que existiam antes viviam em
 * `localStorage`: cada atendente tinha os seus, ninguém via os dos outros, e
 * limpar o navegador apagava tudo. Aqui a organização inteira compartilha a
 * mesma lista.
 */

export interface QuickReplyDTO {
  id: string;
  shortcut: string;
  title: string;
  content: string;
}

/** Erro de domínio: vira 400 ou 409, nunca 500. */
export class QuickReplyError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 409 = 400
  ) {
    super(message);
    this.name = 'QuickReplyError';
  }
}

const TAMANHO_MAXIMO_ATALHO = 40;

/**
 * Substitui as variáveis do texto pronto.
 *
 * Mesma resolução do disparo — ver `lib/dispatch/template.ts`. Duas
 * implementações do mesmo `{{nome}}` divergiriam com o tempo, e a divergência
 * apareceria como um placeholder cru na conversa de um cliente.
 */
export function interpolateQuickReply(
  content: string,
  vars: { nome: string; empresa?: string | null }
): string {
  return renderTemplate(content, { nome: vars.nome, empresa: vars.empresa ?? null });
}

/**
 * Reduz o atalho à forma que o atendente consegue digitar sem pensar.
 *
 * Sem barra (ela é o gatilho, não parte do nome), sem acento, sem maiúscula e
 * sem espaço — um atalho com espaço não é atalho, porque o menu fecharia na
 * primeira tecla de espaço.
 */
export function normalizeShortcut(bruto: string): string {
  const limpo = bruto
    .trim()
    .replace(/^\/+/, '')
    .normalize('NFD')
    .replace(ACENTOS, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');

  if (!limpo) {
    throw new QuickReplyError('Dê um atalho à resposta, por exemplo /preco.');
  }

  if (limpo.length > TAMANHO_MAXIMO_ATALHO) {
    throw new QuickReplyError(
      `O atalho precisa ter no máximo ${TAMANHO_MAXIMO_ATALHO} caracteres.`
    );
  }

  return limpo;
}

/** Marcas de acento soltas depois do NFD (U+0300 a U+036F). */
const ACENTOS = new RegExp('[\u0300-\u036f]', 'g');

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
