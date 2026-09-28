import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth/guard';
import { generateContractModel } from '@/lib/contracts/contract-generator';

export async function POST(request: Request) {
  const auth = await guard();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const {
      clientName,
      clientDoc,
      clientEmail,
      clientPhone,
      clientAddress,
      programName,
      durationMonths,
      value,
      paymentMethod,
    } = body;

    if (!clientName) {
      return NextResponse.json(
        { ok: false, error: 'Nome do contratante é obrigatório.' },
        { status: 400 }
      );
    }

    const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
    const numDuration = typeof durationMonths === 'number' ? durationMonths : parseInt(durationMonths) || 6;

    const contract = generateContractModel({
      clientName,
      clientDoc: clientDoc || '',
      clientEmail: clientEmail || '',
      clientPhone: clientPhone || '',
      clientAddress: clientAddress || '',
      programName: programName || 'Mentoria Scale High-Ticket',
      durationMonths: numDuration,
      value: numValue,
      paymentMethod: paymentMethod || 'Pix / Cartão de Crédito',
    });

    return NextResponse.json({
      ok: true,
      contract,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao gerar minuta do contrato' },
      { status: 500 }
    );
  }
}
