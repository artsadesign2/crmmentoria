import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, requireSession, withAuth } from '@/lib/auth/session';
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth/jwt';
import { labelToRole, roleToLabel, type DbRole } from '@/lib/auth/roles';
import type { UserRole } from '@/lib/permissions';

/**
 * Simulação de papel, para testar a matriz de permissões.
 *
 * A versão anterior vivia no cliente e permitia que QUALQUER usuário
 * fabricasse um perfil Master e gravasse o cookie correspondente. Aqui a
 * verificação é do servidor, o token expira em 1 hora e carrega `simulatedBy`,
 * para que a interface possa exibir a faixa de aviso e o caminho de volta.
 */

const SIMULATION_MAX_AGE = 60 * 60; // 1 hora

const VALID_ROLES: UserRole[] = ['Master', 'Administrador', 'Editor', 'Cliente', 'Usuário'];

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export const POST = withAuth(async (request: Request) => {
  const session = await requireRole('Master');

  if (session.simulatedBy) {
    return NextResponse.json(
      { ok: false, error: 'Já está em modo simulação. Saia antes de simular outro papel.' },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const role = body.role as UserRole | undefined;
  const userId = typeof body.userId === 'string' ? body.userId : undefined;

  if (!userId && (!role || !VALID_ROLES.includes(role))) {
    return NextResponse.json(
      { ok: false, error: 'Informe um papel válido ou o id do usuário a simular.' },
      { status: 400 }
    );
  }

  // Sempre escopado à organização da sessão: não se simula usuário de outro tenant.
  const target = await prisma.user.findFirst({
    where: {
      organizationId: session.organizationId,
      status: 'ATIVO',
      NOT: { id: session.userId },
      ...(userId ? { id: userId } : { role: labelToRole(role as UserRole) }),
    },
  });

  if (!target) {
    return NextResponse.json(
      {
        ok: false,
        error: userId
          ? 'Usuário não encontrado, inativo, ou é a própria conta.'
          : `Nenhum outro usuário ativo com o papel ${role} nesta organização.`,
      },
      { status: 404 }
    );
  }

  const token = await signSession(
    {
      userId: target.id,
      organizationId: target.organizationId,
      role: target.role as DbRole,
      simulatedBy: session.userId,
    },
    SIMULATION_MAX_AGE
  );

  const response = NextResponse.json({
    ok: true,
    simulating: roleToLabel(target.role as DbRole),
    as: target.name,
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(SIMULATION_MAX_AGE));
  return response;
});

/** Sai da simulação e devolve a sessão ao Master original. */
export const DELETE = withAuth(async () => {
  const session = await requireSession();

  if (!session.simulatedBy) {
    return NextResponse.json({ ok: false, error: 'Não está em modo simulação.' }, { status: 409 });
  }

  const master = await prisma.user.findFirst({
    where: { id: session.simulatedBy, organizationId: session.organizationId, status: 'ATIVO' },
  });

  if (!master) {
    return NextResponse.json(
      { ok: false, error: 'Conta original não encontrada ou inativa. Entre novamente.' },
      { status: 404 }
    );
  }

  const token = await signSession({
    userId: master.id,
    organizationId: master.organizationId,
    role: master.role as DbRole,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_MAX_AGE));
  return response;
});
