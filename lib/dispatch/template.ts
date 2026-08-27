/**
 * Resolução do texto da campanha, por destinatário.
 *
 * Puro e sem I/O: é resolvido uma vez por pessoa, então um erro aqui sai
 * multiplicado por toda a lista. Um "Olá {{nome}}" literal chegando a 300
 * contatos não é o tipo de bug que se conserta depois.
 */

export interface TemplateVars {
  nome: string;
  empresa: string | null;
}

/** As únicas variáveis que a campanha conhece. */
export const VARIAVEIS = ['nome', 'empresa'] as const;

/** `{{nome}}`, `{{ NOME }}`, `{{ Empresa }}` — tudo casa. */
const PLACEHOLDER = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

/**
 * Substitui as variáveis conhecidas.
 *
 * Placeholder desconhecido fica literal de propósito. Apagar em silêncio
 * produziria uma frase incompleta que ninguém revisa; deixando visível, quem
 * confere a prévia percebe antes de disparar.
 */
export function renderTemplate(template: string, vars: TemplateVars): string {
  const resolvido = template.replace(PLACEHOLDER, (original, chave: string) => {
    const nome = chave.toLowerCase();

    if (nome === 'nome') return vars.nome;
    if (nome === 'empresa') return vars.empresa ?? '';

    return original;
  });

  return limparSobras(resolvido);
}

/**
 * Arruma o que a substituição vazia deixou para trás.
 *
 * "Olá Ana, da  — tudo certo?" com dois espaços denuncia o robô mais rápido do
 * que qualquer conteúdo. Só espaço horizontal é colapsado: quebra de linha é
 * formatação de propósito no WhatsApp e precisa sobreviver intacta.
 */
function limparSobras(texto: string): string {
  return texto
    .split('\n')
    .map((linha) => linha.replace(/[^\S\n]{2,}/g, ' ').replace(/[^\S\n]+$/, ''))
    .join('\n');
}

/**
 * Variáveis escritas no template que ninguém vai resolver.
 *
 * A tela usa isto para avisar antes do disparo — é a diferença entre um erro de
 * digitação e trezentas mensagens erradas.
 */
export function placeholdersDesconhecidos(template: string): string[] {
  const conhecidas = new Set<string>(VARIAVEIS);
  const achadas = new Set<string>();

  for (const [, chave] of template.matchAll(PLACEHOLDER)) {
    const nome = chave.toLowerCase();
    if (!conhecidas.has(nome)) achadas.add(chave);
  }

  return [...achadas];
}
