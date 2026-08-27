import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { sendCustomerMessage, MessageError } from '@/lib/crm/messages';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Responde ao cliente pelo número central da empresa.
 *
 * Rota separada da de nota interna de propósito. Um único endpoint com um campo
 * `tipo` colocaria "publicar para o cliente" e "anotar para a equipe" a um
 * caractere de distância, e o erro só apareceria depois de o cliente ter lido.
 * Ver lib/crm/messages.ts.
 */
export const POST = withAuth<Ctx>(async (request, { params }) => {
  const session = await requireSession();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  if (typeof body.text !== 'string') {
    return NextResponse.json({ ok: false, error: 'Informe o texto da mensagem.' }, { status: 400 });
  }

  try {
    const message = await sendCustomerMessage(session, id, body.text);

    if (!message) {
      return NextResponse.json({ ok: false, error: 'Conversa não encontrada.' }, { status: 404 });
    }

    // A mensagem gravada como FAILED volta com 200: ela existe na conversa e o
    // atendente precisa vê-la na tela para reenviar. O status conta o que houve.
    return NextResponse.json({ ok: true, message });
  } catch (error) {
    if (error instanceof MessageError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    throw error;
  }
});
