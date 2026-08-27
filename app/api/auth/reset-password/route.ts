import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const INVALID = 'Código inválido ou expirado.';

/** Valida o código de 6 dígitos e grava a nova senha. Código é de uso único. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !code || !password) {
    return NextResponse.json(
      { ok: false, error: 'Informe e-mail, código e nova senha.' },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, error: 'A senha deve ter ao menos 8 caracteres.' },
      { status: 400 }
    );
  }

  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    return NextResponse.json({ ok: false, error: INVALID }, { status: 400 });
  }

  const tokens = await prisma.passwordResetToken.findMany({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  let matchedId: string | null = null;
  for (const token of tokens) {
    if (await bcrypt.compare(code, token.codeHash)) {
      matchedId = token.id;
      break;
    }
  }

  if (!matchedId) {
    return NextResponse.json({ ok: false, error: INVALID }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, updatedAt: new Date() },
    }),
    // Queima todos os códigos pendentes, não só o usado.
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
