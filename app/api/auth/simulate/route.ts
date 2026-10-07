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
  const memberId = typeof body.memberId === 'string' ? body.memberId : undefined;

  let targetUser = null;

  // 1. Simulação direcionada por memberId (da tabela de mentorados)
  if (memberId) {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return NextResponse.json(
        { ok: false, error: 'Mentorado não encontrado.' },
        { status: 404 }
      );
    }

    // Busca se já existe um usuário com esse email ou cria um vinculado
    const memberEmail = member.email && member.email.includes('@')
      ? member.email.trim().toLowerCase()
      : `mentorado.${member.id.slice(0, 8)}@rocketclub.com.br`;

    targetUser = await prisma.user.findFirst({
      where: {
        organizationId: session.organizationId,
        email: memberEmail,
      },
    });

    if (!targetUser) {
      targetUser = await prisma.user.create({
        data: {
          organizationId: session.organizationId,
          name: member.name,
          email: memberEmail,
          passwordHash: '$2a$10$e7xQ7gY9fGqQk7x6bS9/8.vX57n47sW8X1v9K2s.Qk3uYq9w1v8X2', // dummy bcrypt hash
          role: 'CLIENTE',
          phone: member.phone || null,
          avatarUrl: member.cover_image || null,
          status: 'ATIVO',
        },
      });
    }
  } else if (userId) {
    // 2. Simulação direcionada por userId
    targetUser = await prisma.user.findFirst({
      where: {
        organizationId: session.organizationId,
        id: userId,
        status: 'ATIVO',
        NOT: { id: session.userId },
      },
    });
  } else if (role && VALID_ROLES.includes(role)) {
    // 3. Simulação por papel (ex: 'Cliente', 'Administrador', etc.)
    const dbRole = labelToRole(role);
    targetUser = await prisma.user.findFirst({
      where: {
        organizationId: session.organizationId,
        role: dbRole,
        status: 'ATIVO',
        NOT: { id: session.userId },
      },
    });

    // Se pediu 'Cliente' e ainda não havia nenhum usuário cadastrado com esse papel,
    // busca o primeiro mentorado da tabela Member ou cria um perfil demo ativo.
    if (!targetUser && role === 'Cliente') {
      const firstMember = await prisma.member.findFirst({
        orderBy: { created_at: 'asc' },
      });

      if (firstMember) {
        const email = firstMember.email && firstMember.email.includes('@')
          ? firstMember.email.trim().toLowerCase()
          : `mentorado.${firstMember.id.slice(0, 8)}@rocketclub.com.br`;

        targetUser = await prisma.user.create({
          data: {
            organizationId: session.organizationId,
            name: firstMember.name,
            email,
            passwordHash: '$2a$10$e7xQ7gY9fGqQk7x6bS9/8.vX57n47sW8X1v9K2s.Qk3uYq9w1v8X2',
            role: 'CLIENTE',
            phone: firstMember.phone || null,
            avatarUrl: firstMember.cover_image || null,
            status: 'ATIVO',
          },
        });
      } else {
        targetUser = await prisma.user.create({
          data: {
            organizationId: session.organizationId,
            name: 'Carlos Eduardo Silva (Mentorado VIP)',
            email: 'carlos.mentorado@rocketclub.com.br',
            passwordHash: '$2a$10$e7xQ7gY9fGqQk7x6bS9/8.vX57n47sW8X1v9K2s.Qk3uYq9w1v8X2',
            role: 'CLIENTE',
            phone: '(11) 98765-4321',
            status: 'ATIVO',
          },
        });
      }
    }
  } else {
    return NextResponse.json(
      { ok: false, error: 'Informe um papel válido, userId ou memberId a simular.' },
      { status: 400 }
    );
  }

  if (!targetUser) {
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
      userId: targetUser.id,
      organizationId: targetUser.organizationId,
      role: targetUser.role as DbRole,
      simulatedBy: session.userId,
    },
    SIMULATION_MAX_AGE
  );

  const response = NextResponse.json({
    ok: true,
    simulating: roleToLabel(targetUser.role as DbRole),
    as: targetUser.name,
    userId: targetUser.id,
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
