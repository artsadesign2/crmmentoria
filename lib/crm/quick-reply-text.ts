import { renderTemplate } from '@/lib/dispatch/template';

/**
 * A parte das respostas rápidas que roda dos dois lados.
 *
 * Separada de `quick-replies.ts` porque aquele arquivo fala com o banco e com a
 * sessão — e sessão importa `next/headers`, que não existe no navegador. O
 * compositor precisa interpolar o texto na hora em que o atendente escolhe, sem
 * arrastar o Prisma para dentro do bundle do cliente.
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

export const TAMANHO_MAXIMO_ATALHO = 40;

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

/** Marcas de acento soltas depois do NFD (U+0300 a U+036F). */
const ACENTOS = new RegExp('[\u0300-\u036f]', 'g');

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
