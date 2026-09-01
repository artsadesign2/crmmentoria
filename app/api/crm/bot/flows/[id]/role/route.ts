import { NextResponse } from 'next/server';
import { requireRole, withAuth } from '@/lib/auth/session';
import { getFlow, setFlowRole } from '@/lib/bot/flows';
import { BotError } from '@/lib/bot/types';
import type { PapelDoFluxo } from '@/lib/bot/sessions';

type Ctx = { params: Promise<{ id: string }> };

const PAPEIS: PapelDoFluxo[] = ['TRIGGER', 'REENGAGE'];

/**
 * Coloca o fluxo no ar, ou o tira.
 *
 * Está separada do PATCH de propósito. Salvar o rascunho é uma operação de
 * rotina, feita a cada arrasto de nó no canvas; colocar no ar é o momento em
 * que o robô passa a falar com clientes reais. Misturar as duas faria a ação
 * grave viajar de carona na corriqueira.
 */
export const POST = withAuth<Ctx>(async (request, { params }) => {
  const session = await requireRole('Master');
  const { id } = await params;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const papel = body.papel;

  if (typeof papel !== 'string' || !(PAPEIS as string[]).includes(papel)) {
    return NextResponse.json(
      { ok: false, error: 'Papel inválido. Use TRIGGER ou REENGAGE.' },
      { status: 400 }
    );
  }

  const ativo = body.ativo !== false;

  const flow = await getFlow(session, id);
  if (!flow) {
    return NextResponse.json({ ok: false, error: 'Fluxo não encontrado.' }, { status: 404 });
  }

  try {
    if (ativo) {
      await setFlowRole(session, papel as PapelDoFluxo, id);
    } else {
      // Tirar do ar só vale se este fluxo é quem está lá. Sem esta conferência,
      // uma tela desatualizada — aberta antes de um colega trocar o fluxo no ar
      // — derrubaria o robô do colega ao clicar em "desativar".
      const ocupa = papel === 'TRIGGER' ? flow.isTrigger : flow.isReengage;
      if (ocupa) await setFlowRole(session, papel as PapelDoFluxo, null);
    }

    const atualizado = await getFlow(session, id);
    return NextResponse.json({ ok: true, flow: atualizado });
  } catch (error) {
    if (error instanceof BotError) {
      // "Publique o fluxo antes de colocá-lo no ar" é conflito com o estado, e
      // a tela precisa mostrar essa frase inteira ao operador.
      return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
    }
    throw error;
  }
});
