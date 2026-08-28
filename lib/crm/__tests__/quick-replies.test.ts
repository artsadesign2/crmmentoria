import { describe, it, expect } from 'vitest';
import {
  interpolateQuickReply,
  normalizeShortcut,
  QuickReplyError,
} from '@/lib/crm/quick-reply-text';

/**
 * A resposta rápida é escrita uma vez e enviada centenas de vezes. Um erro de
 * interpolação aqui não aparece em teste manual — aparece na conversa do
 * cliente, como "Olá {{nome}}".
 */

describe('interpolateQuickReply', () => {
  it('substitui nome e empresa', () => {
    const saida = interpolateQuickReply('Olá {{nome}}, aqui é da {{empresa}}.', {
      nome: 'Ana',
      empresa: 'Rocket Club',
    });

    expect(saida).toBe('Olá Ana, aqui é da Rocket Club.');
  });

  it('empresa ausente vira algo apresentavel, nunca "undefined"', () => {
    const saida = interpolateQuickReply('Olá {{nome}}, da {{empresa}}.', { nome: 'Ana' });

    expect(saida).not.toContain('undefined');
    expect(saida).not.toContain('{{');
    expect(saida).not.toMatch(/ {2}/);
  });

  it('chave desconhecida fica literal e nao quebra o resto', () => {
    const saida = interpolateQuickReply('Oi {{nome}}, seu {{cpf}} confere?', { nome: 'Ana' });

    expect(saida).toBe('Oi Ana, seu {{cpf}} confere?');
  });

  it('conteudo sem chave passa intacto', () => {
    const texto = 'Atendemos de segunda a sexta, das 9h às 18h.';
    expect(interpolateQuickReply(texto, { nome: 'Ana' })).toBe(texto);
  });

  it('a mesma chave repetida e substituida em todas as ocorrencias', () => {
    expect(interpolateQuickReply('{{nome}}? {{nome}}!', { nome: 'Ana' })).toBe('Ana? Ana!');
  });
});

describe('normalizeShortcut', () => {
  it('tira a barra que o atendente digita', () => {
    expect(normalizeShortcut('/preco')).toBe('preco');
  });

  it('normaliza caixa e acento para o atalho ser digitavel', () => {
    expect(normalizeShortcut('Endereço')).toBe('endereco');
  });

  it('espaco vira hifen: atalho com espaco nao e atalho', () => {
    expect(normalizeShortcut('horario de atendimento')).toBe('horario-de-atendimento');
  });

  it('recusa atalho vazio', () => {
    expect(() => normalizeShortcut('/')).toThrow(QuickReplyError);
    expect(() => normalizeShortcut('   ')).toThrow(QuickReplyError);
  });

  it('recusa atalho longo demais para a coluna', () => {
    expect(() => normalizeShortcut('a'.repeat(41))).toThrow(QuickReplyError);
  });
});
