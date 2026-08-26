import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_BILLING_RULES, executeBillingRuleDispatch } from '@/lib/billing-rules';

export async function GET() {
  return NextResponse.json({
    ok: true,
    rules: DEFAULT_BILLING_RULES,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ruleId, recipientPhone, menteeName, amount, dueDate, pixCode } = body;

    if (!recipientPhone || !menteeName) {
      return NextResponse.json(
        { ok: false, error: 'Telefone e nome do mentorado são obrigatórios.' },
        { status: 400 }
      );
    }

    const result = await executeBillingRuleDispatch({
      ruleId: ruleId || 'rule-d3',
      recipientPhone,
      menteeName,
      amount: typeof amount === 'number' ? amount : 5000,
      dueDate: dueDate || '10/09/2026',
      pixCode: pixCode || '',
    });

    return NextResponse.json({
      ok: result.success,
      ...result,
    });
  } catch (error: any) {
    console.error('Error executing billing bot:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Falha ao executar régua de cobrança.' },
      { status: 500 }
    );
  }
}
