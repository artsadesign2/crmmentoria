import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, withAuth } from '@/lib/auth/session';
import {
  conversationVisibilityFilter,
  sessionDepartmentId,
  conversationToDTO,
  messageToDTO,
  touchPresence,
} from '@/lib/crm/conversations';

/**
 * Cursor de tempo real do Inbox.
 *
 * Não é SSE. Na Vercel, uma conexão SSE mantém uma função aberta e cobra
 * aproximadamente 60 s de compute por minuto por atendente logado; este
 * endpoint custa cerca de 1 s pelo mesmo minuto, e a diferença que o atendente
 * percebe é de milissegundos.
 *
 * A escolha vive atrás de `useInboxStream()`. O componente não sabe o que há
 * por baixo, então trocar por SSE ou websocket depois é um arquivo.
 */

export const dynamic = 'force-dynamic';

const LIMITE_CONVERSAS = 60;
const LIMITE_MENSAGENS = 80;

export const GET = withAuth(async (request: Request) => {
  const session = await requireSession();
  const params = new URL(request.url).searchParams;

  // Este endpoint é o batimento de presença: quem está com a tela aberta está
  // online, por definição. A escrita é limitada a uma por minuto lá dentro.
  await touchPresence(session.userId);

  const desde = parseCursor(params.get('since'));
  const conversationId = params.get('conversationId');

  const setor = await sessionDepartmentId(session);
  const visivel = conversationVisibilityFilter(session, setor);

  const [conversas, mensagens, queueCount, naoLidas] = await Promise.all([
    prisma.conversation.findMany({
      where: { AND: [visivel, desde ? { updatedAt: { gt: desde } } : {}] },
      include: {
        contact: { select: { id: true, name: true, phone: true, avatarUrl: true, company: true } },
        assignedUser: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: LIMITE_CONVERSAS,
    }),

    conversationId
      ? prisma.message.findMany({
          where: {
            conversationId,
            // O escopo de organização também aqui: sem ele, um id de conversa
            // adivinhado devolveria mensagens de outro tenant.
            organizationId: session.organizationId,
            ...(desde ? { createdAt: { gt: desde } } : {}),
          },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
          take: LIMITE_MENSAGENS,
        })
      : Promise.resolve([]),

    prisma.conversation.count({
      where: { AND: [visivel, { assignedUserId: null, status: 'OPEN' }] },
    }),

    prisma.conversation.aggregate({
      where: { AND: [visivel, { assignedUserId: session.userId }] },
      _sum: { unreadCount: true },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    now: new Date().toISOString(),
    conversations: conversas.map((c) => conversationToDTO(c, null)),
    messages: mensagens.map(messageToDTO),
    queueCount,
    unreadTotal: naoLidas._sum.unreadCount ?? 0,
  });
});

/**
 * Data inválida vale como "sem cursor": devolve o estado atual em vez de erro.
 * A alternativa seria o Inbox parar de atualizar por causa de um parâmetro
 * malformado, o que é pior do que uma carga completa a mais.
 *
 * A sobreposição de um segundo é aplicada no cliente, junto com a
 * desduplicação por id — ver lib/crm/use-inbox.ts.
 */
function parseCursor(bruto: string | null): Date | null {
  if (!bruto) return null;
  const data = new Date(bruto);
  return Number.isNaN(data.getTime()) ? null : data;
}
