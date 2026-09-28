import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth/guard';
import { calculateGamificationLevel } from '@/lib/gamification/badges';

// Armazenamento em memória / cache com fallback
const userProgressStore: Record<
  string,
  {
    completedLessonIds: string[];
    xp: number;
    unlockedBadges: string[];
    lastUpdated: string;
  }
> = {};

export async function GET(request: Request) {
  const auth = await guard();
  if (auth.response) return auth.response;

  const userId = auth.session.userId;
  const userProgress = userProgressStore[userId] || {
    completedLessonIds: [],
    xp: 0,
    unlockedBadges: [],
    lastUpdated: new Date().toISOString(),
  };

  const levelInfo = calculateGamificationLevel(userProgress.xp);

  return NextResponse.json({
    ok: true,
    userId,
    completedLessonIds: userProgress.completedLessonIds,
    xp: userProgress.xp,
    levelInfo,
    unlockedBadges: userProgress.unlockedBadges,
    lastUpdated: userProgress.lastUpdated,
  });
}

export async function POST(request: Request) {
  const auth = await guard();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { lessonId, completed = true, courseId, totalCourseLessons = 8 } = body;

    if (!lessonId) {
      return NextResponse.json({ ok: false, error: 'lessonId é obrigatório.' }, { status: 400 });
    }

    const userId = auth.session.userId;
    if (!userProgressStore[userId]) {
      userProgressStore[userId] = {
        completedLessonIds: [],
        xp: 0,
        unlockedBadges: [],
        lastUpdated: new Date().toISOString(),
      };
    }

    const currentList = userProgressStore[userId].completedLessonIds;
    let earnedXp = 0;
    const newBadgesUnlocked: string[] = [];

    if (completed) {
      if (!currentList.includes(lessonId)) {
        currentList.push(lessonId);
        earnedXp += 50; // +50 XP por aula concluída
        userProgressStore[userId].xp += 50;

        // Verificar Badges Desbloqueados
        const totalCompleted = currentList.length;

        if (totalCompleted >= 1 && !userProgressStore[userId].unlockedBadges.includes('FIRST_MISSION')) {
          userProgressStore[userId].unlockedBadges.push('FIRST_MISSION');
          newBadgesUnlocked.push('FIRST_MISSION');
          userProgressStore[userId].xp += 100;
          earnedXp += 100;
        }

        const pct = (totalCompleted / totalCourseLessons) * 100;
        if (pct >= 50 && !userProgressStore[userId].unlockedBadges.includes('ACADEMY_HALF')) {
          userProgressStore[userId].unlockedBadges.push('ACADEMY_HALF');
          newBadgesUnlocked.push('ACADEMY_HALF');
          userProgressStore[userId].xp += 250;
          earnedXp += 250;
        }

        if (pct >= 100 && !userProgressStore[userId].unlockedBadges.includes('ACADEMY_MASTER')) {
          userProgressStore[userId].unlockedBadges.push('ACADEMY_MASTER');
          newBadgesUnlocked.push('ACADEMY_MASTER');
          userProgressStore[userId].xp += 500;
          earnedXp += 500;
        }
      }
    } else {
      userProgressStore[userId].completedLessonIds = currentList.filter((id) => id !== lessonId);
      userProgressStore[userId].xp = Math.max(0, userProgressStore[userId].xp - 50);
    }

    userProgressStore[userId].lastUpdated = new Date().toISOString();
    const levelInfo = calculateGamificationLevel(userProgressStore[userId].xp);

    return NextResponse.json({
      ok: true,
      completed,
      lessonId,
      courseId,
      totalCompleted: userProgressStore[userId].completedLessonIds.length,
      completedLessonIds: userProgressStore[userId].completedLessonIds,
      xp: userProgressStore[userId].xp,
      earnedXp,
      newBadgesUnlocked,
      levelInfo,
      unlockedBadges: userProgressStore[userId].unlockedBadges,
      message: completed ? 'Aula marcada como concluída!' : 'Aula marcada como pendente.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro ao atualizar progresso' },
      { status: 500 }
    );
  }
}
