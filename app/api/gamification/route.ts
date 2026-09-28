import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth/guard';
import {
  calculateGamificationLevel,
  getAllBadges,
  evaluateUnlockedBadges,
  GAMIFICATION_LEVELS,
} from '@/lib/gamification/badges';
import { INITIAL_MEMBERS } from '@/lib/mock-data';

// Store em memória para persistência de XP e Conquistas
const menteeGamificationStore: Record<
  string,
  {
    xp: number;
    unlockedBadges: string[];
    customTitle?: string;
  }
> = {
  '1': { xp: 3450, unlockedBadges: ['FIRST_MISSION', 'ACADEMY_HALF', 'ACADEMY_MASTER', 'HIGH_ROLLER', 'NETWORK_BUILDER'] },
  '2': { xp: 2200, unlockedBadges: ['FIRST_MISSION', 'ACADEMY_HALF', 'NETWORK_BUILDER', 'COMMUNITY_LEADER'] },
  '3': { xp: 1850, unlockedBadges: ['FIRST_MISSION', 'ACADEMY_HALF', 'NETWORK_BUILDER'] },
  '4': { xp: 1100, unlockedBadges: ['FIRST_MISSION', 'NETWORK_BUILDER'] },
  '5': { xp: 650, unlockedBadges: ['FIRST_MISSION'] },
};

export async function GET(request: Request) {
  const auth = await guard();
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const memberId = url.searchParams.get('memberId');

  // Se pedir perfil de um membro específico
  if (memberId) {
    const memberData = menteeGamificationStore[memberId] || { xp: 150, unlockedBadges: ['FIRST_MISSION'] };
    const levelInfo = calculateGamificationLevel(memberData.xp);

    return NextResponse.json({
      ok: true,
      memberId,
      xp: memberData.xp,
      levelInfo,
      unlockedBadges: memberData.unlockedBadges,
      allBadges: getAllBadges(),
    });
  }

  // Retornar Leaderboard / Ranking Geral de Mentorados
  const leaderboard = INITIAL_MEMBERS.map((member, index) => {
    const data = menteeGamificationStore[member.id] || {
      xp: Math.max(100, 2800 - index * 450),
      unlockedBadges: index === 0 ? ['FIRST_MISSION', 'ACADEMY_HALF', 'ACADEMY_MASTER', 'HIGH_ROLLER'] : ['FIRST_MISSION', 'NETWORK_BUILDER'],
    };
    const levelInfo = calculateGamificationLevel(data.xp);

    return {
      id: member.id,
      name: member.name,
      companyName: member.companyName || member.specialty,
      avatar: member.avatar,
      xp: data.xp,
      level: levelInfo.level,
      levelTitle: levelInfo.title,
      levelIcon: levelInfo.icon,
      progressPct: levelInfo.progressPct,
      badgesCount: data.unlockedBadges.length,
      unlockedBadges: data.unlockedBadges,
    };
  }).sort((a, b) => b.xp - a.xp);

  return NextResponse.json({
    ok: true,
    leaderboard,
    levels: GAMIFICATION_LEVELS,
    allBadges: getAllBadges(),
  });
}

export async function POST(request: Request) {
  const auth = await guard();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { memberId, addXp = 0, unlockBadgeId } = body;

    if (!memberId) {
      return NextResponse.json({ ok: false, error: 'memberId é obrigatório' }, { status: 400 });
    }

    if (!menteeGamificationStore[memberId]) {
      menteeGamificationStore[memberId] = { xp: 0, unlockedBadges: [] };
    }

    if (addXp > 0) {
      menteeGamificationStore[memberId].xp += addXp;
    }

    if (unlockBadgeId && !menteeGamificationStore[memberId].unlockedBadges.includes(unlockBadgeId)) {
      menteeGamificationStore[memberId].unlockedBadges.push(unlockBadgeId);
    }

    const currentData = menteeGamificationStore[memberId];
    const levelInfo = calculateGamificationLevel(currentData.xp);

    return NextResponse.json({
      ok: true,
      memberId,
      xp: currentData.xp,
      levelInfo,
      unlockedBadges: currentData.unlockedBadges,
      message: 'Gamificação atualizada com sucesso!',
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || 'Erro ao atualizar gamificação' }, { status: 500 });
  }
}
