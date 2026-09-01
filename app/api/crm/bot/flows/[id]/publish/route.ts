import { NextResponse } from 'next/server';
import { requireRole, withAuth } from '@/lib/auth/session';
import { publishFlow } from '@/lib/bot/flows';
import { BotError } from '@/lib/bot/types';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Publica: copia o rascunho para uma versão nova e imutável.
 *
 * **422 quando a validação recusa**, com a lista de problemas junto. O código
 * importa: 400 diria que o pedido veio malformado, 403 que falta permissão,
 * 500 que o servidor quebrou. Nenhum é verdade — o pedido está perfeito, quem
 * está quebrado é o fluxo, e a tela precisa poder acender os nós culpados em
 * vez de mostrar "erro ao publicar".
 */
export const POST = withAuth<Ctx>(async (_request, { params }) => {
  const session = await requireRole('Master');
  const { id } = await params;

  try {
    const resultado = await publishFlow(session, id);

    if (!resultado.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'O fluxo tem problemas que precisam ser resolvidos antes de publicar.',
          problemas: resultado.problemas,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ ok: true, version: resultado.version });
  } catch (error) {
    if (error instanceof BotError) {
      // O serviço só lança aqui quando o fluxo não existe nesta organização.
      return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
    }
    throw error;
  }
});
