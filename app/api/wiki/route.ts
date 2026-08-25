import { NextResponse } from 'next/server';
import { MOCK_ARTICLES } from '@/lib/mock-data';

export async function GET() {
  return NextResponse.json({
    ok: true,
    articles: MOCK_ARTICLES,
  });
}
