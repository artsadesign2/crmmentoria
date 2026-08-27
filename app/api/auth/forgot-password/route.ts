import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendEmail, isEmailConfigured } from '@/lib/email';
import { passwordResetEmail } from '@/lib/email/templates';

const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutos

/**
 * Gera o código de 6 dígitos da recuperação de senha.
 *
 * A resposta é sempre idêntica, exista ou não o e-mail: caso contrário esta
 * rota vira um oráculo para descobrir quais e-mails estão cadastrados.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!email) {
    return NextResponse.json({ ok: false, error: 'Informe um e-mail.' }, { status: 400 });
  }

  const generic = NextResponse.json({
    ok: true,
    message: 'Se este e-mail estiver cadastrado, o código de verificação foi enviado.',
  });

  const user = await prisma.user.findFirst({ where: { email } });
  if (!user || user.status !== 'ATIVO') return generic;

  // randomInt usa CSPRNG; Math.random seria previsível o bastante para ataque.
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');

  // Invalida códigos anteriores: só o mais recente vale.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      codeHash: await bcrypt.hash(code, 10),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });

  const { subject, html, text } = passwordResetEmail(code, user.name ?? '');
  const envio = await sendEmail({ to: user.email, subject, html, text });

  // A falha de envio vai para o log e a resposta não muda. Distinguir "enviei"
  // de "não consegui enviar" reabriria o oráculo que o retorno genérico fecha:
  // quem tenta um e-mail inexistente receberia uma resposta diferente de quem
  // acerta um cadastrado.
  if (!envio.ok) {
    console.error(`[forgot-password] falha ao enviar para ${user.email}: ${envio.error}`);
    // Sem provedor configurado, o código ainda precisa sair em algum lugar —
    // caso contrário a recuperação de senha fica impossível em desenvolvimento.
    if (!isEmailConfigured()) {
      console.warn(`[forgot-password] codigo para ${user.email}: ${code}`);
    }
  }

  return generic;
}
