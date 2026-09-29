import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth/guard';
import { generateCohortAnalysis, exportCohortToCSV } from '@/lib/reports/cohort-ltv';

export async function GET(request: Request) {
  const auth = await guard();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

  const metrics = generateCohortAnalysis();

  if (format === 'csv') {
    const csvContent = exportCohortToCSV(metrics);
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="relatorio-cohort-ltv-scalementors-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    metrics,
  });
}
