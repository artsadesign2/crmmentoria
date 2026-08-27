import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import {
  getContact,
  updateContact,
  deleteContact,
  DuplicatePhoneError,
} from '@/lib/crm/contacts';
import { attachTag, detachTag } from '@/lib/crm/tags';
import { CONTACT_TYPES } from '@/lib/crm/types';

type Ctx = { params: Promise<{ id: string }> };

/**
 * 404, e não 403, para contato de outra organização: responder 403 confirmaria
 * que aquele id existe em algum lugar do sistema.
 */
const NOT_FOUND = NextResponse.json(
  { ok: false, error: 'Contato não encontrado.' },
  { status: 404 }
);

export const GET = withAuth<Ctx>(async (_request, { params }) => {
  const session = await requireSession();
  const { id } = await params;

  const contact = await getContact(session, id);
  return contact ? NextResponse.json({ ok: true, contact }) : NOT_FOUND;
});

export const PATCH = withAuth<Ctx>(async (request, { params }) => {
  const session = await requireSession();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  if (body.type !== undefined && !CONTACT_TYPES.includes(body.type)) {
    return NextResponse.json({ ok: false, error: 'Tipo de contato inválido.' }, { status: 400 });
  }

  // Vínculo de tag chega pelo mesmo PATCH, para a remoção em um clique do card
  // não precisar de uma rota própria.
  if (typeof body.attachTagId === 'string') {
    const ok = await attachTag(session, id, body.attachTagId);
    if (!ok) return NOT_FOUND;
  }
  if (typeof body.detachTagId === 'string') {
    await detachTag(session, id, body.detachTagId);
  }

  try {
    const contact = await updateContact(session, id, body);
    return contact ? NextResponse.json({ ok: true, contact }) : NOT_FOUND;
  } catch (error) {
    if (error instanceof DuplicatePhoneError) {
      return NextResponse.json(
        { ok: false, error: error.message, existingContactId: error.existingContactId },
        { status: 409 }
      );
    }
    throw error;
  }
});

export const DELETE = withAuth<Ctx>(async (_request, { params }) => {
  const session = await requireSession();
  const { id } = await params;

  const removed = await deleteContact(session, id);
  return removed ? NextResponse.json({ ok: true }) : NOT_FOUND;
});
