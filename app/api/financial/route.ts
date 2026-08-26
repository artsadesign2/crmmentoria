import { NextResponse } from 'next/server';
import {
  fetchAllFinancialTransactions,
  createFinancialTransaction,
  updateFinancialTransactionStatus,
  deleteFinancialTransaction,
} from '@/lib/financial-db';
import { createAsaasPayment } from '@/lib/gateways/asaas';
import { createStripeCheckoutSession } from '@/lib/gateways/stripe';

export async function GET() {
  try {
    const transactions = await fetchAllFinancialTransactions();
    return NextResponse.json({
      ok: true,
      transactions,
    });
  } catch (error: any) {
    console.error('Error in GET /api/financial:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao buscar transações' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'Dados inválidos' }, { status: 400 });
    }

    const {
      description,
      amount,
      type = 'INCOME',
      category = 'Mensalidade',
      status = 'PAID',
      date,
      dueDate,
      memberId,
      memberName,
      gateway = 'MANUAL',
      generatePix = false,
      generateStripe = false,
      memberEmail,
      memberPhone,
      memberCpfCnpj,
    } = body;

    if (!description || !amount) {
      return NextResponse.json({ ok: false, error: 'Descrição e valor são obrigatórios' }, { status: 400 });
    }

    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    let paymentLink: string | undefined;
    let pixCopiaECola: string | undefined;
    let pixQrCodeBase64: string | undefined;
    let invoiceUrl: string | undefined;
    let finalGateway = gateway;

    // Se solicitado gerar Pix via Asaas
    if (generatePix || gateway === 'ASAAS' || gateway === 'PIX') {
      finalGateway = 'ASAAS';
      const asaasResult = await createAsaasPayment({
        customerName: memberName || 'Mentorado Rocket Club',
        customerCpfCnpj: memberCpfCnpj,
        customerEmail: memberEmail,
        customerPhone: memberPhone,
        value: numAmount,
        dueDate: dueDate ? dueDate.split('T')[0] : new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        description,
        billingType: 'PIX',
      });

      if (asaasResult.success) {
        paymentLink = asaasResult.invoiceUrl;
        pixCopiaECola = asaasResult.pixCopiaECola;
        pixQrCodeBase64 = asaasResult.pixQrCodeBase64;
        invoiceUrl = asaasResult.invoiceUrl;
      }
    } else if (generateStripe || gateway === 'STRIPE') {
      finalGateway = 'STRIPE';
      const stripeResult = await createStripeCheckoutSession({
        amount: numAmount,
        description,
        customerEmail: memberEmail,
        customerName: memberName,
        recurring: category === 'Mensalidade',
      });

      if (stripeResult.success) {
        paymentLink = stripeResult.checkoutUrl;
      }
    }

    const created = await createFinancialTransaction({
      description,
      amount: numAmount,
      type: type === 'EXPENSE' ? 'EXPENSE' : 'INCOME',
      category,
      status,
      date: date || new Date().toISOString(),
      dueDate: dueDate || undefined,
      memberId: memberId || undefined,
      memberName: memberName || undefined,
      gateway: finalGateway,
      paymentLink,
      pixCopiaECola,
      pixQrCodeBase64,
      invoiceUrl,
    });

    return NextResponse.json({
      ok: true,
      transaction: created,
      message: 'Transação financeira salva com sucesso!',
    });
  } catch (error: any) {
    console.error('Error in POST /api/financial:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao criar transação' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ ok: false, error: 'ID e status são obrigatórios' }, { status: 400 });
    }

    await updateFinancialTransactionStatus(id, status);

    return NextResponse.json({
      ok: true,
      message: 'Status atualizado com sucesso!',
    });
  } catch (error: any) {
    console.error('Error in PUT /api/financial:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao atualizar status' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, error: 'ID é obrigatório' }, { status: 400 });
    }

    await deleteFinancialTransaction(id);

    return NextResponse.json({
      ok: true,
      message: 'Transação excluída com sucesso!',
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/financial:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao excluir transação' },
      { status: 500 }
    );
  }
}
