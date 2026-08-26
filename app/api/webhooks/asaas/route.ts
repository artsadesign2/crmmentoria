import { NextResponse } from 'next/server';
import { queryNeon } from '@/lib/neon-db';
import { invalidateFinancialCache, ensureFinancialTable } from '@/lib/financial-db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Recebido Webhook Asaas:', body.event, body.payment?.id);

    const event = body.event;
    const payment = body.payment;

    if (!payment?.id) {
      return NextResponse.json({ ok: true, message: 'Evento ignorado sem payment id' });
    }

    await ensureFinancialTable();

    // Eventos de sucesso do Asaas
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      await queryNeon(
        `UPDATE financial_transactions 
         SET status = 'PAID' 
         WHERE id = $1 OR payment_link LIKE $2`,
        [payment.id, `%${payment.id}%`]
      );
      invalidateFinancialCache();
    } else if (event === 'PAYMENT_OVERDUE') {
      await queryNeon(
        `UPDATE financial_transactions 
         SET status = 'OVERDUE' 
         WHERE id = $1 OR payment_link LIKE $2`,
        [payment.id, `%${payment.id}%`]
      );
      invalidateFinancialCache();
    } else if (event === 'PAYMENT_DELETED' || event === 'PAYMENT_REFUNDED') {
      await queryNeon(
        `UPDATE financial_transactions 
         SET status = 'CANCELLED' 
         WHERE id = $1 OR payment_link LIKE $2`,
        [payment.id, `%${payment.id}%`]
      );
      invalidateFinancialCache();
    }

    return NextResponse.json({ ok: true, received: true });
  } catch (error: any) {
    console.error('Error handling Asaas Webhook:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
