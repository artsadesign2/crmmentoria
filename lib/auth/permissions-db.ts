import { prisma } from '@/lib/prisma';
import { DEFAULT_ROLE_PERMISSIONS, type RolePermissions, type UserRole } from '@/lib/permissions';
import { roleToLabel, labelToRole, type DbRole } from './roles';

/**
 * Permissões efetivas de um papel na organização.
 *
 * Cai no padrão de lib/permissions.ts quando a organização ainda não
 * personalizou a matriz, para que a aplicação nunca fique sem permissões.
 */
export async function getEffectivePermissions(
  organizationId: string,
  role: DbRole
): Promise<RolePermissions> {
  const row = await prisma.rolePermission.findUnique({
    where: { organizationId_role: { organizationId, role } },
  });

  return (row?.permissions as RolePermissions | undefined) ?? DEFAULT_ROLE_PERMISSIONS[roleToLabel(role)];
}

/** Matriz completa da organização, com os padrões preenchendo o que faltar. */
export async function getRolePermissionMatrix(
  organizationId: string
): Promise<Record<UserRole, RolePermissions>> {
  const rows = await prisma.rolePermission.findMany({ where: { organizationId } });
  const matrix = { ...DEFAULT_ROLE_PERMISSIONS };

  for (const row of rows) {
    matrix[roleToLabel(row.role as DbRole)] = row.permissions as unknown as RolePermissions;
  }

  return matrix;
}

/** Grava a matriz de um papel. Usada pela tela de configurações. */
export async function saveRolePermissions(
  organizationId: string,
  label: UserRole,
  permissions: RolePermissions
): Promise<void> {
  const role = labelToRole(label);
  await prisma.rolePermission.upsert({
    where: { organizationId_role: { organizationId, role } },
    update: { permissions: permissions as object },
    create: { organizationId, role, permissions: permissions as object },
  });
}
