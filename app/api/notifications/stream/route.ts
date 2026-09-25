import { requireSession } from '@/lib/auth/session';
import { notificationBus } from '@/lib/notifications-stream';
import { NotificationItem } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const { organizationId, userId } = session;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Envia evento inicial de conexão estabelecida
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ ok: true, timestamp: Date.now() })}\n\n`)
      );

      // 2. Listener para eventos da Organização
      const orgListener = (notification: NotificationItem) => {
        try {
          controller.enqueue(
            encoder.encode(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`)
          );
        } catch {
          // Stream fechado
        }
      };

      // 3. Listener para eventos específicos do Usuário
      const userListener = (notification: NotificationItem) => {
        try {
          controller.enqueue(
            encoder.encode(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`)
          );
        } catch {
          // Stream fechado
        }
      };

      notificationBus.on(`notify:${organizationId}`, orgListener);
      notificationBus.on(`notify:user:${userId}`, userListener);

      // 4. Heartbeat a cada 25 segundos para manter a conexão aberta em proxies
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 25000);

      // 5. Cleanup ao encerrar a conexão
      return () => {
        clearInterval(heartbeatInterval);
        notificationBus.off(`notify:${organizationId}`, orgListener);
        notificationBus.off(`notify:user:${userId}`, userListener);
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
