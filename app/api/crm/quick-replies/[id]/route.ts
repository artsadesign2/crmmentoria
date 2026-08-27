import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { saveQuickReply, deleteQuickReply, QuickReplyError } from '@/lib/crm/quick-replies';

type Ctx = { params: Promise<{ id: string }> };

const NOT_FOUND = NextResponse.json(
  { ok: false, error: 'Resposta rápida não encontrada.' },
  { status: 404 }
);

/** Edita uma resposta rápida existente. */
export const PATCH = withAuth<Ctx>(async (request, { params }) => {
  const session = await requireSession();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const quickReply = await saveQuickReply(session, {
      id,
      shortcut: typeof body.shortcut === 'string' ? body.shortcut : '',
      title: typeof body.title === 'string' ? body.title : '',
      content: typeof body.content === 'string' ? body.content : '',
    });

    return NextResponse.json({ ok: true, quickReply });
  } catch (error) {
    if (error instanceof QuickReplyError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    throw error;
  }
});

export const DELETE = withAuth<Ctx>(async (_request, { params }) => {
  const session = await requireSession();
  const { id } = await params;

  const apagou = await deleteQuickReply(session, id);
  if (!apagou) return NOT_FOUND;

  return NextResponse.json({ ok: true });
});
