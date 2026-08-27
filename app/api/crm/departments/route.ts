import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, withAuth } from '@/lib/auth/session';

/**
 * Setores da organização, para o seletor de transferência do Inbox.
 *
 * Só id e nome: o Inbox não precisa de mais, e devolver a linha inteira
 * exporia campos sem motivo.
 */
export const GET = withAuth(async () => {
  const session = await requireSession();

  const departments = await prisma.department.findMany({
    where: { organizationId: session.organizationId },
    select: { id: true, name: true, isDefaultInbox: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ ok: true, departments });
});
