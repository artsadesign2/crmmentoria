export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'ACADEMY' | 'ENGAGEMENT' | 'BUSINESS' | 'SPECIAL';
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  xpValue: number;
}

export interface LevelThreshold {
  level: number;
  title: string;
  icon: string;
  minXp: number;
  maxXp: number;
}

export const GAMIFICATION_LEVELS: LevelThreshold[] = [
  { level: 1, title: 'Recruta Espacial', icon: '🚀', minXp: 0, maxXp: 500 },
  { level: 2, title: 'Piloto de Escala', icon: '🛸', minXp: 500, maxXp: 1500 },
  { level: 3, title: 'Comandante Rocket', icon: '🏆', minXp: 1500, maxXp: 3000 },
  { level: 4, title: 'Almirante de Frota', icon: '⚡', minXp: 3000, maxXp: 5000 },
  { level: 5, title: 'Mestre Galáctico High-Ticket', icon: '👑', minXp: 5000, maxXp: 999999 },
];

export const BADGE_CATALOG: BadgeDefinition[] = [
  {
    id: 'FIRST_MISSION',
    title: 'Primeira Missão',
    description: 'Concluiu a primeira aula ou onboarding na Rocket Academy.',
    icon: '🎯',
    category: 'ACADEMY',
    rarity: 'COMMON',
    xpValue: 100,
  },
  {
    id: 'ACADEMY_HALF',
    title: 'Meio Caminho Andado',
    description: 'Completou 50% ou mais dos módulos da Academy.',
    icon: '📚',
    category: 'ACADEMY',
    rarity: 'RARE',
    xpValue: 250,
  },
  {
    id: 'ACADEMY_MASTER',
    title: 'Mestre da Academy',
    description: '100% de conclusão de todas as aulas e emissão do Certificado Oficial.',
    icon: '🎓',
    category: 'ACADEMY',
    rarity: 'LEGENDARY',
    xpValue: 500,
  },
  {
    id: 'HIGH_ROLLER',
    title: 'Deal Fechado & Contrato',
    description: 'Assinatura digital do contrato ou fechamento de novo ciclo.',
    icon: '💎',
    category: 'BUSINESS',
    rarity: 'EPIC',
    xpValue: 400,
  },
  {
    id: 'NETWORK_BUILDER',
    title: 'Perfil Conectado',
    description: 'Preenchimento integral do perfil, redes sociais e dados de atuação.',
    icon: '🌐',
    category: 'ENGAGEMENT',
    rarity: 'COMMON',
    xpValue: 150,
  },
  {
    id: 'PERFECT_ATTENDANCE',
    title: 'Presença VIP 100%',
    description: 'Presença pontual em todas as sessões de mentoria 1-on-1 e encontros gerais.',
    icon: '⏱️',
    category: 'ENGAGEMENT',
    rarity: 'EPIC',
    xpValue: 300,
  },
  {
    id: 'COMMUNITY_LEADER',
    title: 'Líder de Comunidade',
    description: 'Interações ativas, feedbacks construtivos e apoio a outros mentorados.',
    icon: '🌟',
    category: 'SPECIAL',
    rarity: 'RARE',
    xpValue: 200,
  },
];

/**
 * Calcula o nível e percentual de progresso de um mentorado com base no XP total
 */
export function calculateGamificationLevel(xp: number): {
  level: number;
  title: string;
  icon: string;
  currentXp: number;
  minXp: number;
  maxXp: number;
  nextLevelXp: number;
  progressPct: number;
} {
  const currentXp = Math.max(0, xp);

  for (let i = 0; i < GAMIFICATION_LEVELS.length; i++) {
    const lvl = GAMIFICATION_LEVELS[i];
    if (currentXp < lvl.maxXp || i === GAMIFICATION_LEVELS.length - 1) {
      const range = lvl.maxXp - lvl.minXp;
      const progressInside = currentXp - lvl.minXp;
      const pct =
        i === GAMIFICATION_LEVELS.length - 1
          ? 100
          : Math.min(100, Math.max(0, parseFloat(((progressInside / range) * 100).toFixed(2))));

      return {
        level: lvl.level,
        title: lvl.title,
        icon: lvl.icon,
        currentXp,
        minXp: lvl.minXp,
        maxXp: lvl.maxXp,
        nextLevelXp: lvl.maxXp,
        progressPct: pct,
      };
    }
  }

  const highest = GAMIFICATION_LEVELS[GAMIFICATION_LEVELS.length - 1];
  return {
    level: highest.level,
    title: highest.title,
    icon: highest.icon,
    currentXp,
    minXp: highest.minXp,
    maxXp: highest.maxXp,
    nextLevelXp: highest.maxXp,
    progressPct: 100,
  };
}

/**
 * Retorna todos os badges do catálogo
 */
export function getAllBadges(): BadgeDefinition[] {
  return BADGE_CATALOG;
}

/**
 * Avalia o status do mentorado e determina quais badges estão desbloqueados
 */
export function evaluateUnlockedBadges(stats: {
  academyProgressPct?: number;
  hasSignedContract?: boolean;
  hasFullProfile?: boolean;
  attendancePct?: number;
}): {
  unlockedBadgeIds: string[];
  totalCalculatedXp: number;
} {
  const unlocked: string[] = [];
  let totalXp = 0;

  const pct = stats.academyProgressPct || 0;

  if (pct > 0) {
    unlocked.push('FIRST_MISSION');
  }
  if (pct >= 50) {
    unlocked.push('ACADEMY_HALF');
  }
  if (pct >= 100) {
    unlocked.push('ACADEMY_MASTER');
  }
  if (stats.hasSignedContract) {
    unlocked.push('HIGH_ROLLER');
  }
  if (stats.hasFullProfile) {
    unlocked.push('NETWORK_BUILDER');
  }
  if (stats.attendancePct && stats.attendancePct >= 90) {
    unlocked.push('PERFECT_ATTENDANCE');
  }

  // Somar XP dos badges conquistados
  unlocked.forEach((badgeId) => {
    const b = BADGE_CATALOG.find((item) => item.id === badgeId);
    if (b) {
      totalXp += b.xpValue;
    }
  });

  return {
    unlockedBadgeIds: unlocked,
    totalCalculatedXp: totalXp,
  };
}

/**
 * Retorna dados de gamificação síncronos e instantâneos para um mentorado específico
 */
export function getInitialGamificationForMember(memberId: string, memberData?: any): {
  xp: number;
  unlockedBadgeIds: string[];
} {
  const PRESET_MEMBER_XP: Record<string, { xp: number; badges: string[] }> = {
    '1': { xp: 3450, badges: ['FIRST_MISSION', 'ACADEMY_HALF', 'ACADEMY_MASTER', 'HIGH_ROLLER', 'NETWORK_BUILDER'] },
    '2': { xp: 2200, badges: ['FIRST_MISSION', 'ACADEMY_HALF', 'NETWORK_BUILDER', 'COMMUNITY_LEADER'] },
    '3': { xp: 1850, badges: ['FIRST_MISSION', 'ACADEMY_HALF', 'NETWORK_BUILDER'] },
    '4': { xp: 1100, badges: ['FIRST_MISSION', 'NETWORK_BUILDER'] },
    '5': { xp: 650, badges: ['FIRST_MISSION'] },
  };

  if (PRESET_MEMBER_XP[memberId]) {
    return {
      xp: PRESET_MEMBER_XP[memberId].xp,
      unlockedBadgeIds: PRESET_MEMBER_XP[memberId].badges,
    };
  }

  // Se não for preset, calcular a partir dos dados do membro
  const isHighTier = memberData?.status === 'ouro' || memberData?.status === 'diamante';
  const hasCompany = Boolean(memberData?.companyName || memberData?.tradeName);
  const baseScore = isHighTier ? 2400 : hasCompany ? 1500 : 750;
  const badges = ['FIRST_MISSION'];
  if (isHighTier) badges.push('HIGH_ROLLER', 'ACADEMY_HALF', 'NETWORK_BUILDER');
  else if (hasCompany) badges.push('NETWORK_BUILDER');

  return {
    xp: baseScore,
    unlockedBadgeIds: badges,
  };
}

