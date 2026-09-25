import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, withAuth } from '@/lib/auth/session';
import { sendTaskNotificationEmail } from '@/lib/tasks/task-notifications';

interface Params {
  params: Promise<{ id: string }>;
}

export const GET = withAuth(async (_req: Request, { params }: Params) => {
  const session = await requireSession();
  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: { id, organizationId: session.organizationId, isArchived: false },
    include: {
      project: { select: { id: true, name: true, colorHex: true, icon: true } },
      column: { select: { id: true, name: true, colorHex: true, isCompletedColumn: true } },
      assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      subtasks: { orderBy: { position: 'asc' } },
      comments: {
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!task) {
    return NextResponse.json({ ok: false, error: 'Tarefa não encontrada.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, task });
});

export const PUT = withAuth(async (request: Request, { params }: Params) => {
  const session = await requireSession();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const existing = await prisma.task.findFirst({
    where: { id, organizationId: session.organizationId },
    include: { assignedTo: true, project: true },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Tarefa não encontrada.' }, { status: 404 });
  }

  const updateData: any = { updatedAt: new Date() };

  if (typeof body.title === 'string') updateData.title = body.title.trim();
  if (typeof body.description !== 'undefined') updateData.description = body.description;
  if (['URGENTE', 'ALTA', 'MEDIA', 'BAIXA'].includes(body.priority)) updateData.priority = body.priority;
  if (typeof body.columnId === 'string') {
    updateData.columnId = body.columnId;
    const targetCol = await prisma.taskColumn.findUnique({ where: { id: body.columnId } });
    if (targetCol?.isCompletedColumn) {
      updateData.completedAt = new Date();
    } else {
      updateData.completedAt = null;
    }
  }
  if (typeof body.startDate !== 'undefined') {
    updateData.startDate = body.startDate ? new Date(body.startDate) : null;
  }
  if (typeof body.dueDate !== 'undefined') {
    updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  }
  if (typeof body.assignedToId !== 'undefined') {
    updateData.assignedToId = body.assignedToId || null;
  }
  if (typeof body.isArchived === 'boolean') {
    updateData.isArchived = body.isArchived;
  }

  const updated = await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      project: { select: { id: true, name: true, colorHex: true } },
      column: { select: { id: true, name: true, colorHex: true, isCompletedColumn: true } },
      assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
      subtasks: { orderBy: { position: 'asc' } },
      _count: { select: { comments: true } },
    },
  });

  // Notificar caso o responsável tenha mudado
  if (
    updateData.assignedToId &&
    updateData.assignedToId !== existing.assignedToId &&
    updated.assignedTo?.email
  ) {
    const creator = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } });
    sendTaskNotificationEmail({
      to: updated.assignedTo.email,
      recipientName: updated.assignedTo.name,
      type: 'ASSIGNED',
      taskTitle: updated.title,
      projectName: updated.project.name,
      priority: updated.priority,
      authorName: creator?.name || 'Equipe',
      dueDateFormatted: updated.dueDate ? new Date(updated.dueDate).toLocaleDateString('pt-BR') : undefined,
    }).catch((err) => console.error('[Task Update] Erro ao enviar email:', err));
  }

  return NextResponse.json({ ok: true, task: updated });
});

export const DELETE = withAuth(async (_req: Request, { params }: Params) => {
  const session = await requireSession();
  const { id } = await params;

  const existing = await prisma.task.findFirst({
    where: { id, organizationId: session.organizationId },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Tarefa não encontrada.' }, { status: 404 });
  }

  await prisma.task.delete({ where: { id } });

  return NextResponse.json({ ok: true, message: 'Tarefa excluída com sucesso.' });
});
