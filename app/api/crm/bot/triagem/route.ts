import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { criarFluxoTriagem } from '@/lib/bot/seed-triagem';
import { getFlow } from '@/lib/bot/flows';
import { BotError } from '@/lib/bot/types';

/**
 * Cria o menu de triagem a partir dos setores cadastrados.
 *
 * É o botão do estado vazio, e existe porque a primeira tela de um construtor
 * de fluxos é intimidante: um canvas em branco com sete tipos de bloco não diz
 * a ninguém o que fazer primeiro. Um fluxo pronto, com os setores reais da
 * empresa dentro, é ao mesmo tempo um bot que já funciona e um exemplo do que
 * um fluxo é.
 *
 * O que sai daqui é rascunho comum: nasce em DRAFT, é editável e precisa ser
 * publicado como qualquer outro. Não é um caso especial no motor.
 */
export const POST = withAuth(async () => {
  const session = await requireSession();

  try {
    const { flowId } = await criarFluxoTriagem(session);
    const flow = await getFlow(session, flowId);

    return NextResponse.json({ ok: true, flow }, { status: 201 });
  } catch (error) {
    if (error instanceof BotError) {
      // "Cadastre ao menos um setor" é o caso comum, e é acionável.
      return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
    }
    throw error;
  }
});
