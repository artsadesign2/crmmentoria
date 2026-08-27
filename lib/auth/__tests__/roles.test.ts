import { describe, it, expect } from 'vitest';
import { roleToLabel, labelToRole, hasAtLeastRole, roleRank } from '../roles';
import { ROLE_HIERARCHIES, type UserRole } from '@/lib/permissions';

describe('roles', () => {
  it('roleToLabel e labelToRole sao inversas para os cinco papeis', () => {
    for (const label of Object.keys(ROLE_HIERARCHIES) as UserRole[]) {
      expect(roleToLabel(labelToRole(label))).toBe(label);
    }
  });

  it('mapeia Usuario com acento para USUARIO sem acento', () => {
    expect(labelToRole('Usuário')).toBe('USUARIO');
    expect(roleToLabel('USUARIO')).toBe('Usuário');
  });

  it('hasAtLeastRole respeita a hierarquia de ranks', () => {
    expect(hasAtLeastRole('MASTER', 'Administrador')).toBe(true);
    expect(hasAtLeastRole('ADMINISTRADOR', 'Administrador')).toBe(true);
    expect(hasAtLeastRole('EDITOR', 'Administrador')).toBe(false);
    expect(hasAtLeastRole('USUARIO', 'Cliente')).toBe(false);
  });

  it('roleRank espelha os ranks definidos em permissions.ts', () => {
    expect(roleRank('MASTER')).toBe(5);
    expect(roleRank('ADMINISTRADOR')).toBe(4);
    expect(roleRank('EDITOR')).toBe(3);
    expect(roleRank('CLIENTE')).toBe(2);
    expect(roleRank('USUARIO')).toBe(1);
  });
});
