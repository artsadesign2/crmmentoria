import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { getDeal, updateDeal, deleteDeal, InvalidStageError } from '@/lib/crm/deals';
import { CHANNELS, PRIORITIES } from '@/lib/crm/types';

type Ctx = { params: Promise<{ id: string }> };

/**
 * 404 cobre três casos de propósito: o card não existe, é de outra organização,
 * ou o usuário não tem visibilidade sobre ele. Distinguir os três revelaria a
 * existência de oportunidades que este usuário não deveria sequer supor.
 */
const NOT_FOUND = NextResponse.json(
  { ok: false, error: 'Oportunidade não encontrada.' },
  { status: 404 }
);

export const GET = withAuth<Ctx>(async (_request, { params }) => {
  const session = await requireSession();
  const { id } = await params;

  const deal = await getDeal(session, id);
  return deal ? NextResponse.json({ ok: true, deal }) : NOT_FOUND;
});

/** Move de etapa, reatribui, edita valor. É o PATCH do arrastar-e-soltar. */
export const PATCH = withAuth<Ctx>(async (request, { params }) => {
  const session = await requireSession();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

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
    const deal = await updateDeal(session, id, body);
    return deal ? NextResponse.json({ ok: true, deal }) : NOT_FOUND;
  } catch (error) {
    if (error instanceof InvalidStageError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    throw error;
  }
});

export const DELETE = withAuth<Ctx>(async (_request, { params }) => {
  const session = await requireSession();
  const { id } = await params;

  const removed = await deleteDeal(session, id);
  return removed ? NextResponse.json({ ok: true }) : NOT_FOUND;
});
