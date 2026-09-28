import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth/guard';
import { DEFAULT_CONTRACT_TEMPLATE, ContractTemplateConfig } from '@/lib/contracts/contract-template';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const auth = await guard();
  if (auth.response) return auth.response;

  try {
    const org = await prisma.organization.findUnique({
      where: { id: auth.session.organizationId },
      select: { features: true },
    });

    const features = (org?.features as Record<string, any>) || {};
    const template = (features.contractTemplate as ContractTemplateConfig) || DEFAULT_CONTRACT_TEMPLATE;

    return NextResponse.json({
      ok: true,
      template,
    });
  } catch (err) {
    return NextResponse.json({
      ok: true,
      template: DEFAULT_CONTRACT_TEMPLATE,
    });
  }
}

export async function POST(request: Request) {
  const auth = await guard(['Master', 'Administrador']);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const template = body.template as ContractTemplateConfig;

    if (!template || !template.clausesText) {
      return NextResponse.json(
        { ok: false, error: 'O texto das cláusulas do contrato é obrigatório.' },
        { status: 400 }
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: auth.session.organizationId },
      select: { features: true },
    });

    const currentFeatures = (org?.features as Record<string, any>) || {};
    const updatedFeatures = {
      ...currentFeatures,
      contractTemplate: {
        ...template,
        updatedAt: new Date().toISOString(),
      },
    };

    await prisma.organization.update({
      where: { id: auth.session.organizationId },
      data: {
        features: updatedFeatures,
      },
    });

    return NextResponse.json({
      ok: true,
      template: updatedFeatures.contractTemplate,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao salvar modelo de contrato.' },
      { status: 500 }
    );
  }
}
