import { prisma } from '@/lib/prisma';
import { generate } from './gemini';
import { formatConversation, suggestSystemPrompt } from './prompts';
import { getAiSettings } from './settings';
import {
  conversationVisibilityFilter,
  sessionDepartmentId,
  messageToDTO,
} from '@/lib/crm/conversations';
import type { SessionPayload } from '@/lib/auth/jwt';

/**
 * Rascunho de resposta.
 *
 * A sugestão **nunca é enviada**. Ela preenche a caixa de texto do atendente,
 * que lê, corrige e clica em enviar como faria com qualquer mensagem. Não
 * existe "enviar sugestão" em lugar nenhum do código, e é isso que separa
 * copiloto de robô — além de ser a defesa que não depende de o modelo se
 * comportar.
 */

export type SuggestResult =
  | { ok: true; draft: string; model: string }
  /** `disabled` separa configuração de falha: uma não adianta repetir. */
  | { ok: false; error: string; disabled?: boolean };

export async function suggestReply(
  session: SessionPayload,
  conversationId: string
): Promise<SuggestResult | null> {
  const setor = await sessionDepartmentId(session);
  const visivel = conversationVisibilityFilter(session, setor);

  const conversa = await prisma.conversation.findFirst({
    where: { AND: [{ id: conversationId }, visivel] },
    select: {
      id: true,
      contact: { select: { name: true, company: true } },
      dealCard: { select: { stage: { select: { name: true } } } },
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
    return { ok: false, error: 'A IA está desligada nesta organização.', disabled: true };
  }

  const transcrito = formatConversation(conversa.messages.map(messageToDTO));
  if (!transcrito.trim()) {
    return { ok: false, error: 'Não há mensagens nesta conversa para servir de contexto.' };
  }

  const resposta = await generate({
    system: suggestSystemPrompt(
      { knowledgeBase: configuracao.knowledgeBase, tone: configuracao.tone },
      {
        nome: conversa.contact.name,
        empresa: conversa.contact.company,
        etapa: conversa.dealCard?.stage.name ?? null,
      }
    ),
    parts: [{ text: `Conversa até agora:\n\n${transcrito}\n\nEscreva o rascunho da próxima resposta ao cliente.` }],
    // 0.4 e não 0: rascunho comercial precisa soar humano, e temperatura zero
    // produz texto engessado. Fato objetivo é outra história — a qualificação
    // roda em 0.
    temperature: 0.4,
    maxOutputTokens: 2000,
  });

  if (!resposta.ok) return { ok: false, error: resposta.error };

  return { ok: true, draft: limparRascunho(resposta.text), model: resposta.model };
}

/**
 * Remove o que o modelo às vezes acrescenta apesar da instrução: aspas
 * envolvendo a mensagem inteira e prefixos do tipo "Rascunho:".
 */
function limparRascunho(bruto: string): string {
  let texto = bruto.trim();

  texto = texto.replace(/^(rascunho|sugest[ãa]o|resposta)\s*:\s*/i, '');

  const aspasInteiras =
    (texto.startsWith('"') && texto.endsWith('"')) ||
    (texto.startsWith('“') && texto.endsWith('”'));

  if (aspasInteiras) texto = texto.slice(1, -1);

  return texto.trim();
}
