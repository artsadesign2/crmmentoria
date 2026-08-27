import { ROLE_HIERARCHIES, type UserRole } from '@/lib/permissions';

/**
 * Papéis como gravados no banco. Sem acento: enums do PostgreSQL não tratam
 * acentuação de forma confiável entre drivers.
 *
 * A fonte de verdade dos papéis é `lib/permissions.ts`, que a interface inteira
 * já consome. Este módulo é a ponte entre aquele vocabulário e o enum do Prisma.
 */
export type DbRole = 'MASTER' | 'ADMINISTRADOR' | 'EDITOR' | 'CLIENTE' | 'USUARIO';

const DB_TO_LABEL: Record<DbRole, UserRole> = {
  MASTER: 'Master',
  ADMINISTRADOR: 'Administrador',
  EDITOR: 'Editor',
  CLIENTE: 'Cliente',
  USUARIO: 'Usuário',
};

const LABEL_TO_DB = Object.fromEntries(
  Object.entries(DB_TO_LABEL).map(([db, label]) => [label, db])
) as Record<UserRole, DbRole>;

export function roleToLabel(role: DbRole): UserRole {
  return DB_TO_LABEL[role] ?? 'Usuário';
}

export function labelToRole(label: UserRole): DbRole {
  return LABEL_TO_DB[label] ?? 'USUARIO';
}

/** Rank numérico de 1 (Usuário) a 5 (Master), definido em ROLE_HIERARCHIES. */
export function roleRank(role: DbRole): number {
  return ROLE_HIERARCHIES[roleToLabel(role)]?.rank ?? 0;
}

/** Verdadeiro quando `actual` tem rank igual ou superior ao mínimo exigido. */
export function hasAtLeastRole(actual: DbRole, minimum: UserRole): boolean {
  return roleRank(actual) >= (ROLE_HIERARCHIES[minimum]?.rank ?? 0);
}
