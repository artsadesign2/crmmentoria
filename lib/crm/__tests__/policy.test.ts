import { describe, it, expect } from 'vitest';
import {
  nextSendDelay,
  withinWindow,
  remainingQuota,
  POLITICA_PADRAO,
  type DispatchPolicy,
} from '@/lib/dispatch/policy';

/**
 * A política é o anti-bloqueio inteiro. Ela erra em silêncio: um jitter que na
 * prática não varia, ou uma janela calculada no fuso errado, não dá erro
 * nenhum — só aumenta a chance de o número ser bloqueado, e ninguém liga uma
 * coisa à outra.
 */

function politica(over: Partial<DispatchPolicy> = {}): DispatchPolicy {
  return { ...POLITICA_PADRAO, ...over };
}

describe('nextSendDelay', () => {
  it('fica entre o intervalo minimo e minimo + jitter', () => {
    const p = politica({ minIntervalMs: 4000, jitterMs: 3000 });

    for (let i = 0; i < 200; i++) {
      const atraso = nextSendDelay(p);
      expect(atraso).toBeGreaterThanOrEqual(4000);
      expect(atraso).toBeLessThanOrEqual(7000);
    }
  });

  it('com rng fixo o valor e deterministico', () => {
    const p = politica({ minIntervalMs: 4000, jitterMs: 3000 });

    expect(nextSendDelay(p, () => 0)).toBe(4000);
    expect(nextSendDelay(p, () => 1)).toBe(7000);
    expect(nextSendDelay(p, () => 0.5)).toBe(5500);
  });

  it('o jitter existe de fato: rngs diferentes dao atrasos diferentes', () => {
    const p = politica({ minIntervalMs: 4000, jitterMs: 3000 });
    expect(nextSendDelay(p, () => 0.1)).not.toBe(nextSendDelay(p, () => 0.9));
  });

  it('jitter zero devolve exatamente o intervalo minimo', () => {
    // Cadência perfeitamente regular é assinatura de robô, mas quem configurar
    // assim deve obter o que pediu.
    const p = politica({ minIntervalMs: 4000, jitterMs: 0 });
    expect(nextSendDelay(p)).toBe(4000);
  });

  it('o padrao tem jitter: o codigo antigo nao tinha, e e o item que mais importa', () => {
    expect(POLITICA_PADRAO.jitterMs).toBeGreaterThan(0);
  });

  it('o intervalo padrao e mais lento que o 1500ms do laco antigo', () => {
    expect(POLITICA_PADRAO.minIntervalMs).toBeGreaterThan(1500);
  });
});

describe('withinWindow', () => {
  const p = politica({ windowStartHour: 8, windowEndHour: 20, timeZone: 'America/Sao_Paulo' });

  it('meio-dia em Sao Paulo esta dentro', () => {
    // 15:00 UTC = 12:00 em São Paulo (UTC-3)
    expect(withinWindow(p, new Date('2026-08-27T15:00:00Z'))).toBe(true);
  });

  it('tres da manha em Sao Paulo esta fora', () => {
    // 06:00 UTC = 03:00 em São Paulo
    expect(withinWindow(p, new Date('2026-08-27T06:00:00Z'))).toBe(false);
  });

  it('usa o fuso da organizacao, nao o do servidor', () => {
    // 02:00 UTC do dia 28 = 23:00 em São Paulo do dia 27. Em UTC seriam 2h,
    // que também está fora — então o caso decisivo é o oposto:
    // 10:00 UTC = 07:00 em São Paulo. Dentro da janela em UTC, fora em SP.
    expect(withinWindow(p, new Date('2026-08-27T10:00:00Z'))).toBe(false);

    // 22:00 UTC = 19:00 em São Paulo. Fora em UTC, dentro em SP.
    expect(withinWindow(p, new Date('2026-08-27T22:00:00Z'))).toBe(true);
  });

  it('a borda de inicio esta dentro e a de fim esta fora', () => {
    // 11:00 UTC = 08:00 em São Paulo
    expect(withinWindow(p, new Date('2026-08-27T11:00:00Z'))).toBe(true);
    // 23:00 UTC = 20:00 em São Paulo
    expect(withinWindow(p, new Date('2026-08-27T23:00:00Z'))).toBe(false);
  });

  it('janela que cruza a meia-noite funciona', () => {
    const noturna = politica({ windowStartHour: 22, windowEndHour: 6 });

    // 02:00 UTC = 23:00 em SP — dentro
    expect(withinWindow(noturna, new Date('2026-08-28T02:00:00Z'))).toBe(true);
    // 07:00 UTC = 04:00 em SP — dentro
    expect(withinWindow(noturna, new Date('2026-08-28T07:00:00Z'))).toBe(true);
    // 18:00 UTC = 15:00 em SP — fora
    expect(withinWindow(noturna, new Date('2026-08-28T18:00:00Z'))).toBe(false);
  });

  it('janela de 0 a 24 aceita qualquer hora', () => {
    const sempre = politica({ windowStartHour: 0, windowEndHour: 24 });

    expect(withinWindow(sempre, new Date('2026-08-27T06:00:00Z'))).toBe(true);
    expect(withinWindow(sempre, new Date('2026-08-27T18:00:00Z'))).toBe(true);
  });
});

describe('remainingQuota', () => {
  const p = politica({ maxPerMinute: 12, dailyCap: 300 });

  it('sem nada enviado, cabe o teto do minuto', () => {
    expect(remainingQuota(p, 0, 0)).toBe(12);
  });

  it('desconta o que ja saiu neste minuto', () => {
    expect(remainingQuota(p, 5, 0)).toBe(7);
  });

  it('teto do minuto atingido devolve zero', () => {
    expect(remainingQuota(p, 12, 0)).toBe(0);
  });

  it('nunca devolve negativo, mesmo com contagem acima do teto', () => {
    expect(remainingQuota(p, 99, 0)).toBe(0);
    expect(remainingQuota(p, 0, 999)).toBe(0);
  });

  it('o teto diario limita mesmo com o minuto livre', () => {
    expect(remainingQuota(p, 0, 295)).toBe(5);
    expect(remainingQuota(p, 0, 300)).toBe(0);
  });

  it('vale o menor dos dois tetos', () => {
    // Cabem 7 no minuto e 3 no dia: 3.
    expect(remainingQuota(p, 5, 297)).toBe(3);
  });
});
