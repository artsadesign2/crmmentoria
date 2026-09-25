import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { processYouTubeToWiki } from '@/lib/wiki/youtube-importer';

export const POST = withAuth(async (request: Request) => {
  await requireSession();
  const body = await request.json().catch(() => ({}));

  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const department = typeof body.department === 'string' ? body.department : 'Operacional';
  const category = typeof body.category === 'string' ? body.category : 'Processos';

  if (!url) {
    return NextResponse.json({ ok: false, error: 'O link do vídeo do YouTube é obrigatório.' }, { status: 400 });
  }

  try {
    const data = await processYouTubeToWiki(url, department, category);
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || 'Falha ao processar vídeo do YouTube.' }, { status: 400 });
  }
});
