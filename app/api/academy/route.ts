import { NextResponse } from 'next/server';
import { MOCK_COURSES } from '@/lib/mock-data';

export async function GET() {
  return NextResponse.json({
    ok: true,
    courses: MOCK_COURSES,
  });
}
