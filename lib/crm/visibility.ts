import { hasAtLeastRole } from '@/lib/auth/roles';
import type { SessionPayload } from '@/lib/auth/jwt';

/**
 * Privacidade de atendimento do Módulo 3 do PRD:
 * "Admin visualiza tudo; Atendente visualiza apenas seus leads atribuídos."
 *
 * A regra é aplicada na consulta, não na interface. Filtrar no cliente não é
 * privacidade — os dados já teriam saído do servidor.
 */

export interface DealVisibilityFilter {
  organizationId: string;
  OR?: Array<{ assignedUserId: string | null; isPrivate?: boolean }>;
}

/** Verdadeiro para quem tem rank de Administrador para cima. */
export function canSeeAllDeals(session: SessionPayload): boolean {
  return hasAtLeastRole(session.role, 'Administrador');
}

/**
 * Cláusula `where` para consultas de oportunidades.
 *
 * O escopo de organização está presente em todos os casos — é o que impede
 * um tenant de enxergar os dados de outro, e nunca deve ser condicional.
 */
export function dealVisibilityFilter(session: SessionPayload): DealVisibilityFilter {
  if (canSeeAllDeals(session)) {
    return { organizationId: session.organizationId };
  }

  return {
    organizationId: session.organizationId,
    OR: [
      // O que é meu, privado ou não.
      { assignedUserId: session.userId },
      // O que está na fila sem responsável — exceto se marcado como privado.
      { assignedUserId: null, isPrivate: false },
    ],
  };
}
