import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { listContacts, createContact, DuplicatePhoneError } from '@/lib/crm/contacts';
import { CONTACT_TYPES, type ContactType } from '@/lib/crm/types';

export const GET = withAuth(async (request: Request) => {
  const session = await requireSession();
  const url = new URL(request.url);

  const typeParam = url.searchParams.get('type');
  const type = typeParam && CONTACT_TYPES.includes(typeParam as ContactType)
    ? (typeParam as ContactType)
    : undefined;

  const { contacts, total } = await listContacts(session, {
    search: url.searchParams.get('search') ?? undefined,
    type,
    take: Number(url.searchParams.get('take')) || undefined,
    skip: Number(url.searchParams.get('skip')) || undefined,
  });

  return NextResponse.json({ ok: true, contacts, total });
});

export const POST = withAuth(async (request: Request) => {
  const session = await requireSession();
  const body = await request.json().catch(() => ({}));

  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ ok: false, error: 'Informe o nome do contato.' }, { status: 400 });
  }
  if (body.type !== undefined && !CONTACT_TYPES.includes(body.type)) {
    return NextResponse.json({ ok: false, error: 'Tipo de contato inválido.' }, { status: 400 });
  }

  try {
    const contact = await createContact(session, body);
    return NextResponse.json({ ok: true, contact }, { status: 201 });
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
