import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth/jwt';
import type { DbRole } from '@/lib/auth/roles';

/**
 * Mensagem única para e-mail inexistente e senha errada. Distinguir os dois
 * casos entregaria a um atacante a lista de e-mails válidos do sistema.
 */
const INVALID = 'E-mail ou senha incorretos. Por favor, verifique suas credenciais.';

/** Hash descartável usado quando o e-mail não existe, para manter o tempo de resposta constante. */
const DUMMY_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: INVALID }, { status: 400 });
  }

  const user = await prisma.user.findFirst({ where: { email } });

  // Comparação acontece mesmo sem usuário, para não vazar existência por timing.
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !valid) {
    return NextResponse.json({ ok: false, error: INVALID }, { status: 401 });
  }

  if (user.status !== 'ATIVO') {
    return NextResponse.json(
      { ok: false, error: 'Esta conta está inativa ou bloqueada. Fale com um administrador.' },
      { status: 403 }
    );
  }

  const token = await signSession({
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role as DbRole,
  });

  await prisma.user
    .update({ where: { id: user.id }, data: { lastActiveAt: new Date() } })
    .catch((error) => console.error('[login] falha ao gravar lastActiveAt:', error));

  const response = NextResponse.json({ ok: true, userId: user.id });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}
