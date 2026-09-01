import { NextResponse } from 'next/server';
import { requireRole, withAuth } from '@/lib/auth/session';
import { deleteFlow, getFlow, saveFlow } from '@/lib/bot/flows';
import { asGraph, BotError } from '@/lib/bot/types';

type Ctx = { params: Promise<{ id: string }> };

/**
 * 404 cobre "não existe" e "é de outra organização" com a mesma resposta.
 * Distinguir os dois confirmaria a existência de fluxos alheios.
 */
const NAO_ENCONTRADO = NextResponse.json(
  { ok: false, error: 'Fluxo não encontrado.' },
  { status: 404 }
);

/** O fluxo com o rascunho e a validação já feita, para o canvas abrir. */
export const GET = withAuth<Ctx>(async (_request, { params }) => {
  const session = await requireRole('Master');
  const { id } = await params;

  const flow = await getFlow(session, id);
  if (!flow) return NAO_ENCONTRADO;

  return NextResponse.json({ ok: true, flow });
});

/**
 * Salva o rascunho.
 *
 * Nunca mexe na versão publicada, mesmo com o fluxo no ar: é o que permite
 * editar enquanto clientes conversam por ele. O que muda só vale depois de
 * alguém apertar publicar.
 */
export const PATCH = withAuth<Ctx>(async (request, { params }) => {
  const session = await requireRole('Master');
  const { id } = await params;

  const atual = await getFlow(session, id);
  if (!atual) return NAO_ENCONTRADO;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    const flow = await saveFlow(session, {
      id,
      // Campo ausente mantém o que está lá. Um PATCH que só move um nó no
      // canvas não pode apagar o nome do fluxo.
      name: typeof body.name === 'string' ? body.name : atual.name,
      graph: body.graph === undefined ? atual.graph : asGraph(body.graph),
    });

    return NextResponse.json({ ok: true, flow });
  } catch (error) {
    if (error instanceof BotError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    throw error;
  }
});

/**
 * Apaga.
 *
 * 409 quando o fluxo está no ar ou já atendeu alguém: as chaves estrangeiras
 * são CASCADE, e apagar levaria junto as sessões e os eventos de conversas
 * reais. Não é erro do servidor nem falta de permissão — é um conflito com o
 * estado, e a mensagem diz o que fazer no lugar.
 */
export const DELETE = withAuth<Ctx>(async (_request, { params }) => {
  const session = await requireRole('Master');
  const { id } = await params;

  try {
    const apagou = await deleteFlow(session, id);
    if (!apagou) return NAO_ENCONTRADO;

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof BotError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
    }
    throw error;
  }
});
