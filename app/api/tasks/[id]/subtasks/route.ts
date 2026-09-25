import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, withAuth } from '@/lib/auth/session';

interface Params {
  params: Promise<{ id: string }>;
}

export const POST = withAuth(async (request: Request, { params }: Params) => {
  const session = await requireSession();
  const { id: taskId } = await params;
  const body = await request.json().catch(() => ({}));

  const title = typeof body.title === 'string' ? body.title.trim() : '';

  if (!title) {
    return NextResponse.json({ ok: false, error: 'O título da subtarefa é obrigatório.' }, { status: 400 });
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: session.organizationId },
  });

  if (!task) {
    return NextResponse.json({ ok: false, error: 'Tarefa não encontrada.' }, { status: 404 });
  }

  const lastSubtask = await prisma.taskSubtask.findFirst({
    where: { taskId },
    orderBy: { position: 'desc' },
  });
  const position = (lastSubtask?.position ?? -1) + 1;

  const subtask = await prisma.taskSubtask.create({
    data: {
      taskId,
      title,
      position,
    },
  });

  return NextResponse.json({ ok: true, subtask }, { status: 201 });
});

export const PUT = withAuth(async (request: Request, { params }: Params) => {
  const session = await requireSession();
  const { id: taskId } = await params;
  const body = await request.json().catch(() => ({}));

  const { subtaskId, isCompleted, title } = body;

  if (!subtaskId) {
    return NextResponse.json({ ok: false, error: 'subtaskId é obrigatório.' }, { status: 400 });
  }

  // Valida pertencimento da task à org
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: session.organizationId },
  });

  if (!task) {
    return NextResponse.json({ ok: false, error: 'Tarefa não encontrada.' }, { status: 404 });
  }

  const updated = await prisma.taskSubtask.update({
    where: { id: subtaskId },
    data: {
      isCompleted: typeof isCompleted === 'boolean' ? isCompleted : undefined,
      completedAt: typeof isCompleted === 'boolean' ? (isCompleted ? new Date() : null) : undefined,
      title: typeof title === 'string' ? title.trim() : undefined,
    },
  });

  return NextResponse.json({ ok: true, subtask: updated });
});

export const DELETE = withAuth(async (request: Request, { params }: Params) => {
  const session = await requireSession();
  const { id: taskId } = await params;
  const url = new URL(request.url);
  const subtaskId = url.searchParams.get('subtaskId');

  if (!subtaskId) {
    return NextResponse.json({ ok: false, error: 'subtaskId é obrigatório.' }, { status: 400 });
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: session.organizationId },
  });

  if (!task) {
    return NextResponse.json({ ok: false, error: 'Tarefa não encontrada.' }, { status: 404 });
  }

  await prisma.taskSubtask.delete({
    where: { id: subtaskId },
  });

  return NextResponse.json({ ok: true, message: 'Subtarefa excluída com sucesso.' });
});
