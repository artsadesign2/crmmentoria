import { NextRequest, NextResponse } from 'next/server';
import { generateRocketAiDiagnosis } from '@/lib/ai-copilot';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      menteeId,
      menteeName,
      companyName,
      monthlyRevenue,
      mainGoal,
      biggestChallenge,
      specialty,
      pillarScores,
    } = body;

    if (!menteeName || !companyName) {
      return NextResponse.json(
        { ok: false, error: 'Nome do mentorado e empresa são obrigatórios.' },
        { status: 400 }
      );
    }

    const report = generateRocketAiDiagnosis({
      menteeId: menteeId || 'temp-id',
      menteeName,
      companyName,
      monthlyRevenue,
      mainGoal,
      biggestChallenge,
      specialty,
      pillarScores,
    });

    return NextResponse.json({
      ok: true,
      report,
    });
  } catch (error: any) {
    console.error('Error generating AI diagnosis:', error);
    return NextResponse.json(
      { ok: false, error: 'Falha ao processar diagnóstico de IA.' },
      { status: 500 }
    );
  }
}
