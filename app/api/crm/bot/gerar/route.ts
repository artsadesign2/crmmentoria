import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, withAuth } from '@/lib/auth/session';
import { gerarFluxo } from '@/lib/bot/gerar';
import { getVozConfig } from '@/lib/bot/settings';
import { getFlow, saveFlow } from '@/lib/bot/flows';
import { BotError } from '@/lib/bot/types';

/**
 * Monta um fluxo a partir de uma descrição em português.
 *
 * Os setores reais da organização vão no prompt para o modelo poder escrever
 * transferências que funcionam. Sem isso ele inventa um `departmentId`, a
 * transferência cai na distribuição padrão, e o fluxo parece certo enquanto
 * manda todo mundo para a mesma fila.
 *
 * O grafo gerado é gravado como rascunho e a tela abre nele. Nada é publicado:
 * quem pediu o fluxo lê o que o robô vai dizer antes de qualquer cliente ler.
 */
export const POST = withAuth(async (request: Request) => {
  const session = await requireRole('Master');

  const corpo = (await request.json().catch(() => null)) as {
    descricao?: unknown;
    name?: unknown;
  } | null;

  const descricao = typeof corpo?.descricao === 'string' ? corpo.descricao : '';

  const [setores, voz] = await Promise.all([
    prisma.department.findMany({
      where: { organizationId: session.organizationId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    getVozConfig(session.organizationId),
  ]);

  const resultado = await gerarFluxo(descricao, setores, voz.personaName);

  if (!resultado.ok) {
    return NextResponse.json({ ok: false, error: resultado.erro }, { status: 422 });
  }

  const nome =
    typeof corpo?.name === 'string' && corpo.name.trim()
      ? corpo.name.trim()
      : `Fluxo: ${descricao.trim().slice(0, 60)}`;

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
