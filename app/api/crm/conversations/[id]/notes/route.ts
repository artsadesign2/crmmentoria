import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { addInternalNote, MessageError } from '@/lib/crm/messages';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Anota para a equipe. Não envia nada.
 *
 * Rota própria, e não um campo na rota de envio: a separação é o que garante
 * que nenhuma condição errada publique uma nota interna para o cliente.
 */
export const POST = withAuth<Ctx>(async (request, { params }) => {
  const session = await requireSession();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  if (typeof body.text !== 'string') {
    return NextResponse.json({ ok: false, error: 'Informe o texto da nota.' }, { status: 400 });
  }

  try {
    const message = await addInternalNote(session, id, body.text);

    return message
      ? NextResponse.json({ ok: true, message })
      : NextResponse.json({ ok: false, error: 'Conversa não encontrada.' }, { status: 404 });
  } catch (error) {
    if (error instanceof MessageError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    throw error;
  }
});
