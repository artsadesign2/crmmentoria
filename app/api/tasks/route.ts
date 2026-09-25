import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, withAuth } from '@/lib/auth/session';
import { sendTaskNotificationEmail } from '@/lib/tasks/task-notifications';

export const GET = withAuth(async (request: Request) => {
  const session = await requireSession();
  const url = new URL(request.url);

  const projectId = url.searchParams.get('projectId');
  const assignedToId = url.searchParams.get('assignedToId');
  const priority = url.searchParams.get('priority');
  const search = url.searchParams.get('search')?.trim();
  const filter = url.searchParams.get('filter'); // 'today' | 'overdue' | 'upcoming' | 'completed' | 'my_tasks'

  const where: any = {
    organizationId: session.organizationId,
    isArchived: false,
  };

  if (projectId) where.projectId = projectId;
  if (priority) where.priority = priority;
  if (assignedToId) where.assignedToId = assignedToId;

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (filter === 'my_tasks') {
    where.assignedToId = session.userId;
  } else if (filter === 'today') {
    where.dueDate = { gte: todayStart, lte: todayEnd };
    where.completedAt = null;
  } else if (filter === 'overdue') {
    where.dueDate = { lt: todayStart };
    where.completedAt = null;
  } else if (filter === 'upcoming') {
    where.dueDate = { gte: todayStart, lte: next7Days };
    where.completedAt = null;
  } else if (filter === 'completed') {
    where.completedAt = { not: null };
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    include: {
      project: { select: { id: true, name: true, colorHex: true, icon: true } },
      column: { select: { id: true, name: true, colorHex: true, isCompletedColumn: true } },
      assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
      subtasks: { orderBy: { position: 'asc' } },
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json({ ok: true, tasks });
});

export const POST = withAuth(async (request: Request) => {
  const session = await requireSession();
  const body = await request.json().catch(() => ({}));

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const projectId = typeof body.projectId === 'string' ? body.projectId : '';
  const columnId = typeof body.columnId === 'string' ? body.columnId : '';

  if (!title) {
    return NextResponse.json({ ok: false, error: 'O título da tarefa é obrigatório.' }, { status: 400 });
  }

  // Se projectId ou columnId não forem fornecidos, pega o projeto e primeira coluna padrão
  let finalProjectId = projectId;
  let finalColumnId = columnId;

  if (!finalProjectId || !finalColumnId) {
    const defaultProject = await prisma.taskProject.findFirst({
      where: { organizationId: session.organizationId, isArchived: false },
      include: { columns: { orderBy: { position: 'asc' }, take: 1 } },
    });

    if (!defaultProject || defaultProject.columns.length === 0) {
      return NextResponse.json({ ok: false, error: 'Crie um projeto antes de adicionar tarefas.' }, { status: 400 });
    }

    finalProjectId = defaultProject.id;
    finalColumnId = defaultProject.columns[0].id;
  }

  // Verifica se a coluna destino é de conclusão
  const targetCol = await prisma.taskColumn.findUnique({ where: { id: finalColumnId } });
  const isCompleted = targetCol?.isCompletedColumn ?? false;

  // Próxima posição
  const lastTask = await prisma.task.findFirst({
    where: { projectId: finalProjectId, columnId: finalColumnId },
    orderBy: { position: 'desc' },
  });
  const position = (lastTask?.position ?? -1) + 1;

  const task = await prisma.task.create({
    data: {
      organizationId: session.organizationId,
      projectId: finalProjectId,
      columnId: finalColumnId,
      title,
      description: typeof body.description === 'string' ? body.description.trim() : null,
      priority: ['URGENTE', 'ALTA', 'MEDIA', 'BAIXA'].includes(body.priority) ? body.priority : 'MEDIA',
      position,
      startDate: body.startDate ? new Date(body.startDate) : null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      assignedToId: body.assignedToId || null,
      createdById: session.userId,
      completedAt: isCompleted ? new Date() : null,
      subtasks: {
        create: Array.isArray(body.subtasks)
          ? body.subtasks.map((st: any, idx: number) => ({
              title: typeof st === 'string' ? st : st.title || `Item ${idx + 1}`,
              position: idx,
            }))
          : [],
      },
    },
    include: {
      project: { select: { id: true, name: true, colorHex: true } },
      column: { select: { id: true, name: true, colorHex: true, isCompletedColumn: true } },
      assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
      subtasks: { orderBy: { position: 'asc' } },
      _count: { select: { comments: true } },
    },
  });

  // Notifica o responsável por e-mail se foi atribuído
  if (task.assignedTo && task.assignedTo.email) {
    const creator = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } });
    sendTaskNotificationEmail({
      to: task.assignedTo.email,
      recipientName: task.assignedTo.name,
      type: 'ASSIGNED',
      taskTitle: task.title,
      projectName: task.project.name,
      priority: task.priority,
      authorName: creator?.name || 'Equipe',
      dueDateFormatted: task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : undefined,
    }).catch((err) => console.error('[Task Created] Erro ao enviar email:', err));
  }

  return NextResponse.json({ ok: true, task }, { status: 201 });
});
