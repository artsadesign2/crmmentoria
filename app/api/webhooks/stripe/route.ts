import { NextResponse } from 'next/server';
import { queryNeon } from '@/lib/neon-db';
import { invalidateFinancialCache, ensureFinancialTable } from '@/lib/financial-db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const eventType = body.type;
    console.log('Recebido Webhook Stripe:', eventType);

    await ensureFinancialTable();

    if (eventType === 'checkout.session.completed' || eventType === 'invoice.paid') {
      const session = body.data?.object;
      const customerEmail = session?.customer_details?.email || session?.customer_email;
      const amountTotal = session?.amount_total ? session.amount_total / 100 : undefined;

      if (session?.id) {
        await queryNeon(
          `UPDATE financial_transactions 
           SET status = 'PAID' 
           WHERE id = $1 OR payment_link LIKE $2`,
          [session.id, `%${session.id}%`]
        );
        invalidateFinancialCache();
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error handling Stripe Webhook:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
