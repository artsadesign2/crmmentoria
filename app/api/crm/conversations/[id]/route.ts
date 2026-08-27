import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import {
  getConversation,
  assignConversation,
  setConversationStatus,
  transferConversation,
  markAsRead,
  ConversationForbiddenError,
} from '@/lib/crm/conversations';
import { CONVERSATION_STATUSES, type ConversationStatus } from '@/lib/crm/inbox-types';

type Ctx = { params: Promise<{ id: string }> };

/**
 * 404 cobre três casos de propósito: a conversa não existe, é de outra
 * organização, ou o atendente não tem visibilidade sobre ela. Distinguir os
 * três confirmaria a existência de conversas que ele não deveria supor.
 */
const NOT_FOUND = NextResponse.json(
  { ok: false, error: 'Conversa não encontrada.' },
  { status: 404 }
);

/** Abrir a conversa marca como lida: é o que "abrir" significa numa caixa. */
export const GET = withAuth<Ctx>(async (_request, { params }) => {
  const session = await requireSession();
  const { id } = await params;

  const conversation = await getConversation(session, id);
  if (!conversation) return NOT_FOUND;

  await markAsRead(session, id);

  return NextResponse.json({ ok: true, conversation: { ...conversation, unreadCount: 0 } });
});

/** Assumir, transferir de setor ou mudar o status do atendimento. */
export const PATCH = withAuth<Ctx>(async (request, { params }) => {
  const session = await requireSession();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    if (body.assignedUserId !== undefined) {
      if (body.assignedUserId !== null && typeof body.assignedUserId !== 'string') {
        return NextResponse.json({ ok: false, error: 'Atendente inválido.' }, { status: 400 });
      }
      const conversation = await assignConversation(session, id, body.assignedUserId);
      return conversation ? NextResponse.json({ ok: true, conversation }) : NOT_FOUND;
    }

    if (body.departmentId !== undefined) {
      if (body.departmentId !== null && typeof body.departmentId !== 'string') {
        return NextResponse.json({ ok: false, error: 'Setor inválido.' }, { status: 400 });
      }
      const conversation = await transferConversation(session, id, body.departmentId);
      return conversation ? NextResponse.json({ ok: true, conversation }) : NOT_FOUND;
    }

    if (body.status !== undefined) {
      if (!(CONVERSATION_STATUSES as string[]).includes(body.status)) {
        return NextResponse.json({ ok: false, error: 'Status inválido.' }, { status: 400 });
      }
      const conversation = await setConversationStatus(
        session,
        id,
        body.status as ConversationStatus
      );
      return conversation ? NextResponse.json({ ok: true, conversation }) : NOT_FOUND;
    }

    return NextResponse.json({ ok: false, error: 'Nada a alterar.' }, { status: 400 });
  } catch (error) {
    if (error instanceof ConversationForbiddenError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    }
    throw error;
  }
});
