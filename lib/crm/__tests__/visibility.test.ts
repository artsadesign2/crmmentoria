import { describe, it, expect } from 'vitest';
import { canSeeAllDeals, dealVisibilityFilter } from '../visibility';
import type { SessionPayload } from '@/lib/auth/jwt';

const ORG = 'org-1';
const ME = 'user-me';

const session = (role: SessionPayload['role']): SessionPayload => ({
  userId: ME,
  organizationId: ORG,
  role,
});

describe('canSeeAllDeals', () => {
  it('Master e Administrador enxergam todos os cards', () => {
    expect(canSeeAllDeals(session('MASTER'))).toBe(true);
    expect(canSeeAllDeals(session('ADMINISTRADOR'))).toBe(true);
  });

  it('Editor, Cliente e Usuario nao enxergam cards de terceiros', () => {
    expect(canSeeAllDeals(session('EDITOR'))).toBe(false);
    expect(canSeeAllDeals(session('CLIENTE'))).toBe(false);
    expect(canSeeAllDeals(session('USUARIO'))).toBe(false);
  });
});

describe('dealVisibilityFilter', () => {
  it('para Administrador, filtra apenas por organizacao', () => {
    expect(dealVisibilityFilter(session('ADMINISTRADOR'))).toEqual({ organizationId: ORG });
  });

  it('para Editor, restringe ao que e seu ou nao atribuido', () => {
    expect(dealVisibilityFilter(session('EDITOR'))).toEqual({
      organizationId: ORG,
      OR: [{ assignedUserId: ME }, { assignedUserId: null, isPrivate: false }],
    });
  });

  it('nunca omite o escopo de organizacao', () => {
    for (const role of ['MASTER', 'ADMINISTRADOR', 'EDITOR', 'CLIENTE', 'USUARIO'] as const) {
      expect(dealVisibilityFilter(session(role))).toHaveProperty('organizationId', ORG);
    }
  });

  it('card privado sem responsavel nao vaza para quem nao e admin', () => {
    const filtro = dealVisibilityFilter(session('EDITOR'));
    // O ramo de cards sem responsavel exige isPrivate: false.
    expect(filtro.OR?.[1]).toEqual({ assignedUserId: null, isPrivate: false });
  });
});
