import { prisma } from '@/lib/prisma';
import { generate } from './gemini';
import { formatConversation, qualifySystemPrompt, QUALIFY_SCHEMA } from './prompts';
import { getAiSettings } from './settings';
import {
  conversationVisibilityFilter,
  sessionDepartmentId,
  messageToDTO,
} from '@/lib/crm/conversations';
import type { SessionPayload } from '@/lib/auth/jwt';

/**
 * Qualificação do atendimento: a IA lê a conversa e preenche o que o comercial
 * nunca preenche à mão.
 *
 * Sob demanda, por botão. Medi ~10 s por análise; disparada a cada mensagem
 * seria cara e quase sempre desperdiçada, já que a maioria das conversas muda
 * pouco entre uma mensagem e a seguinte.
 */

export interface Qualification {
  faturamento: string;
  gargalo: string;
  meta: string;
  objecao: string;
  temperatura: number;
  resumo: string;
}

export class QualifyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QualifyError';
  }
}

const CAMPOS_TEXTO = ['faturamento', 'gargalo', 'meta', 'objecao'] as const;
const AUSENTE = 'não informado';

/** O modelo às vezes embrulha o JSON em cerca de código, mesmo com o esquema. */
function descascar(bruto: string): string {
  return bruto
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

/**
 * Valida a resposta da Gemini antes de qualquer gravação.
 *
 * Puro e separado da chamada porque é a barreira que impede um dado inventado
 * ou malformado de entrar no funil — e barreira que não dá para testar não é
 * barreira.
 */
export function parseQualification(
  bruto: string
): { ok: true; data: Qualification } | { ok: false; error: string } {
  const limpo = descascar(bruto ?? '');
  if (!limpo) return { ok: false, error: 'A IA respondeu vazio.' };

  let cru: unknown;
  try {
    cru = JSON.parse(limpo);
  } catch {
    return { ok: false, error: 'A IA respondeu num formato inesperado.' };
  }

  if (typeof cru !== 'object' || cru === null || Array.isArray(cru)) {
    return { ok: false, error: 'A IA respondeu num formato inesperado.' };
  }

  const obj = cru as Record<string, unknown>;

  // Temperatura e resumo não têm substituto: sem eles a análise não serve para
  // nada, e preencher um padrão seria inventar em nome do modelo.
  const temperaturaBruta =
    typeof obj.temperatura === 'string' ? Number(obj.temperatura) : obj.temperatura;

  if (typeof temperaturaBruta !== 'number' || !Number.isFinite(temperaturaBruta)) {
    return { ok: false, error: 'A IA não devolveu uma temperatura válida.' };
  }

  const temperatura = Math.round(temperaturaBruta);
  if (temperatura < 0 || temperatura > 100) {
    return { ok: false, error: 'A temperatura veio fora da escala de 0 a 100.' };
  }

  const resumo = typeof obj.resumo === 'string' ? obj.resumo.trim() : '';
  if (!resumo) return { ok: false, error: 'A IA não devolveu o resumo do atendimento.' };

  // Campo de texto ausente vira "não informado" em vez de reprovar a análise
  // inteira: perder o resumo e a temperatura porque a conversa não mencionou
  // faturamento seria desperdiçar a chamada.
  const textos = Object.fromEntries(
    CAMPOS_TEXTO.map((campo) => {
      const valor = obj[campo];
      const texto = typeof valor === 'string' ? valor.trim() : '';
      return [campo, texto || AUSENTE];
    })
  ) as Pick<Qualification, (typeof CAMPOS_TEXTO)[number]>;

  return { ok: true, data: { ...textos, temperatura, resumo } };
}

/**
 * Qualifica a conversa e grava no card.
 *
 * `null` quando a conversa não existe ou não é visível — o chamador traduz
 * para 404, nunca 403.
 */
export async function qualifyConversation(
  session: SessionPayload,
  conversationId: string
): Promise<
  { ok: true; qualification: Qualification; dealCardId: string } | { ok: false; error: string } | null
> {
  const setor = await sessionDepartmentId(session);
  const visivel = conversationVisibilityFilter(session, setor);

  const conversa = await prisma.conversation.findFirst({
    where: { AND: [{ id: conversationId }, visivel] },
    select: {
      id: true,
      dealCardId: true,
      messages: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
        take: 300,
      },
    },
  });
  if (!conversa) return null;

  const configuracao = await getAiSettings(session.organizationId);
  if (!configuracao.available) {
    return { ok: false, error: 'A IA está desligada nesta organização.' };
  }

  // A qualificação existe para alimentar o funil. Sem card, ela não teria onde
  // ser gravada, e gerar uma análise que se perde seria pior que recusar.
  if (!conversa.dealCardId) {
    throw new QualifyError(
      'Crie a oportunidade antes de qualificar: a análise é gravada na ficha do funil.'
    );
  }

  const transcrito = formatConversation(conversa.messages.map(messageToDTO));
  if (!transcrito.trim()) {
    return { ok: false, error: 'Esta conversa ainda não tem mensagens para analisar.' };
  }

  const resposta = await generate({
    system: qualifySystemPrompt(),
    parts: [{ text: `Qualifique este atendimento:\n\n${transcrito}` }],
    json: { schema: QUALIFY_SCHEMA },
    temperature: 0,
    maxOutputTokens: 4000,
  });

  if (!resposta.ok) return { ok: false, error: resposta.error };

  const analise = parseQualification(resposta.text);
  if (!analise.ok) {
    console.error('[qualify] resposta invalida da Gemini:', resposta.text.slice(0, 300));
    return { ok: false, error: analise.error };
  }

  await gravarNoCard(conversa.dealCardId, analise.data);

  return { ok: true, qualification: analise.data, dealCardId: conversa.dealCardId };
}

/**
 * Mescla em `custom_fields` sem apagar o que já estiver lá.
 *
 * O campo guarda também o que foi preenchido à mão e o que o seed da F2
 * colocou; sobrescrever o objeto inteiro perderia tudo isso a cada análise.
 */
async function gravarNoCard(dealCardId: string, dados: Qualification): Promise<void> {
  const card = await prisma.dealCard.findUnique({
    where: { id: dealCardId },
    select: { customFields: true },
  });

  const existentes =
    typeof card?.customFields === 'object' && card.customFields !== null
      ? (card.customFields as Record<string, unknown>)
      : {};

  await prisma.dealCard.update({
    where: { id: dealCardId },
    data: {
      customFields: {
        ...existentes,
        faturamento: dados.faturamento,
        gargalo: dados.gargalo,
        meta: dados.meta,
        objecao: dados.objecao,
      },
      aiScore: dados.temperatura,
      aiSummary: dados.resumo,
      aiAnalyzedAt: new Date(),
    },
  });
}
