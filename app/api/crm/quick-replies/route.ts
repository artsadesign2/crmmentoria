import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { listQuickReplies, saveQuickReply, QuickReplyError } from '@/lib/crm/quick-replies';

/** As respostas prontas da organização. Qualquer atendente precisa vê-las. */
export const GET = withAuth(async () => {
  const session = await requireSession();
  const quickReplies = await listQuickReplies(session);

  return NextResponse.json({ ok: true, quickReplies });
});

/** Cria uma resposta rápida. O papel mínimo é conferido no serviço. */
export const POST = withAuth(async (request: Request) => {
  const session = await requireSession();
  const body = await request.json().catch(() => ({}));

  try {
    const quickReply = await saveQuickReply(session, {
      shortcut: typeof body.shortcut === 'string' ? body.shortcut : '',
      title: typeof body.title === 'string' ? body.title : '',
      content: typeof body.content === 'string' ? body.content : '',
    });

    return NextResponse.json({ ok: true, quickReply }, { status: 201 });
  } catch (error) {
    // 409 no atalho repetido, e a mensagem diz qual resposta já o usa: sem
    // isso, o atendente tem de caçar o conflito na lista.
    if (error instanceof QuickReplyError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    throw error;
  }
});
