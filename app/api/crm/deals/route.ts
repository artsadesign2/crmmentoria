import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { listDeals, createDeal, InvalidStageError } from '@/lib/crm/deals';
import { CHANNELS, PRIORITIES } from '@/lib/crm/types';

export const GET = withAuth(async (request: Request) => {
  const session = await requireSession();
  const url = new URL(request.url);

  const deals = await listDeals(session, {
    stageId: url.searchParams.get('stageId') ?? undefined,
    assignedUserId: url.searchParams.get('assignedUserId') ?? undefined,
    search: url.searchParams.get('search') ?? undefined,
  });

  return NextResponse.json({ ok: true, deals });
});

export const POST = withAuth(async (request: Request) => {
  const session = await requireSession();
  const body = await request.json().catch(() => ({}));

  if (typeof body.contactId !== 'string' || typeof body.stageId !== 'string') {
    return NextResponse.json(
      { ok: false, error: 'Informe contactId e stageId.' },
      { status: 400 }
    );
  }
  if (typeof body.title !== 'string' || !body.title.trim()) {
    return NextResponse.json(
      { ok: false, error: 'Informe o título da oportunidade.' },
      { status: 400 }
    );
  }
  if (body.channel !== undefined && !CHANNELS.includes(body.channel)) {
    return NextResponse.json({ ok: false, error: 'Canal inválido.' }, { status: 400 });
  }
  if (body.priority !== undefined && !PRIORITIES.includes(body.priority)) {
    return NextResponse.json({ ok: false, error: 'Prioridade inválida.' }, { status: 400 });
  }
  if (body.dealValue !== undefined && (typeof body.dealValue !== 'number' || body.dealValue < 0)) {
    return NextResponse.json(
      { ok: false, error: 'Valor da oportunidade inválido.' },
      { status: 400 }
    );
  }

  try {
    const deal = await createDeal(session, body);
    if (!deal) {
      return NextResponse.json({ ok: false, error: 'Contato não encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, deal }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidStageError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    throw error;
  }
});
