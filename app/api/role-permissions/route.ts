import { NextResponse } from 'next/server';
import { requireSession, requireRole, withAuth } from '@/lib/auth/session';
import {
  getRolePermissionMatrix,
  saveRolePermissions,
} from '@/lib/auth/permissions-db';
import { DEFAULT_ROLE_PERMISSIONS, type UserRole, type RolePermissions } from '@/lib/permissions';

const VALID_ROLES: UserRole[] = ['Master', 'Administrador', 'Editor', 'Cliente', 'Usuário'];

export const GET = withAuth(async () => {
  const session = await requireSession();
  return NextResponse.json({
    ok: true,
    rolePermissions: await getRolePermissionMatrix(session.organizationId),
  });
});

/** Grava a matriz de um papel. Só o Master mexe em permissões. */
export const PATCH = withAuth(async (request: Request) => {
  const session = await requireRole('Master');
  const body = await request.json().catch(() => ({}));

  const role = body.role as UserRole;
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ ok: false, error: 'Papel inválido.' }, { status: 400 });
  }
  if (typeof body.permissions !== 'object' || body.permissions === null) {
    return NextResponse.json({ ok: false, error: 'Permissões inválidas.' }, { status: 400 });
  }

  await saveRolePermissions(session.organizationId, role, body.permissions as RolePermissions);

  return NextResponse.json({ ok: true });
});

/** Restaura todos os papéis para o padrão de lib/permissions.ts. */
export const DELETE = withAuth(async () => {
  const session = await requireRole('Master');

  for (const [label, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    await saveRolePermissions(session.organizationId, label as UserRole, permissions);
  }

  return NextResponse.json({ ok: true, rolePermissions: DEFAULT_ROLE_PERMISSIONS });
});
