/**
 * Assinatura do atendente.
 *
 * O cliente fala com um número só e pode ser atendido por três pessoas
 * diferentes no mesmo dia. Sem assinatura, o número central vira uma entidade
 * sem rosto e o cliente não sabe se está falando com quem já conhecia o caso.
 *
 * A assinatura é aplicada no fio, não no banco: `messages.content` guarda o que
 * o atendente digitou, e `messages.user_id` já registra quem foi. Guardar o
 * texto assinado faria toda bolha da interface repetir "*Marcio*" ao lado do
 * nome do Marcio.
 *
 * Módulo separado de `messages.ts` porque a nota interna precisa provar que
 * nunca passa por aqui.
 */

/** `*Primeiro nome*` mais quebra de linha, na sintaxe de negrito do WhatsApp. */
export function buildSignature(userName: string): string {
  const primeiro = (userName ?? '').trim().split(/\s+/)[0] ?? '';
  return primeiro ? `*${primeiro}*\n` : '';
}

/**
 * Prefixa o texto que vai para o cliente.
 *
 * Desligável por organização em `Organization.features.agentSignature = false`
 * — o campo `features` já existe, então a preferência não custou migração.
 * Mensagem de robô (F6) nunca passa por aqui.
 */
export function applySignature(
  text: string,
  authorName: string | null,
  enabled: boolean
): string {
  if (!enabled || !authorName) return text;
  return `${buildSignature(authorName)}${text}`;
}

/** Lê a preferência da organização; ausente significa ligada. */
export function signatureEnabled(features: unknown): boolean {
  if (typeof features !== 'object' || features === null) return true;
  return (features as Record<string, unknown>).agentSignature !== false;
}
