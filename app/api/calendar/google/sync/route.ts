import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth/guard';
import { createGoogleCalendarBooking } from '@/lib/calendar/google-calendar';

export async function GET() {
  const auth = await guard();
  if (auth.response) return auth.response;

  const hasApiKey = Boolean(process.env.GOOGLE_CALENDAR_API_KEY);
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  return NextResponse.json({
    ok: true,
    provider: 'Google Calendar v3',
    configured: hasApiKey,
    calendarId,
    mode: hasApiKey ? '2-Way Direct API Sync' : 'Direct Link Fallback (1-Click Sync)',
    lastSync: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  const auth = await guard();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { title, description, startDate, durationMinutes, guestEmail, guestName } = body;

    if (!title || !startDate) {
      return NextResponse.json(
        { ok: false, error: 'Título e data de início são obrigatórios.' },
        { status: 400 }
      );
    }

    const result = await createGoogleCalendarBooking({
      title,
      description: description || 'Sessão de Mentoria Estratégica Rocket Club',
      startDate,
      durationMinutes: durationMinutes || 45,
      guestEmail,
      guestName,
    });

    return NextResponse.json({
      ok: true,
      result,
      message: 'Evento sincronizado com sucesso no Google Calendar.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao sincronizar com Google Calendar.' },
      { status: 500 }
    );
  }
}
