import { NextResponse } from 'next/server';
import { drainQueue } from '@/lib/dispatch/worker';
import { verifyCronSecret } from '@/lib/dispatch/cron-auth';

/**
 * Endpoint que faz a fila andar.
 *
 * Endpoint com segredo, e não um cron amarrado a um plano: qualquer agendador
 * serve — Vercel Cron, cron externo, ou a própria tela do disparo enquanto
 * está aberta. Isso mantém o disparo funcionando no plano Hobby, onde o cron
 * roda uma vez por dia, sem que a arquitetura dependa disso.
 *
 * Chamadas simultâneas são seguras: a reivindicação do lote usa
 * `FOR UPDATE SKIP LOCKED`, então a segunda chamada pula o que a primeira já
 * pegou em vez de mandar a mensagem duas vezes.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function executar(request: Request) {
  if (!verifyCronSecret(request)) {
    // 401 seco, sem dizer se o segredo existe no ambiente: a diferença entre
    // "não configurado" e "errado" é informação útil para quem tenta adivinhar.
    console.warn('[cron/dispatch] segredo invalido ou ausente; fila nao processada.');
    return NextResponse.json({ ok: false, error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const resultado = await drainQueue();

    if (resultado.processed > 0) {
      console.log(
        `[cron/dispatch] ${resultado.sent} enviada(s), ${resultado.failed} falha(s), ` +
          `${resultado.remaining} na fila.`
      );
    }

    return NextResponse.json({ ok: true, ...resultado });
  } catch (error) {
    console.error('[cron/dispatch] falha ao processar a fila:', error);
    return NextResponse.json(
      { ok: false, error: 'Falha ao processar a fila de disparo.' },
      { status: 500 }
    );
  }
}

/** O Vercel Cron chama por GET. */
export async function GET(request: Request) {
  return executar(request);
}

/** A tela do disparo e crons externos costumam usar POST. */
export async function POST(request: Request) {
  return executar(request);
}
