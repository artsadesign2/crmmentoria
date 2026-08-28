import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { getDispatchSettings, saveDispatchSettings } from '@/lib/dispatch/settings';
import { CampaignError } from '@/lib/dispatch/types';

/** Os parâmetros anti-bloqueio em vigor. Qualquer papel pode consultar. */
export const GET = withAuth(async () => {
  const session = await requireSession();
  const settings = await getDispatchSettings(session);

  return NextResponse.json({ ok: true, settings });
});

/** Salvar exige Administrador — a checagem vive no serviço. */
export const PUT = withAuth(async (request: Request) => {
  const session = await requireSession();
  const body = await request.json().catch(() => ({}));

  try {
    const settings = await saveDispatchSettings(session, {
      minIntervalMs: numero(body.minIntervalMs),
      jitterMs: numero(body.jitterMs),
      maxPerMinute: numero(body.maxPerMinute),
      windowStartHour: numero(body.windowStartHour),
      windowEndHour: numero(body.windowEndHour),
      dailyCap: numero(body.dailyCap),
      timeZone: typeof body.timeZone === 'string' ? body.timeZone : undefined,
    });

    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    if (error instanceof CampaignError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    throw error;
  }
});

/** O formulário manda string; o serviço só aceita número finito. */
function numero(valor: unknown): number | undefined {
  if (typeof valor === 'number') return valor;
  if (typeof valor !== 'string' || !valor.trim()) return undefined;

  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : undefined;
}
