import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateICSFeed } from '@/lib/tasks/calendar-sync';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new NextResponse('Token de feed não fornecido.', { status: 400 });
  }

  const calendarSetting = await prisma.calendarSetting.findUnique({
    where: { feedToken: token },
    include: { organization: true },
  });

  if (!calendarSetting) {
    return new NextResponse('Feed de calendário inválido ou expirado.', { status: 404 });
  }

  // Busca todas as tarefas da organização que possuem dueDate e não foram arquivadas
  const tasks = await prisma.task.findMany({
    where: {
      organizationId: calendarSetting.organizationId,
      isArchived: false,
      dueDate: { not: null },
    },
    include: {
      project: { select: { name: true } },
      assignedTo: { select: { name: true, email: true } },
    },
    orderBy: { dueDate: 'asc' },
  });

  const icsContent = generateICSFeed(tasks, calendarSetting.organization.name);

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="rocket-tasks.ics"`,
      'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
    },
  });
}
