import { SignJWT, jwtVerify } from 'jose';
import type { DbRole } from './roles';

export const SESSION_COOKIE = 'rocket_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

/**
 * Payload deliberadamente mínimo. Nome e avatar ficam de fora de propósito:
 * mudariam sem invalidar a sessão. A UI busca esses dados em /api/auth/me.
 */
export interface SessionPayload {
  userId: string;
  organizationId: string;
  role: DbRole;
  /** Id do Master que iniciou a simulação de papel, quando aplicável. */
  simulatedBy?: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET ausente ou com menos de 32 caracteres. Defina-a no ambiente antes de iniciar a aplicação.'
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(
  payload: SessionPayload,
  maxAgeSeconds: number = SESSION_MAX_AGE
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    org: payload.organizationId,
    role: payload.role,
    ...(payload.simulatedBy ? { sim: payload.simulatedBy } : {}),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt(now)
    .setExpirationTime(now + maxAgeSeconds)
    .sign(getSecret());
}

/** Devolve o payload quando a assinatura e a validade conferem; caso contrário, null. */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] });
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.org !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null;
    }
    return {
      userId: payload.sub,
      organizationId: payload.org,
      role: payload.role as DbRole,
      ...(typeof payload.sim === 'string' ? { simulatedBy: payload.sim } : {}),
    };
  } catch {
    return null;
  }
}
