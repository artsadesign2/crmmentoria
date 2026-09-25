import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, withAuth } from '@/lib/auth/session';
import { sendTaskNotificationEmail } from '@/lib/tasks/task-notifications';

interface Params {
  params: Promise<{ id: string }>;
}

export const GET = withAuth(async (_req: Request, { params }: Params) => {
  const session = await requireSession();
  const { id: taskId } = await params;

  const comments = await prisma.taskComment.findMany({
    where: {
      taskId,
      task: { organizationId: session.organizationId },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
    },
  });

  return NextResponse.json({ ok: true, comments });
});

export const POST = withAuth(async (request: Request, { params }: Params) => {
  const session = await requireSession();
  const { id: taskId } = await params;
  const body = await request.json().catch(() => ({}));

  const content = typeof body.content === 'string' ? body.content.trim() : '';

  if (!content) {
    return NextResponse.json({ ok: false, error: 'O comentário não pode ser vazio.' }, { status: 400 });
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: session.organizationId },
    include: {
      project: { select: { name: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!task) {
    return NextResponse.json({ ok: false, error: 'Tarefa não encontrada.' }, { status: 404 });
  }

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      userId: session.userId,
      content,
    },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  // Notificar o responsável ou criador caso não seja quem comentou
  const author = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } });
  const recipient = task.assignedTo?.id !== session.userId ? task.assignedTo : task.createdBy?.id !== session.userId ? task.createdBy : null;

  if (recipient && recipient.email) {
    sendTaskNotificationEmail({
      to: recipient.email,
      recipientName: recipient.name,
      type: 'COMMENT',
      taskTitle: task.title,
      projectName: task.project.name,
      authorName: author?.name || 'Colega',
      commentContent: content,
    }).catch((err) => console.error('[Comment Notification] Erro:', err));
  }

  return NextResponse.json({ ok: true, comment }, { status: 201 });
});
