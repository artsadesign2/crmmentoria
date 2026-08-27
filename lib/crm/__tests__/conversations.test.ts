import { describe, it, expect } from 'vitest';
import { conversationVisibilityFilter, canSeeAllConversations } from '../conversations';
import { buildSignature, applySignature } from '../signature';
import type { SessionPayload } from '@/lib/auth/jwt';

/**
 * Duas regras que erram em silêncio: quem enxerga o quê, e o que sai no fio.
 * Nenhuma das duas dá erro na tela quando quebra — só vaza.
 */

const ORG = 'org-1';
const ME = 'user-me';
const SETOR = 'dep-comercial';

const session = (role: SessionPayload['role']): SessionPayload => ({
  userId: ME,
  organizationId: ORG,
  role,
});

describe('canSeeAllConversations', () => {
  it('Administrador para cima enxerga a organizacao inteira', () => {
    expect(canSeeAllConversations(session('MASTER'))).toBe(true);
    expect(canSeeAllConversations(session('ADMINISTRADOR'))).toBe(true);
  });

  it('Editor nao enxerga conversa de terceiros', () => {
    expect(canSeeAllConversations(session('EDITOR'))).toBe(false);
  });
});

describe('conversationVisibilityFilter', () => {
  it('para Administrador, filtra apenas por organizacao', () => {
    expect(conversationVisibilityFilter(session('ADMINISTRADOR'), SETOR)).toEqual({
      organizationId: ORG,
    });
  });

  it('Editor com setor ve as suas e a fila do proprio setor', () => {
    expect(conversationVisibilityFilter(session('EDITOR'), SETOR)).toEqual({
      organizationId: ORG,
      OR: [
        { assignedUserId: ME },
        { assignedUserId: null, departmentId: SETOR },
        { assignedUserId: null, departmentId: null },
      ],
    });
  });

  it('Editor sem setor e generalista: ve as suas e a fila sem setor', () => {
    expect(conversationVisibilityFilter(session('EDITOR'), null)).toEqual({
      organizationId: ORG,
      OR: [{ assignedUserId: ME }, { assignedUserId: null, departmentId: null }],
    });
  });

  it('o escopo de organizacao esta presente em todos os casos', () => {
    for (const papel of ['MASTER', 'ADMINISTRADOR', 'EDITOR', 'CLIENTE', 'USUARIO'] as const) {
      expect(conversationVisibilityFilter(session(papel), SETOR).organizationId).toBe(ORG);
    }
  });

  it('Editor nunca ve a fila de outro setor', () => {
    const filtro = conversationVisibilityFilter(session('EDITOR'), SETOR);
    const setoresVisiveis = (filtro.OR ?? []).map((c) => c.departmentId);

    expect(setoresVisiveis).not.toContain('dep-suporte');
  });
});

describe('buildSignature', () => {
  it('usa o primeiro nome em negrito, com quebra de linha', () => {
    expect(buildSignature('Marcio Araujo')).toBe('*Marcio*\n');
  });

  it('nome unico funciona', () => {
    expect(buildSignature('Marcio')).toBe('*Marcio*\n');
  });

  it('espacos sobrando nao entram na assinatura', () => {
    expect(buildSignature('   Marcio   Araujo  ')).toBe('*Marcio*\n');
  });

  it('nome vazio nao produz assinatura quebrada', () => {
    expect(buildSignature('')).toBe('');
    expect(buildSignature('   ')).toBe('');
  });
});

describe('applySignature', () => {
  it('prefixa o texto do atendente', () => {
    expect(applySignature('Bom dia!', 'Marcio Araujo', true)).toBe('*Marcio*\nBom dia!');
  });

  it('desligada na organizacao, o texto sai como foi digitado', () => {
    expect(applySignature('Bom dia!', 'Marcio Araujo', false)).toBe('Bom dia!');
  });

  it('sem nome de autor, nao inventa assinatura', () => {
    expect(applySignature('Bom dia!', null, true)).toBe('Bom dia!');
  });
});
