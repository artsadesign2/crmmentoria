import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, withAuth } from '@/lib/auth/session';
import { ensureDefaultProject, DEFAULT_COLUMNS } from '@/lib/tasks/project-service';

export const GET = withAuth(async () => {
  const session = await requireSession();
  
  // Garante que o projeto padrão exista
  await ensureDefaultProject(session.organizationId, session.userId);

  const projects = await prisma.taskProject.findMany({
    where: { organizationId: session.organizationId, isArchived: false },
    orderBy: { createdAt: 'asc' },
    include: {
      columns: { orderBy: { position: 'asc' } },
      _count: {
        select: {
          tasks: { where: { isArchived: false } },
        },
      },
      tasks: {
        where: { isArchived: false },
        select: {
          id: true,
          completedAt: true,
          dueDate: true,
          priority: true,
        },
      },
    },
  });

  const formatted = projects.map((p) => {
    const totalTasks = p.tasks.length;
    const completedTasks = p.tasks.filter((t) => t.completedAt !== null).length;
    const overdueTasks = p.tasks.filter(
      (t) => !t.completedAt && t.dueDate && new Date(t.dueDate) < new Date()
    ).length;

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      icon: p.icon,
      colorHex: p.colorHex,
      columns: p.columns,
      totalTasks,
      completedTasks,
      overdueTasks,
      progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      createdAt: p.createdAt,
    };
  });

  return NextResponse.json({ ok: true, projects: formatted });
});

export const POST = withAuth(async (request: Request) => {
  const session = await requireSession();
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!name) {
    return NextResponse.json({ ok: false, error: 'O nome do projeto é obrigatório.' }, { status: 400 });
  }

  const project = await prisma.taskProject.create({
    data: {
      organizationId: session.organizationId,
      name,
      description: typeof body.description === 'string' ? body.description.trim() : null,
      icon: typeof body.icon === 'string' ? body.icon : 'folder',
      colorHex: typeof body.colorHex === 'string' ? body.colorHex : '#EAB308',
      createdById: session.userId,
      columns: {
        create: (Array.isArray(body.columns) && body.columns.length > 0 ? body.columns : DEFAULT_COLUMNS).map(
          (col: any, idx: number) => ({
            name: col.name || `Coluna ${idx + 1}`,
            colorHex: col.colorHex || '#64748B',
            position: idx,
            isCompletedColumn: Boolean(col.isCompletedColumn),
          })
        ),
      },
    },
    include: {
      columns: { orderBy: { position: 'asc' } },
    },
  });

  return NextResponse.json({ ok: true, project }, { status: 201 });
});
