import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth/guard';
import { createAsaasPayment } from '@/lib/gateways/asaas';
import { createStripeCheckoutSession } from '@/lib/gateways/stripe';
import { createFinancialTransaction } from '@/lib/financial-db';
import { prisma } from '@/lib/prisma';
import { broadcastNotificationToOrg } from '@/lib/notifications-stream';

export async function POST(request: Request) {
  const auth = await guard();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const {
      dealId,
      memberId,
      clientName,
      clientEmail,
      clientPhone,
      clientCpfCnpj,
      amount,
      description,
      gateway = 'ASAAS', // 'ASAAS' | 'STRIPE'
      billingType = 'PIX', // 'PIX' | 'BOLETO' | 'CREDIT_CARD'
      isRenewal = false,
    } = body;

    if (!amount || (!clientName && !dealId && !memberId)) {
      return NextResponse.json(
        { ok: false, error: 'Valor e identificação do pagador são obrigatórios.' },
        { status: 400 }
      );
    }

    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    const finalName = clientName || 'Cliente Rocket Club';
    const finalDesc = description || (isRenewal ? 'Renovação de Ciclo de Mentoria Rocket Club' : 'Fechamento de Negócio Rocket Club');

    let paymentLink: string | undefined;
    let pixCopiaECola: string | undefined;
    let pixQrCodeBase64: string | undefined;
    let invoiceUrl: string | undefined;
    let paymentId: string | undefined;

    if (gateway === 'ASAAS') {
      const asaasResult = await createAsaasPayment({
        customerName: finalName,
        customerCpfCnpj: clientCpfCnpj,
        customerEmail: clientEmail,
        customerPhone: clientPhone,
        value: numAmount,
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        description: finalDesc,
        billingType: billingType as any,
      });

      if (!asaasResult.success) {
        return NextResponse.json({ ok: false, error: asaasResult.error || 'Erro ao gerar Asaas' }, { status: 400 });
      }

      paymentId = asaasResult.paymentId;
      invoiceUrl = asaasResult.invoiceUrl;
      pixCopiaECola = asaasResult.pixCopiaECola;
      pixQrCodeBase64 = asaasResult.pixQrCodeBase64;
      paymentLink = asaasResult.invoiceUrl;
    } else {
      const stripeResult = await createStripeCheckoutSession({
        amount: numAmount,
        description: finalDesc,
        customerEmail: clientEmail,
        customerName: finalName,
        recurring: isRenewal,
      });

      if (!stripeResult.success) {
        return NextResponse.json({ ok: false, error: stripeResult.error || 'Erro ao gerar Stripe' }, { status: 400 });
      }

      paymentId = stripeResult.sessionId;
      paymentLink = stripeResult.checkoutUrl;
      invoiceUrl = stripeResult.checkoutUrl;
    }

    // Salva a transação financeira
    const transaction = await createFinancialTransaction({
      description: finalDesc,
      amount: numAmount,
      type: 'INCOME',
      category: isRenewal ? 'Renovação' : 'Contrato Mentoria',
      status: 'PENDING',
      date: new Date().toISOString(),
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
      memberId: memberId || undefined,
      memberName: finalName,
      gateway: gateway === 'ASAAS' ? 'ASAAS' : 'STRIPE',
      paymentLink,
      pixCopiaECola,
      pixQrCodeBase64,
      invoiceUrl,
    });

    // Se vinculado a um Deal no CRM, atualiza notas ou status
    if (dealId) {
      try {
        await prisma.dealCard.update({
          where: { id: dealId },
          data: {
            customFields: {
              paymentId,
              gateway,
              paymentLink,
              pixCopiaECola,
              status: 'AWAITING_PAYMENT',
            },
          },
        });
      } catch (err) {
        console.warn('[Checkout Deal Update Warning]:', err);
      }
    }

    return NextResponse.json({
      ok: true,
      checkout: {
        paymentId,
        paymentLink,
        pixCopiaECola,
        pixQrCodeBase64,
        invoiceUrl,
        amount: numAmount,
        clientName: finalName,
        gateway,
        transactionId: transaction.id,
      },
      message: 'Cobrança gerada com sucesso!',
    });
  } catch (error: any) {
    console.error('Error in POST /api/payments/checkout:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao processar checkout' },
      { status: 500 }
    );
  }
}
