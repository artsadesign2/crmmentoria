import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireSession, requireRole, withAuth } from '@/lib/auth/session';
import { roleToLabel, labelToRole, roleRank, type DbRole } from '@/lib/auth/roles';
import type { UserRole } from '@/lib/permissions';
import { ForbiddenError } from '@/lib/auth/errors';

export const GET = withAuth(async () => {
  const session = await requireSession();

  const users = await prisma.user.findMany({
    where: { organizationId: session.organizationId },
    include: { department: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    ok: true,
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: roleToLabel(user.role as DbRole),
      phone: user.phone ?? undefined,
      avatar: user.avatarUrl ?? undefined,
      status: user.status,
      department: user.department?.name ?? undefined,
      isPrimaryMaster: user.isPrimaryMaster,
      lastActive: user.lastActiveAt?.toISOString(),
    })),
  });
});

export const POST = withAuth(async (request: Request) => {
  const session = await requireRole('Administrador');
  const body = await request.json().catch(() => ({}));

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const role = typeof body.role === 'string' ? (body.role as UserRole) : undefined;

  if (!name || !email || !password || !role) {
    return NextResponse.json(
      { ok: false, error: 'Preencha nome, e-mail, senha e papel.' },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, error: 'A senha deve ter ao menos 8 caracteres.' },
      { status: 400 }
    );
  }

  const targetRole = labelToRole(role);
  if (roleRank(targetRole) > roleRank(session.role)) {
    throw new ForbiddenError('Você não pode criar um usuário com papel superior ao seu.');
  }

  const exists = await prisma.user.findUnique({
    where: { organizationId_email: { organizationId: session.organizationId, email } },
  });
  if (exists) {
    return NextResponse.json(
      { ok: false, error: 'Já existe um usuário com este e-mail nesta organização.' },
      { status: 409 }
    );
  }

  const user = await prisma.user.create({
    data: {
      organizationId: session.organizationId,
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: targetRole,
      phone: typeof body.phone === 'string' ? body.phone : null,
    },
  });

  return NextResponse.json({ ok: true, id: user.id }, { status: 201 });
});
