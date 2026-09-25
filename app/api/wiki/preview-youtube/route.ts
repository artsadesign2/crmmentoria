import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { getYouTubePreview } from '@/lib/wiki/youtube-importer';

export const POST = withAuth(async (request: Request) => {
  await requireSession();
  const body = await request.json().catch(() => ({}));

  const url = typeof body.url === 'string' ? body.url.trim() : '';

  if (!url) {
    return NextResponse.json({ ok: false, error: 'O link do vídeo do YouTube é obrigatório.' }, { status: 400 });
  }

  try {
    const preview = await getYouTubePreview(url);
    return NextResponse.json({ ok: true, preview });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || 'Não foi possível extrair os dados do vídeo informado.' },
      { status: 400 }
    );
  }
});
