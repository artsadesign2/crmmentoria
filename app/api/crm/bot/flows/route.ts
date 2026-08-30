import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { listFlows, saveFlow } from '@/lib/bot/flows';
import { asGraph, BotError, GRAFO_VAZIO } from '@/lib/bot/types';

/**
 * Os fluxos de atendimento automático.
 *
 * Ler é de qualquer atendente: quem atende precisa saber o que o robô anda
 * dizendo aos clientes dele. Escrever é de Administrador para cima, e essa
 * checagem vive no serviço (`saveFlow`), não aqui — assim ela vale também para
 * quem chamar de outro lugar.
 */

export const GET = withAuth(async () => {
  const session = await requireSession();
  const flows = await listFlows(session);

  return NextResponse.json({ ok: true, flows });
});

export const POST = withAuth(async (request: Request) => {
  const session = await requireSession();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    const flow = await saveFlow(session, {
      name: typeof body.name === 'string' ? body.name : '',
      // Fluxo novo costuma nascer vazio: o canvas desenha depois.
      graph: body.graph === undefined ? GRAFO_VAZIO : asGraph(body.graph),
    });

    return NextResponse.json({ ok: true, flow }, { status: 201 });
  } catch (error) {
    if (error instanceof BotError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    throw error;
  }
});
