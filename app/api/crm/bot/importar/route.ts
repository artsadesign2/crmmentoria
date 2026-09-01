import { NextResponse } from 'next/server';
import { requireRole, withAuth } from '@/lib/auth/session';
import { importarGrafo } from '@/lib/bot/import';
import { getFlow, saveFlow } from '@/lib/bot/flows';
import { BotError } from '@/lib/bot/types';

/**
 * Cria um fluxo a partir de um JSON.
 *
 * A porta de entrada de tudo que não foi desenhado no canvas: arquivo
 * exportado de outra empresa, fluxo versionado em git, JSON escrito à mão, e o
 * que a IA gerou em `/gerar` — que chega aqui igual aos outros, de propósito.
 *
 * Nasce em DRAFT, sempre. Um fluxo importado já publicado passaria a atender
 * clientes no instante em que alguém colasse um arquivo, sem ninguém ter lido
 * uma frase do que o robô vai dizer.
 */
export const POST = withAuth(async (request: Request) => {
  const session = await requireRole('Master');

  const corpo = (await request.json().catch(() => null)) as {
    name?: unknown;
    graph?: unknown;
    json?: unknown;
  } | null;

  if (!corpo) {
    return NextResponse.json({ ok: false, error: 'Corpo inválido.' }, { status: 400 });
  }

  // Aceita `graph` (objeto já lido) e `json` (texto colado). A tela manda o
  // texto cru para o servidor devolver o erro de sintaxe com posição.
  let cru: unknown = corpo.graph;

  if (typeof corpo.json === 'string') {
    try {
      cru = JSON.parse(corpo.json);
    } catch (erro) {
      return NextResponse.json(
        {
          ok: false,
          error: `O texto não é um JSON válido: ${(erro as Error).message}`,
        },
        { status: 400 }
      );
    }
  }

  const resultado = importarGrafo(cru);

  if (!resultado.ok) {
    return NextResponse.json(
      { ok: false, error: resultado.erros[0], erros: resultado.erros },
      { status: 422 }
    );
  }

  const nome =
    typeof corpo.name === 'string' && corpo.name.trim()
      ? corpo.name.trim()
      : nomeDoArquivo(cru);

  try {
    const salvo = await saveFlow(session, { name: nome, graph: resultado.grafo });
    const flow = await getFlow(session, salvo.id);

    return NextResponse.json(
      { ok: true, flow, avisos: resultado.avisos },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof BotError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
    }
    throw error;
  }
});

/** O nome que veio dentro do arquivo, quando a tela não mandou um. */
function nomeDoArquivo(cru: unknown): string {
  if (cru && typeof cru === 'object' && 'name' in cru) {
    const nome = (cru as { name?: unknown }).name;
    if (typeof nome === 'string' && nome.trim()) return nome.trim().slice(0, 200);
  }
  return 'Fluxo importado';
}
