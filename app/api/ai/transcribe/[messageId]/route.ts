import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { retryTranscription } from '@/lib/ai/transcribe';

type Ctx = { params: Promise<{ messageId: string }> };

/**
 * Repete a transcrição de um áudio que falhou.
 *
 * Rota própria porque só um `FAILED` é reprocessado por aqui — a rota da
 * conversa nunca repete o que já falhou, senão um áudio problemático custaria
 * uma chamada a cada abertura.
 */
export const POST = withAuth<Ctx>(async (_request, { params }) => {
  const session = await requireSession();
  const { messageId } = await params;

  const message = await retryTranscription(session, messageId);

  return message
    ? NextResponse.json({ ok: true, message })
    : NextResponse.json(
        { ok: false, error: 'Áudio não encontrado ou não está em falha.' },
        { status: 404 }
      );
});
