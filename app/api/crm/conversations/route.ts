import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { listConversations } from '@/lib/crm/conversations';
import { CONVERSATION_STATUSES, type ConversationStatus, type InboxScope } from '@/lib/crm/inbox-types';

const ESCOPOS: InboxScope[] = ['mine', 'queue', 'all'];

/** Lista as conversas visíveis à sessão. A regra de visibilidade vive na consulta. */
export const GET = withAuth(async (request: Request) => {
  const session = await requireSession();
  const params = new URL(request.url).searchParams;

  const escopoBruto = params.get('scope') ?? 'all';
  const scope = (ESCOPOS as string[]).includes(escopoBruto) ? (escopoBruto as InboxScope) : 'all';

  const statusBruto = params.get('status');
  if (statusBruto && !(CONVERSATION_STATUSES as string[]).includes(statusBruto)) {
    return NextResponse.json({ ok: false, error: 'Status inválido.' }, { status: 400 });
  }

  const conversations = await listConversations(session, {
    scope,
    status: (statusBruto as ConversationStatus | null) ?? undefined,
    search: params.get('q') ?? undefined,
  });

  return NextResponse.json({ ok: true, conversations });
});
