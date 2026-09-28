import { describe, it, expect } from 'vitest';
import {
  calculateGamificationLevel,
  getAllBadges,
  evaluateUnlockedBadges,
  BadgeDefinition,
} from '../badges';

describe('Gamification Engine & Badges System', () => {
  it('should calculate correct level for initial recruit', () => {
    const levelInfo = calculateGamificationLevel(150);
    expect(levelInfo.level).toBe(1);
    expect(levelInfo.title).toBe('Recruta Espacial');
    expect(levelInfo.progressPct).toBe(30); // 150 / 500 = 30%
    expect(levelInfo.nextLevelXp).toBe(500);
  });

  it('should calculate correct level for Commander Rocket', () => {
    const levelInfo = calculateGamificationLevel(1850);
    expect(levelInfo.level).toBe(3);
    expect(levelInfo.title).toBe('Comandante Rocket');
    expect(levelInfo.nextLevelXp).toBe(3000);
    expect(levelInfo.minXp).toBe(1500);
    expect(levelInfo.progressPct).toBe(23.33); // (1850 - 1500) / (3000 - 1500) * 100 = 23.33%
  });

  it('should calculate max level for galactic master', () => {
    const levelInfo = calculateGamificationLevel(6500);
    expect(levelInfo.level).toBe(5);
    expect(levelInfo.title).toBe('Mestre Galáctico High-Ticket');
    expect(levelInfo.progressPct).toBe(100);
  });

  it('should retrieve complete badge catalog with proper rarities and XP values', () => {
    const badges = getAllBadges();
    expect(badges.length).toBeGreaterThanOrEqual(6);
    expect(badges.some((b) => b.id === 'FIRST_MISSION')).toBe(true);
    expect(badges.some((b) => b.id === 'ACADEMY_MASTER')).toBe(true);
    expect(badges.some((b) => b.id === 'HIGH_ROLLER')).toBe(true);
  });

  it('should evaluate and unlock appropriate badges according to mentee achievements', () => {
    const unlocked = evaluateUnlockedBadges({
      academyProgressPct: 100,
      hasSignedContract: true,
      hasFullProfile: true,
    });

    expect(unlocked.unlockedBadgeIds).toContain('FIRST_MISSION');
    expect(unlocked.unlockedBadgeIds).toContain('ACADEMY_HALF');
    expect(unlocked.unlockedBadgeIds).toContain('ACADEMY_MASTER');
    expect(unlocked.unlockedBadgeIds).toContain('HIGH_ROLLER');
    expect(unlocked.unlockedBadgeIds).toContain('NETWORK_BUILDER');
    expect(unlocked.totalCalculatedXp).toBeGreaterThanOrEqual(1400);
  });
});
