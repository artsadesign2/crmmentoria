import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { suggestReply } from '@/lib/ai/suggest';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Devolve um rascunho de resposta.
 *
 * Devolve — não envia. Não existe rota que envie uma sugestão: o rascunho vai
 * para a caixa de texto e um humano decide.
 */
export const POST = withAuth<Ctx>(async (_request, { params }) => {
  const session = await requireSession();
  const { id } = await params;

  const resultado = await suggestReply(session, id);

  if (!resultado) {
    return NextResponse.json({ ok: false, error: 'Conversa não encontrada.' }, { status: 404 });
  }
  if (!resultado.ok) {
    return NextResponse.json({ ok: false, error: resultado.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true, draft: resultado.draft, model: resultado.model });
});
