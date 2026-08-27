import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, withAuth } from '@/lib/auth/session';
import { getEffectivePermissions } from '@/lib/auth/permissions-db';
import { roleToLabel, type DbRole } from '@/lib/auth/roles';

/**
 * Usuário da sessão e suas permissões efetivas.
 *
 * O AuthProvider chama esta rota na montagem. Nome e avatar vivem aqui em vez
 * de dentro do JWT justamente para poderem mudar sem invalidar a sessão.
 */
export const GET = withAuth(async () => {
  const session = await requireSession();

  const user = await prisma.user.findFirst({
    where: { id: session.userId, organizationId: session.organizationId },
    include: { department: true, organization: true },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Usuário da sessão não existe mais.' },
      { status: 401 }
    );
  }

  const permissions = await getEffectivePermissions(session.organizationId, user.role as DbRole);

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: roleToLabel(user.role as DbRole),
      phone: user.phone ?? undefined,
      avatar: user.avatarUrl ?? undefined,
      status: user.status,
      department: user.department?.name ?? undefined,
      isPrimaryMaster: user.isPrimaryMaster,
    },
    organization: {
      id: user.organization.id,
      name: user.organization.name,
      slug: user.organization.slug,
    },
    permissions,
    simulatedBy: session.simulatedBy ?? null,
  });
});
