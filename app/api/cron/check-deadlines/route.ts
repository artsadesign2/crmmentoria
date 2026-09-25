import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTaskNotificationEmail } from '@/lib/tasks/task-notifications';

/**
 * Cron Job para verificação periódica de prazos.
 * Pode ser executado gratuitamente via Vercel Cron ou Cron-job.org.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Proteção opcional por CRON_SECRET se configurado
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && url.searchParams.get('secret') !== cronSecret) {
    return NextResponse.json({ ok: false, error: 'Não autorizado.' }, { status: 401 });
  }

  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // 1. Tarefas que vencem nas próximas 24h
  const dueSoonTasks = await prisma.task.findMany({
    where: {
      isArchived: false,
      completedAt: null,
      dueDate: { gte: now, lte: in24Hours },
      assignedToId: { not: null },
    },
    include: {
      assignedTo: true,
      project: true,
    },
  });

  // 2. Tarefas atrasadas (venceram nas últimas 48h e ainda pendentes)
  const overdueTasks = await prisma.task.findMany({
    where: {
      isArchived: false,
      completedAt: null,
      dueDate: { lt: now, gte: new Date(now.getTime() - 48 * 60 * 60 * 1000) },
      assignedToId: { not: null },
    },
    include: {
      assignedTo: true,
      project: true,
    },
  });

  let notificationsSent = 0;

  for (const task of dueSoonTasks) {
    if (task.assignedTo?.email) {
      await sendTaskNotificationEmail({
        to: task.assignedTo.email,
        recipientName: task.assignedTo.name,
        type: 'DUE_SOON',
        taskTitle: task.title,
        projectName: task.project.name,
        priority: task.priority,
        dueDateFormatted: task.dueDate ? new Date(task.dueDate).toLocaleString('pt-BR') : undefined,
      });
      notificationsSent++;
    }
  }

  for (const task of overdueTasks) {
    if (task.assignedTo?.email) {
      await sendTaskNotificationEmail({
        to: task.assignedTo.email,
        recipientName: task.assignedTo.name,
        type: 'OVERDUE',
        taskTitle: task.title,
        projectName: task.project.name,
        priority: task.priority,
        dueDateFormatted: task.dueDate ? new Date(task.dueDate).toLocaleString('pt-BR') : undefined,
      });
      notificationsSent++;
    }
  }

  return NextResponse.json({
    ok: true,
    checkedAt: now.toISOString(),
    dueSoonCount: dueSoonTasks.length,
    overdueCount: overdueTasks.length,
    notificationsSent,
  });
}
