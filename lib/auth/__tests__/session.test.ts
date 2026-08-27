import { describe, it, expect } from 'vitest';
import { UnauthorizedError, ForbiddenError } from '../errors';
import { assertRole } from '../session';
import type { SessionPayload } from '../jwt';

const base = { userId: 'u1', organizationId: 'o1' };
const session = (role: SessionPayload['role']): SessionPayload => ({ ...base, role });

describe('assertRole', () => {
  it('aceita papel igual ao minimo exigido', () => {
    expect(() => assertRole(session('ADMINISTRADOR'), 'Administrador')).not.toThrow();
  });

  it('aceita papel superior ao minimo', () => {
    expect(() => assertRole(session('MASTER'), 'Administrador')).not.toThrow();
  });

  it('rejeita papel inferior com ForbiddenError', () => {
    expect(() => assertRole(session('EDITOR'), 'Administrador')).toThrow(ForbiddenError);
    expect(() => assertRole(session('USUARIO'), 'Cliente')).toThrow(ForbiddenError);
  });

  it('so Master passa quando o minimo e Master', () => {
    expect(() => assertRole(session('MASTER'), 'Master')).not.toThrow();
    expect(() => assertRole(session('ADMINISTRADOR'), 'Master')).toThrow(ForbiddenError);
  });
});

describe('erros de auth', () => {
  it('carregam o status http correto', () => {
    expect(new UnauthorizedError().status).toBe(401);
    expect(new ForbiddenError().status).toBe(403);
  });

  it('trazem mensagem padrao em portugues', () => {
    expect(new UnauthorizedError().message).toMatch(/sess/i);
    expect(new ForbiddenError().message).toMatch(/permiss/i);
  });

  it('aceitam mensagem customizada', () => {
    expect(new ForbiddenError('Mensagem especifica.').message).toBe('Mensagem especifica.');
  });
});
