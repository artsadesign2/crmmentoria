import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { qualifyConversation, QualifyError } from '@/lib/ai/qualify';

type Ctx = { params: Promise<{ id: string }> };

/** Analisa o atendimento e grava a qualificação na ficha do funil. */
export const POST = withAuth<Ctx>(async (_request, { params }) => {
  const session = await requireSession();
  const { id } = await params;

  try {
    const resultado = await qualifyConversation(session, id);

    if (!resultado) {
      return NextResponse.json({ ok: false, error: 'Conversa não encontrada.' }, { status: 404 });
    }
    if (!resultado.ok) {
      // 409 e não 502: a IA desligada é configuração, e repetir não muda
      // nada. 502 diria ao cliente que o serviço externo falhou.
      return NextResponse.json(
        { ok: false, error: resultado.error },
        { status: resultado.disabled ? 409 : 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      qualification: resultado.qualification,
      dealCardId: resultado.dealCardId,
    });
  } catch (error) {
    if (error instanceof QualifyError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    throw error;
  }
});
