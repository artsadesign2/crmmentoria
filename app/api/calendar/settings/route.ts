import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, withAuth } from '@/lib/auth/session';
import crypto from 'crypto';

export const GET = withAuth(async () => {
  const session = await requireSession();

  let settings = await prisma.calendarSetting.findUnique({
    where: { organizationId: session.organizationId },
  });

  if (!settings) {
    const feedToken = crypto.randomBytes(32).toString('hex');
    settings = await prisma.calendarSetting.create({
      data: {
        organizationId: session.organizationId,
        feedToken,
      },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const feedUrl = `${appUrl}/api/calendar/feed?token=${settings.feedToken}`;
  const webcalUrl = feedUrl.replace(/^https?:\/\//, 'webcal://');

  return NextResponse.json({
    ok: true,
    settings: {
      id: settings.id,
      feedToken: settings.feedToken,
      feedUrl,
      webcalUrl,
      googleCalendarId: settings.googleCalendarId,
      syncEnabled: settings.syncEnabled,
    },
  });
});

export const POST = withAuth(async (request: Request) => {
  const session = await requireSession();
  const body = await request.json().catch(() => ({}));

  if (body.action === 'regenerate_token') {
    const newToken = crypto.randomBytes(32).toString('hex');
    const updated = await prisma.calendarSetting.upsert({
      where: { organizationId: session.organizationId },
      update: { feedToken: newToken, updatedAt: new Date() },
      create: { organizationId: session.organizationId, feedToken: newToken },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const feedUrl = `${appUrl}/api/calendar/feed?token=${updated.feedToken}`;
    const webcalUrl = feedUrl.replace(/^https?:\/\//, 'webcal://');

    return NextResponse.json({
      ok: true,
      settings: {
        id: updated.id,
        feedToken: updated.feedToken,
        feedUrl,
        webcalUrl,
        googleCalendarId: updated.googleCalendarId,
        syncEnabled: updated.syncEnabled,
      },
    });
  }

  return NextResponse.json({ ok: false, error: 'Ação desconhecida.' }, { status: 400 });
});
