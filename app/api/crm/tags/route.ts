import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { listTags, createTag, deleteTag } from '@/lib/crm/tags';

export const GET = withAuth(async () => {
  const session = await requireSession();
  return NextResponse.json({ ok: true, tags: await listTags(session) });
});

export const POST = withAuth(async (request: Request) => {
  const session = await requireSession();
  const body = await request.json().catch(() => ({}));

  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ ok: false, error: 'Informe o nome da tag.' }, { status: 400 });
  }

  const colorHex = typeof body.colorHex === 'string' ? body.colorHex : undefined;
  const tag = await createTag(session, body.name, colorHex);

  return NextResponse.json({ ok: true, tag }, { status: 201 });
});

export const DELETE = withAuth(async (request: Request) => {
  const session = await requireSession();
  const id = new URL(request.url).searchParams.get('id');

  if (!id) {
    return NextResponse.json({ ok: false, error: 'Informe o id da tag.' }, { status: 400 });
  }

  const removed = await deleteTag(session, id);
  return removed
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ ok: false, error: 'Tag não encontrada.' }, { status: 404 });
});
