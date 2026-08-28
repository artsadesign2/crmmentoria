import { NextResponse } from 'next/server';
import { requireSession, requireRole, withAuth } from '@/lib/auth/session';
import { getCampaign, setCampaignStatus } from '@/lib/dispatch/campaigns';
import { CampaignError, type CampaignStatus } from '@/lib/dispatch/types';

type Ctx = { params: Promise<{ id: string }> };

/**
 * 404 cobre "não existe" e "é de outra organização" com a mesma resposta.
 * Distinguir os dois confirmaria a existência de campanhas alheias.
 */
const NOT_FOUND = NextResponse.json(
  { ok: false, error: 'Campanha não encontrada.' },
  { status: 404 }
);

const STATUS_ACEITOS: CampaignStatus[] = [
  'DRAFT',
  'SCHEDULED',
  'RUNNING',
  'PAUSED',
  'DONE',
  'CANCELED',
];

/** A campanha com a lista de destinatários e o motivo de cada exclusão. */
export const GET = withAuth<Ctx>(async (_request, { params }) => {
  const session = await requireSession();
  const { id } = await params;

  const campaign = await getCampaign(session, id);
  if (!campaign) return NOT_FOUND;

  return NextResponse.json({ ok: true, campaign });
});

/** Iniciar, pausar, retomar ou cancelar — Administrador ou acima. */
export const PATCH = withAuth<Ctx>(async (request, { params }) => {
  const session = await requireRole('Administrador');
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const status = typeof body.status === 'string' ? body.status : '';

  if (!(STATUS_ACEITOS as string[]).includes(status)) {
    return NextResponse.json({ ok: false, error: 'Status inválido.' }, { status: 400 });
  }

  try {
    const campaign = await setCampaignStatus(session, id, status as CampaignStatus);
    if (!campaign) return NOT_FOUND;

    return NextResponse.json({ ok: true, campaign });
  } catch (error) {
    // Transição proibida é escolha do usuário, não falha do servidor.
    if (error instanceof CampaignError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
    }
    throw error;
  }
});
