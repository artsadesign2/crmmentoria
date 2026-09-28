import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth/guard';

// Armazenamento em memória / cache com fallback
const userProgressStore: Record<string, { completedLessonIds: string[]; lastUpdated: string }> = {};

export async function GET(request: Request) {
  const auth = await guard();
  if (auth.response) return auth.response;

  const userId = auth.session.userId;
  const userProgress = userProgressStore[userId] || { completedLessonIds: [], lastUpdated: new Date().toISOString() };

  return NextResponse.json({
    ok: true,
    userId,
    completedLessonIds: userProgress.completedLessonIds,
    lastUpdated: userProgress.lastUpdated,
  });
}

export async function POST(request: Request) {
  const auth = await guard();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { lessonId, completed = true, courseId } = body;

    if (!lessonId) {
      return NextResponse.json({ ok: false, error: 'lessonId é obrigatório.' }, { status: 400 });
    }

    const userId = auth.session.userId;
    if (!userProgressStore[userId]) {
      userProgressStore[userId] = { completedLessonIds: [], lastUpdated: new Date().toISOString() };
    }

    const currentList = userProgressStore[userId].completedLessonIds;

    if (completed) {
      if (!currentList.includes(lessonId)) {
        currentList.push(lessonId);
      }
    } else {
      userProgressStore[userId].completedLessonIds = currentList.filter((id) => id !== lessonId);
    }

    userProgressStore[userId].lastUpdated = new Date().toISOString();

    return NextResponse.json({
      ok: true,
      completed,
      lessonId,
      courseId,
      totalCompleted: userProgressStore[userId].completedLessonIds.length,
      completedLessonIds: userProgressStore[userId].completedLessonIds,
      message: completed ? 'Aula marcada como concluída!' : 'Aula marcada como pendente.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao atualizar progresso' },
      { status: 500 }
    );
  }
}
