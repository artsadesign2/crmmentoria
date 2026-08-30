import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { criarFluxoRetomada } from '@/lib/bot/seed-triagem';
import { getFlow } from '@/lib/bot/flows';
import { BotError } from '@/lib/bot/types';

/**
 * Cria o fluxo que fala com quem ficou sem resposta.
 *
 * Existe separado do menu de triagem porque as duas conversas não se parecem
 * em nada. A triagem abre um atendimento; esta reabre um que falhou. Usar a
 * triagem nos dois casos — que é o que acontece quando não há fluxo de
 * retomada publicado — cumprimenta com "oi, tudo bem?" alguém que espera
 * resposta há dois dias, e transforma um cliente irritado num cliente perdido.
 *
 * Diferente da triagem, não depende de setor nenhum: a entrega cai na
 * distribuição padrão, que é o certo para uma conversa que já tinha dono.
 */
export const POST = withAuth(async () => {
  const session = await requireSession();

  try {
    const { flowId } = await criarFluxoRetomada(session);
    const flow = await getFlow(session, flowId);

    return NextResponse.json({ ok: true, flow }, { status: 201 });
  } catch (error) {
    if (error instanceof BotError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
    }
    throw error;
  }
});
