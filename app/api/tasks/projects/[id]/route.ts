import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, withAuth } from '@/lib/auth/session';

interface Params {
  params: Promise<{ id: string }>;
}

export const GET = withAuth(async (_req: Request, { params }: Params) => {
  const session = await requireSession();
  const { id } = await params;

  const project = await prisma.taskProject.findFirst({
    where: { id, organizationId: session.organizationId, isArchived: false },
    include: {
      columns: { orderBy: { position: 'asc' } },
      tasks: {
        where: { isArchived: false },
        orderBy: { position: 'asc' },
        include: {
          subtasks: { orderBy: { position: 'asc' } },
          assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
          _count: { select: { comments: true } },
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ ok: false, error: 'Projeto não encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, project });
});

export const PUT = withAuth(async (request: Request, { params }: Params) => {
  const session = await requireSession();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const existing = await prisma.taskProject.findFirst({
    where: { id, organizationId: session.organizationId },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Projeto não encontrado.' }, { status: 404 });
  }

  const updated = await prisma.taskProject.update({
    where: { id },
    data: {
      name: typeof body.name === 'string' ? body.name.trim() : undefined,
      description: typeof body.description === 'string' ? body.description.trim() : undefined,
      icon: typeof body.icon === 'string' ? body.icon : undefined,
      colorHex: typeof body.colorHex === 'string' ? body.colorHex : undefined,
      isArchived: typeof body.isArchived === 'boolean' ? body.isArchived : undefined,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, project: updated });
});

export const DELETE = withAuth(async (_req: Request, { params }: Params) => {
  const session = await requireSession();
  const { id } = await params;

  const existing = await prisma.taskProject.findFirst({
    where: { id, organizationId: session.organizationId },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Projeto não encontrado.' }, { status: 404 });
  }

  // Soft-archive para segurança de dados
  await prisma.taskProject.update({
    where: { id },
    data: { isArchived: true, updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true, message: 'Projeto arquivado com sucesso.' });
});
