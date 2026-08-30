import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, withAuth } from '@/lib/auth/session';
import { getBotSettings, saveBotSettings } from '@/lib/bot/settings';
import { BotError } from '@/lib/bot/types';

/**
 * Quando o robô retoma um lead que o atendimento humano deixou parado.
 *
 * Os dois avisos (WhatsApp e e-mail) não fazem parte de `RetomadaConfig`,
 * porque a regra pura decide **se** há motivo para avisar, nunca **por onde**.
 * Vêm da linha do banco e voltam junto, para o formulário mostrar o estado
 * verdadeiro em vez de um padrão inventado na tela.
 */
export const GET = withAuth(async () => {
  const session = await requireSession();

  const config = await getBotSettings(session.organizationId);
  const linha = await prisma.botSettings.findUnique({
    where: { organizationId: session.organizationId },
    select: { notifyByWhatsapp: true, notifyByEmail: true },
  });

  return NextResponse.json({
    ok: true,
    settings: {
      ...config,
      notifyByWhatsapp: linha?.notifyByWhatsapp ?? true,
      notifyByEmail: linha?.notifyByEmail ?? true,
    },
  });
});

/** Salvar exige Administrador — a checagem vive no serviço. */
export const PUT = withAuth(async (request: Request) => {
  const session = await requireSession();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    const config = await saveBotSettings(session, {
      reengageEnabled: booleano(body.reengageEnabled),
      reengageAfterHours: numero(body.reengageAfterHours),
      officeDays: Array.isArray(body.officeDays)
        ? body.officeDays.map(Number).filter(Number.isInteger)
        : undefined,
      officeStartHour: numero(body.officeStartHour),
      officeEndHour: numero(body.officeEndHour),
      timeZone: typeof body.timeZone === 'string' ? body.timeZone : undefined,
      notifyByWhatsapp: booleano(body.notifyByWhatsapp),
      notifyByEmail: booleano(body.notifyByEmail),
    });

    const linha = await prisma.botSettings.findUnique({
      where: { organizationId: session.organizationId },
      select: { notifyByWhatsapp: true, notifyByEmail: true },
    });

    return NextResponse.json({
      ok: true,
      settings: {
        ...config,
        notifyByWhatsapp: linha?.notifyByWhatsapp ?? true,
        notifyByEmail: linha?.notifyByEmail ?? true,
      },
    });
  } catch (error) {
    if (error instanceof BotError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    throw error;
  }
});

/** O formulário manda string; o serviço só aceita número finito. */
function numero(valor: unknown): number | undefined {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : undefined;
  if (typeof valor !== 'string' || !valor.trim()) return undefined;

  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : undefined;
}

function booleano(valor: unknown): boolean | undefined {
  return typeof valor === 'boolean' ? valor : undefined;
}
