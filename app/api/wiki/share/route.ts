import { NextResponse } from 'next/server';
import { requireSession, withAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { sendWikiShareEmail } from '@/lib/wiki/wiki-notifications';
import { broadcastNotificationToOrg } from '@/lib/notifications-stream';

export const POST = withAuth(async (request: Request) => {
  const session = await requireSession();
  const body = await request.json().catch(() => ({}));

  const articleId = typeof body.articleId === 'string' ? body.articleId.trim() : '';
  const articleTitle = typeof body.articleTitle === 'string' ? body.articleTitle.trim() : '';
  const articleSummary = typeof body.articleSummary === 'string' ? body.articleSummary.trim() : '';
  const department = typeof body.department === 'string' ? body.department : 'Operacional';
  const category = typeof body.category === 'string' ? body.category : 'Treinamento';
  const readingTimeMinutes = typeof body.readingTimeMinutes === 'number' ? body.readingTimeMinutes : 5;
  const hasVideo = Boolean(body.hasVideo);
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  const userIds: string[] = Array.isArray(body.userIds) ? body.userIds : [];

  if (!articleId || !articleTitle || userIds.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'Artigo e ao menos um destinatário são obrigatórios.' },
      { status: 400 }
    );
  }

  // Busca dados do remetente
  const sender = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true },
  });
  const senderName = sender?.name || 'Comandante da Equipe';

  // Busca os usuários selecionados na mesma organização
  const users = await prisma.user.findMany({
    where: {
      organizationId: session.organizationId,
      id: { in: userIds },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (users.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'Nenhum usuário correspondente encontrado na organização.' },
      { status: 404 }
    );
  }

  let sentCount = 0;
  const errors: string[] = [];

  for (const user of users) {
    try {
      await sendWikiShareEmail({
        to: user.email,
        recipientName: user.name,
        senderName,
        articleId,
        articleTitle,
        articleSummary,
        department,
        category,
        readingTimeMinutes,
        note: note || undefined,
        hasVideo,
      });
      sentCount++;
    } catch (err: any) {
      errors.push(`Erro ao enviar para ${user.email}: ${err.message}`);
    }
  }

  // Disparo em tempo real no stream SSE da organização (Zero Custo)
  try {
    broadcastNotificationToOrg(session.organizationId, {
      id: `notif-${Date.now()}`,
      sector: 'wiki',
      type: 'info',
      title: '📚 Recomendação de Treinamento',
      message: `${senderName} recomendou o artigo "${articleTitle}" para a equipe.`,
      link: `/wiki/${articleId}`,
      actionText: 'Acessar Artigo',
      createdAt: 'Agora mesmo',
      read: false,
    });
  } catch (err) {
    console.warn('[SSE Broadcast Warning]:', err);
  }

  return NextResponse.json({
    ok: true,
    sentCount,
    totalRequested: users.length,
    senderName,
    message: `Recomendação enviada com sucesso para ${sentCount} membro(s) da equipe!`,
  });
});
