import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { listPipelines } from '@/lib/crm/pipelines';

/** Funis com etapas, contagem e somatório por coluna, já agregados no banco. */
export const GET = withAuth(async () => {
  const session = await requireSession();
  return NextResponse.json({ ok: true, pipelines: await listPipelines(session) });
});
