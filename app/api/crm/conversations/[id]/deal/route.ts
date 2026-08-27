import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { promoteToDeal, MessageError } from '@/lib/crm/messages';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Promove a conversa a oportunidade no funil.
 *
 * A promoção é explícita porque a entrada não cria card: se todo número
 * desconhecido virasse oportunidade, o quadro receberia engano de número e
 * disparo de lista, e um quadro que precisa de faxina diária para de ser lido.
 */
export const POST = withAuth<Ctx>(async (_request, { params }) => {
  const session = await requireSession();
  const { id } = await params;

  try {
    const resultado = await promoteToDeal(session, id);

    return resultado
      ? NextResponse.json({ ok: true, ...resultado })
      : NextResponse.json({ ok: false, error: 'Conversa não encontrada.' }, { status: 404 });
  } catch (error) {
    if (error instanceof MessageError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    throw error;
  }
});
