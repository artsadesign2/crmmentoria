import { describe, it, expect } from 'vitest';
import { normalizePhone, formatPhoneBr } from '../phone';

describe('normalizePhone', () => {
  it('converge as formas do mesmo celular de Sao Paulo', () => {
    const esperado = '5511987654321';
    for (const entrada of [
      '(11) 98765-4321',
      '11987654321',
      '+55 11 98765-4321',
      '5511987654321',
      '+5511987654321',
      ' 11 9 8765 4321 ',
    ]) {
      expect(normalizePhone(entrada)).toBe(esperado);
    }
  });

  it('trata fixo de 8 digitos com DDD', () => {
    expect(normalizePhone('(11) 3456-7890')).toBe('551134567890');
  });

  it('preserva numeros internacionais que nao sao do Brasil', () => {
    expect(normalizePhone('+1 415 555 0123')).toBe('14155550123');
  });

  it('devolve string vazia para entrada sem digitos', () => {
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone('sem numero')).toBe('');
  });

  it('nao inventa DDI para numero curto demais', () => {
    expect(normalizePhone('1234')).toBe('1234');
  });
});

describe('formatPhoneBr', () => {
  it('formata celular brasileiro para exibicao', () => {
    expect(formatPhoneBr('5511987654321')).toBe('(11) 98765-4321');
  });

  it('formata fixo brasileiro', () => {
    expect(formatPhoneBr('551134567890')).toBe('(11) 3456-7890');
  });

  it('devolve o numero como veio quando nao reconhece o formato', () => {
    expect(formatPhoneBr('14155550123')).toBe('14155550123');
    expect(formatPhoneBr('')).toBe('');
  });

  it('e inversa de normalizePhone para numeros brasileiros', () => {
    expect(normalizePhone(formatPhoneBr('5511987654321'))).toBe('5511987654321');
  });
});
