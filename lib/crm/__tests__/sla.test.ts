import { describe, it, expect } from 'vitest';
import { slaState, slaProgress, relativeTime } from '../sla';

const AGORA = new Date('2026-08-27T12:00:00.000Z');
const emHoras = (h: number) => new Date(AGORA.getTime() + h * 3_600_000).toISOString();

describe('slaState', () => {
  it('sem prazo definido, nao ha estado a mostrar', () => {
    expect(slaState(null, AGORA)).toBe('none');
    expect(slaState(undefined, AGORA)).toBe('none');
  });

  it('com folga confortavel, fica ok', () => {
    expect(slaState(emHoras(8), AGORA)).toBe('ok');
  });

  it('perto do limite, avisa', () => {
    expect(slaState(emHoras(1), AGORA)).toBe('warning');
  });

  it('prazo vencido, alerta', () => {
    expect(slaState(emHoras(-1), AGORA)).toBe('overdue');
  });

  it('exatamente no limite conta como vencido', () => {
    expect(slaState(AGORA.toISOString(), AGORA)).toBe('overdue');
  });
});

describe('slaProgress', () => {
  it('devolve null quando nao ha prazo', () => {
    expect(slaProgress(null, null, AGORA)).toBeNull();
  });

  it('na metade do intervalo, devolve 0.5', () => {
    const inicio = new Date(AGORA.getTime() - 3_600_000).toISOString(); // 1h atras
    const fim = emHoras(1); // 1h a frente
    expect(slaProgress(fim, inicio, AGORA)).toBeCloseTo(0.5, 2);
  });

  it('nunca passa de 1, mesmo muito vencido', () => {
    const inicio = new Date(AGORA.getTime() - 10 * 3_600_000).toISOString();
    expect(slaProgress(emHoras(-5), inicio, AGORA)).toBe(1);
  });

  it('nunca fica negativo', () => {
    const inicio = emHoras(1);
    expect(slaProgress(emHoras(2), inicio, AGORA)).toBe(0);
  });
});

describe('relativeTime', () => {
  it('menos de um minuto vira agora', () => {
    expect(relativeTime(new Date(AGORA.getTime() - 30_000).toISOString(), AGORA)).toBe('agora');
  });

  it('minutos, horas e dias', () => {
    expect(relativeTime(new Date(AGORA.getTime() - 5 * 60_000).toISOString(), AGORA)).toBe('5min');
    expect(relativeTime(new Date(AGORA.getTime() - 3 * 3_600_000).toISOString(), AGORA)).toBe('3h');
    expect(relativeTime(new Date(AGORA.getTime() - 2 * 86_400_000).toISOString(), AGORA)).toBe('2d');
  });

  it('sem data, devolve string vazia', () => {
    expect(relativeTime(null, AGORA)).toBe('');
  });
});
