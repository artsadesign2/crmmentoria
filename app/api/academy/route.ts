import { NextResponse } from 'next/server';
import { queryNeon, fetchAllCoursesFromDb } from '@/lib/neon-db';
import { MOCK_COURSES } from '@/lib/mock-data';

export async function GET() {
  try {
    const dbCourses = await fetchAllCoursesFromDb();
    if (dbCourses && dbCourses.length > 0) {
      return NextResponse.json({
        ok: true,
        courses: dbCourses,
      });
    }
  } catch (err) {
    console.error('Error fetching academy courses:', err);
  }

  return NextResponse.json({
    ok: true,
    courses: MOCK_COURSES,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, category = 'Geral', level = 'Geral', coverImage } = body;

    if (!title) {
      return NextResponse.json({ ok: false, error: 'Título é obrigatório' }, { status: 400 });
    }

    const id = `crs-${Date.now()}`;
    await queryNeon(
      `
      INSERT INTO academy_courses (id, title, description, category, level, cover_image, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, 'published', NOW(), NOW())
    `,
      [
        id,
        title,
        description || '',
        category,
        level,
        coverImage || 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
      ]
    );

    return NextResponse.json({
      ok: true,
      course: {
        id,
        title,
        description,
        category,
        level,
        lessonsCount: 8,
        durationMinutes: 180,
        coverImage: coverImage || 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
        progressPercent: 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
