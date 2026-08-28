import { NextResponse } from 'next/server';
import { requireRole, withAuth } from '@/lib/auth/session';
import { drainQueue } from '@/lib/dispatch/worker';

/**
 * Faz a fila andar a partir da tela de disparos.
 *
 * Existe separada de `/api/cron/dispatch` porque as duas se defendem de coisas
 * diferentes: o cron tem `CRON_SECRET`, que o navegador **não pode** conhecer —
 * mandá-lo para o cliente entregaria a chave do endpoint de envio a quem
 * abrisse o inspetor. Aqui a defesa é a sessão, e o papel mínimo é o mesmo de
 * quem pode iniciar uma campanha.
 *
 * Chamar as duas ao mesmo tempo é seguro: a fila reivindica com
 * `FOR UPDATE SKIP LOCKED`.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export const POST = withAuth(async () => {
  await requireRole('Administrador');

  const resultado = await drainQueue();

  return NextResponse.json({ ok: true, ...resultado });
});
