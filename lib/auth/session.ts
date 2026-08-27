import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession, type SessionPayload } from './jwt';
import { hasAtLeastRole } from './roles';
import type { UserRole } from '@/lib/permissions';
import { ForbiddenError, UnauthorizedError, isAuthError } from './errors';

/**
 * Lança ForbiddenError quando o papel da sessão tem rank inferior ao mínimo.
 * Função pura e síncrona de propósito: é a única parte testável sem cookies.
 */
export function assertRole(session: SessionPayload, minimum: UserRole): void {
  if (!hasAtLeastRole(session.role, minimum)) {
    throw new ForbiddenError();
  }
}

/** Sessão da requisição atual, ou null quando ausente, expirada ou adulterada. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySession(token) : null;
}

/**
 * Sessão da requisição atual. Lança UnauthorizedError se não houver.
 *
 * REGRA que vale para todas as fases seguintes: toda consulta Prisma escopa
 * por `session.organizationId`, nunca por um id vindo do corpo da requisição
 * ou de query string. É isso que torna o isolamento entre organizações real.
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

/** Sessão da requisição, exigindo rank mínimo. */
export async function requireRole(minimum: UserRole): Promise<SessionPayload> {
  const session = await requireSession();
  assertRole(session, minimum);
  return session;
}

type Handler<C> = (request: Request, context: C) => Promise<Response> | Response;

/**
 * Envolve um Route Handler convertendo UnauthorizedError em 401 e
 * ForbiddenError em 403. Qualquer outra exceção vira 500 sem vazar detalhes
 * internos ao cliente — a mensagem real fica no log do servidor.
 */
export function withAuth<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (isAuthError(error)) {
        return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
      }
      console.error('[withAuth] erro nao tratado:', error);
      return NextResponse.json(
        { ok: false, error: 'Erro interno do servidor.' },
        { status: 500 }
      );
    }
  };
}
