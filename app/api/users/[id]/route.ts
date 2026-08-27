import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireRole, withAuth } from '@/lib/auth/session';
import { labelToRole, roleRank, type DbRole } from '@/lib/auth/roles';
import type { UserRole } from '@/lib/permissions';
import { ForbiddenError } from '@/lib/auth/errors';

type Ctx = { params: Promise<{ id: string }> };

const VALID_STATUS = ['ATIVO', 'INATIVO', 'BLOQUEADO'];

/**
 * Carrega o alvo garantindo que ele pertence à organização da sessão.
 * Sem esta checagem, um Admin de uma organização poderia editar usuários de outra.
 */
async function loadTarget(organizationId: string, id: string) {
  const target = await prisma.user.findFirst({ where: { id, organizationId } });
  if (!target) throw new ForbiddenError('Usuário não encontrado nesta organização.');
  return target;
}

export const PATCH = withAuth<Ctx>(async (request, { params }) => {
  const session = await requireRole('Administrador');
  const { id } = await params;
  const target = await loadTarget(session.organizationId, id);

  if (roleRank(target.role as DbRole) > roleRank(session.role)) {
    throw new ForbiddenError('Você não pode editar um usuário de papel superior ao seu.');
  }

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (typeof body.phone === 'string') data.phone = body.phone;
  if (typeof body.avatar === 'string') data.avatarUrl = body.avatar;

  if (typeof body.status === 'string') {
    if (!VALID_STATUS.includes(body.status)) {
      return NextResponse.json({ ok: false, error: 'Status inválido.' }, { status: 400 });
    }
    if (target.isPrimaryMaster && body.status !== 'ATIVO') {
      throw new ForbiddenError('O Master principal não pode ser desativado.');
    }
    data.status = body.status;
  }

  if (typeof body.password === 'string' && body.password) {
    if (body.password.length < 8) {
      return NextResponse.json(
        { ok: false, error: 'A senha deve ter ao menos 8 caracteres.' },
        { status: 400 }
      );
    }
    data.passwordHash = await bcrypt.hash(body.password, 10);
  }

  if (typeof body.role === 'string') {
    const newRole = labelToRole(body.role as UserRole);
    if (roleRank(newRole) > roleRank(session.role)) {
      throw new ForbiddenError('Você não pode atribuir um papel superior ao seu.');
    }
    if (target.isPrimaryMaster && newRole !== 'MASTER') {
      throw new ForbiddenError('O Master principal não pode ter o papel alterado.');
    }
    data.role = newRole;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: 'Nada para atualizar.' }, { status: 400 });
  }

  data.updatedAt = new Date();
  await prisma.user.update({ where: { id }, data });

  return NextResponse.json({ ok: true });
});

export const DELETE = withAuth<Ctx>(async (_request, { params }) => {
  const session = await requireRole('Administrador');
  const { id } = await params;
  const target = await loadTarget(session.organizationId, id);

  if (target.isPrimaryMaster) {
    throw new ForbiddenError('O Master principal não pode ser excluído.');
  }
  if (target.id === session.userId) {
    throw new ForbiddenError('Você não pode excluir a própria conta.');
  }
  if (roleRank(target.role as DbRole) > roleRank(session.role)) {
    throw new ForbiddenError('Você não pode excluir um usuário de papel superior ao seu.');
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
});
