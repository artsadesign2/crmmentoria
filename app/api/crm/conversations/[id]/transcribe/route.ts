import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { transcribeConversationAudio } from '@/lib/ai/transcribe';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Transcreve os áudios pendentes da conversa.
 *
 * Chamada uma vez ao abrir o atendimento, e não a cada mensagem: uma
 * requisição por conversa, não uma por áudio.
 */
export const POST = withAuth<Ctx>(async (_request, { params }) => {
  const session = await requireSession();
  const { id } = await params;

  const resultado = await transcribeConversationAudio(session, id);

  return resultado
    ? NextResponse.json({ ok: true, ...resultado })
    : NextResponse.json({ ok: false, error: 'Conversa não encontrada.' }, { status: 404 });
});
