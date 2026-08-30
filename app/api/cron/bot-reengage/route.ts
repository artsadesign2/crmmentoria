import { NextResponse } from 'next/server';
import { varrerParadas } from '@/lib/bot/sweep';
import { verifyCronSecret } from '@/lib/dispatch/cron-auth';

/**
 * Procura leads parados e devolve cada um ao atendimento.
 *
 * O gatilho normal da retomada é o cliente escrever de novo — e esse caminho
 * não precisa de cron nenhum, roda no webhook. Este endpoint existe para o
 * outro caso, que é o pior: o lead que escreveu uma vez, foi ignorado e
 * desistiu de insistir. Ele nunca produz um webhook, e por isso ninguém o
 * encontra a não ser procurando.
 *
 * Mesmo segredo e mesmo formato do `/api/cron/dispatch`, pelo mesmo motivo:
 * qualquer agendador serve, e a arquitetura não depende do plano da Vercel.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function executar(request: Request) {
  if (!verifyCronSecret(request)) {
    console.warn('[cron/bot-reengage] segredo invalido ou ausente; nada varrido.');
    return NextResponse.json({ ok: false, error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const resultado = await varrerParadas();

    if (resultado.retomadas > 0) {
      console.log(
        `[cron/bot-reengage] ${resultado.retomadas} conversa(s) devolvida(s) a fila, ` +
          `${resultado.abordadas} com mensagem do robo, de ${resultado.examinadas} examinada(s).`
      );
    }

    return NextResponse.json({ ok: true, ...resultado });
  } catch (error) {
    console.error('[cron/bot-reengage] falha ao varrer conversas paradas:', error);
    return NextResponse.json(
      { ok: false, error: 'Falha ao varrer as conversas paradas.' },
      { status: 500 }
    );
  }
}

/** O Vercel Cron chama por GET. */
export async function GET(request: Request) {
  return executar(request);
}

/** Crons externos costumam usar POST. */
export async function POST(request: Request) {
  return executar(request);
}
