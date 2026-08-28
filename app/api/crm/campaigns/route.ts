import { NextResponse } from 'next/server';
import { requireSession, requireRole, withAuth } from '@/lib/auth/session';
import {
  createCampaign,
  listCampaigns,
  type CampaignRecipientInput,
} from '@/lib/dispatch/campaigns';
import { CampaignError } from '@/lib/dispatch/types';

/** Campanhas da organização da sessão. Ver é o bastante para qualquer papel. */
export const GET = withAuth(async () => {
  const session = await requireSession();
  const campaigns = await listCampaigns(session);

  return NextResponse.json({ ok: true, campaigns });
});

/**
 * Cria a campanha.
 *
 * Administrador ou acima: disparo em massa é a operação que pode queimar o
 * número da empresa, e não é reversível depois de sair.
 */
export const POST = withAuth(async (request: Request) => {
  const session = await requireRole('Administrador');
  const body = await request.json().catch(() => ({}));

  const contactIds = Array.isArray(body.contactIds)
    ? body.contactIds.filter((id: unknown): id is string => typeof id === 'string')
    : [];

  // Destinatários crus vêm da tela de eventos, cuja lista não é do CRM. Cada um
  // vira um contato de verdade — ver resolverDestinatarios.
  const recipients: CampaignRecipientInput[] = Array.isArray(body.recipients)
    ? body.recipients
        .filter((r: unknown): r is Record<string, unknown> => typeof r === 'object' && r !== null)
        .map((r: Record<string, unknown>) => ({
          name: typeof r.name === 'string' ? r.name : '',
          phone: typeof r.phone === 'string' ? r.phone : '',
          company: typeof r.company === 'string' ? r.company : null,
        }))
    : [];

  try {
    const campaign = await createCampaign(session, {
      name: typeof body.name === 'string' ? body.name : '',
      message: typeof body.message === 'string' ? body.message : '',
      contactIds,
      recipients,
      scheduledAt: typeof body.scheduledAt === 'string' ? body.scheduledAt : undefined,
    });

    return NextResponse.json({ ok: true, campaign }, { status: 201 });
  } catch (error) {
    // Erro de domínio é do usuário, não do servidor: 400, com a frase que
    // explica o que fazer. Qualquer outra coisa sobe e vira 500 no withAuth.
    if (error instanceof CampaignError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    throw error;
  }
});
