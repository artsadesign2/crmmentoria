import { NextResponse } from 'next/server';
import { getSession } from './session';
import { hasAtLeastRole } from './roles';
import type { SessionPayload } from './jwt';
import type { UserRole } from '@/lib/permissions';

/**
 * Guard de uma linha para Route Handlers que já existiam antes da F0.
 *
 * Devolve `{ session }` quando a requisição está autorizada, ou `{ response }`
 * com o erro pronto. Existe para proteger handlers sem reescrevê-los:
 *
 *   const auth = await guard();
 *   if (auth.response) return auth.response;
 *   // auth.session.organizationId disponível a partir daqui
 *
 * O middleware já barra requisições sem sessão. Isto é defesa em profundidade:
 * se o matcher mudar por engano, as rotas continuam fechadas.
 */
export async function guard(
  minimum?: UserRole
): Promise<{ session: SessionPayload; response?: never } | { session?: never; response: NextResponse }> {
  const session = await getSession();

  if (!session) {
    return {
      response: NextResponse.json(
        { ok: false, error: 'Sessão inválida ou expirada.' },
        { status: 401 }
      ),
    };
  }

  if (minimum && !hasAtLeastRole(session.role, minimum)) {
    return {
      response: NextResponse.json(
        { ok: false, error: 'Você não tem permissão para esta ação.' },
        { status: 403 }
      ),
    };
  }

  return { session };
}
