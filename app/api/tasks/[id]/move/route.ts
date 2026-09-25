import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, withAuth } from '@/lib/auth/session';

interface Params {
  params: Promise<{ id: string }>;
}

export const PUT = withAuth(async (request: Request, { params }: Params) => {
  const session = await requireSession();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const { columnId, position } = body;

  if (!columnId) {
    return NextResponse.json({ ok: false, error: 'columnId é obrigatório' }, { status: 400 });
  }

  const task = await prisma.task.findFirst({
    where: { id, organizationId: session.organizationId },
  });

  if (!task) {
    return NextResponse.json({ ok: false, error: 'Tarefa não encontrada' }, { status: 404 });
  }

  const targetColumn = await prisma.taskColumn.findUnique({
    where: { id: columnId },
  });

  if (!targetColumn) {
    return NextResponse.json({ ok: false, error: 'Coluna destino não encontrada' }, { status: 404 });
  }

  const completedAt = targetColumn.isCompletedColumn ? new Date() : null;

  const updated = await prisma.task.update({
    where: { id },
    data: {
      columnId,
      position: typeof position === 'number' ? position : task.position,
      completedAt,
      updatedAt: new Date(),
    },
    include: {
      column: true,
      assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
      subtasks: { orderBy: { position: 'asc' } },
    },
  });

  return NextResponse.json({ ok: true, task: updated });
});
