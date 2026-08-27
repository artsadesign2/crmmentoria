import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { getAiSettings, saveAiSettings, AiSettingsForbiddenError } from '@/lib/ai/settings';

/**
 * Base de conhecimento da organização.
 *
 * Leitura para qualquer sessão: a interface precisa saber se a IA está
 * disponível para decidir se mostra os botões. Escrita só para Administrador
 * ou acima — é o texto que fundamenta o que o copiloto afirma ao cliente.
 */
export const GET = withAuth(async () => {
  const session = await requireSession();
  const settings = await getAiSettings(session.organizationId);

  return NextResponse.json({ ok: true, settings });
});

export const PUT = withAuth(async (request: Request) => {
  const session = await requireSession();
  const body = await request.json().catch(() => ({}));

  const patch: { knowledgeBase?: string; tone?: string; enabled?: boolean } = {};

  if (body.knowledgeBase !== undefined) {
    if (typeof body.knowledgeBase !== 'string') {
      return NextResponse.json({ ok: false, error: 'Base de conhecimento inválida.' }, { status: 400 });
    }
    patch.knowledgeBase = body.knowledgeBase;
  }
  if (body.tone !== undefined) {
    if (typeof body.tone !== 'string') {
      return NextResponse.json({ ok: false, error: 'Tom inválido.' }, { status: 400 });
    }
    patch.tone = body.tone;
  }
  if (body.enabled !== undefined) {
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'Valor inválido para o interruptor.' }, { status: 400 });
    }
    patch.enabled = body.enabled;
  }

  try {
    const settings = await saveAiSettings(session, patch);
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    if (error instanceof AiSettingsForbiddenError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    }
    throw error;
  }
});
