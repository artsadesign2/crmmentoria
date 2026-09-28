import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateFinancialTransactionStatus } from '@/lib/financial-db';
import { broadcastNotificationToOrg } from '@/lib/notifications-stream';
import { sendEvolutionWhatsAppMessage, formatWhatsAppNumber } from '@/lib/evolution-api';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // 1. Identifica se o evento vem do Asaas ou do Stripe
    const isAsaas = Boolean(body.event && body.payment);
    const isStripe = Boolean(body.type && body.data);

    let paymentId = '';
    let status = '';
    let value = 0;
    let customerName = '';
    let customerEmail = '';

    if (isAsaas) {
      paymentId = body.payment?.id || '';
      status = body.event; // 'PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', etc.
      value = body.payment?.value || 0;
      customerName = body.payment?.customerName || '';
    } else if (isStripe) {
      paymentId = body.data?.object?.id || '';
      status = body.type; // 'checkout.session.completed', 'payment_intent.succeeded'
      value = (body.data?.object?.amount_total || 0) / 100;
      customerEmail = body.data?.object?.customer_details?.email || '';
      customerName = body.data?.object?.customer_details?.name || '';
    } else {
      // Formato manual / genérico
      paymentId = body.paymentId || body.id || '';
      status = body.status || 'PAID';
      value = body.value || body.amount || 0;
    }

    const isPaid =
      status === 'PAYMENT_RECEIVED' ||
      status === 'PAYMENT_CONFIRMED' ||
      status === 'checkout.session.completed' ||
      status === 'payment_intent.succeeded' ||
      status === 'PAID';

    if (isPaid && paymentId) {
      // 1. Atualiza transação financeira
      try {
        await updateFinancialTransactionStatus(paymentId, 'PAID');
      } catch (err) {
        console.warn('[Webhook Financial Update Warning]:', err);
      }

      // 2. Busca organização para disparo de notificação SSE
      let orgId = '';
      try {
        const org = await prisma.organization.findFirst({ select: { id: true } });
        if (org) orgId = org.id;
      } catch (e) {}

      if (orgId) {
        broadcastNotificationToOrg(orgId, {
          id: `pay-notif-${Date.now()}`,
          sector: 'financial',
          type: 'success',
          title: '💰 Pagamento Confirmado!',
          message: `Recebimento de R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${customerName || 'Cliente'}) confirmado via gateway.`,
          link: '/financial',
          actionText: 'Ver Financeiro',
          createdAt: 'Agora mesmo',
          read: false,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      received: true,
      paymentId,
      status,
      message: 'Webhook processado com sucesso!',
    });
  } catch (error: any) {
    console.error('Error in POST /api/webhook/payments:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao processar webhook' },
      { status: 500 }
    );
  }
}
