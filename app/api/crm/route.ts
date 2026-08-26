import { NextResponse } from 'next/server';
import {
  fetchAllLeadsFromDb,
  createLeadInDb,
  updateLeadInDb,
  deleteLeadFromDb,
} from '@/lib/crm-db';

export async function GET() {
  try {
    const leads = await fetchAllLeadsFromDb();
    return NextResponse.json({
      ok: true,
      leads,
    });
  } catch (error: any) {
    console.error('Error in GET /api/crm:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'Dados inválidos' }, { status: 400 });
    }

    const {
      name,
      company,
      specialty,
      email,
      phone,
      stage,
      estimatedValue,
      source,
      priority,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json({ ok: false, error: 'Nome é obrigatório' }, { status: 400 });
    }

    const lead = await createLeadInDb({
      name,
      company,
      specialty,
      email,
      phone,
      stage: stage || 'NOVO_LEAD',
      estimatedValue: estimatedValue ? parseFloat(estimatedValue) : 25000,
      source: source || 'Instagram',
      priority: priority || 'alta',
      notes,
    });

    return NextResponse.json({
      ok: true,
      lead,
      message: 'Lead cadastrado com sucesso!',
    });
  } catch (error: any) {
    console.error('Error in POST /api/crm:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: 'ID do lead é obrigatório' }, { status: 400 });
    }

    await updateLeadInDb(id, updates);

    return NextResponse.json({
      ok: true,
      message: 'Lead atualizado com sucesso!',
    });
  } catch (error: any) {
    console.error('Error in PUT /api/crm:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, error: 'ID do lead é obrigatório' }, { status: 400 });
    }

    await deleteLeadFromDb(id);

    return NextResponse.json({
      ok: true,
      message: 'Lead excluído com sucesso!',
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/crm:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
