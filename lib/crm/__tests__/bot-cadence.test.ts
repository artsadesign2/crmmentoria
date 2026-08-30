import { describe, expect, it } from 'vitest';
import {
  ORCAMENTO_TOTAL_MS,
  RITMO_HUMANO,
  RITMO_IMEDIATO,
  ritmoDaSequencia,
  tempoDeDigitacao,
  tempoDeLeitura,
} from '@/lib/bot/cadence';

/**
 * O ritmo é a parte da humanização que ninguém revisa lendo o código: um
 * número errado aqui não quebra teste nenhum em produção, só faz o robô voltar
 * a parecer robô — ou faz o webhook estourar o tempo e a Evolution reenviar
 * tudo em dobro.
 */

const CURTA = 'ok';
const MEDIA = 'Perfeito, consigo te ajudar com isso.'; // 37 caracteres
const LONGA = 'x'.repeat(500);

describe('tempoDeLeitura', () => {
  it('cresce com o tamanho do que o cliente escreveu', () => {
    const curta = tempoDeLeitura('oi');
    const media = tempoDeLeitura('oi, queria entender melhor como funciona o acompanhamento');

    expect(media).toBeGreaterThan(curta);
  });

  it('mensagem vazia não gera pausa de leitura', () => {
    // É o caso da varredura: o robô abre a conversa sem nada ter chegado, e
    // não há o que ler.
    expect(tempoDeLeitura('')).toBe(0);
    expect(tempoDeLeitura('   ')).toBe(0);
  });

  it('respeita piso e teto', () => {
    expect(tempoDeLeitura(CURTA)).toBe(RITMO_HUMANO.leituraPisoMs);
    expect(tempoDeLeitura(LONGA)).toBe(RITMO_HUMANO.leituraTetoMs);
  });
});

describe('tempoDeDigitacao', () => {
  it('cresce com o tamanho do que o robô vai mandar', () => {
    expect(tempoDeDigitacao(MEDIA)).toBeGreaterThan(tempoDeDigitacao(CURTA));
  });

  it('respeita piso e teto', () => {
    // Mesmo "ok" leva um instante para ser digitado — zero denunciaria tanto
    // quanto a resposta instantânea.
    expect(tempoDeDigitacao(CURTA)).toBe(RITMO_HUMANO.digitacaoPisoMs);
    expect(tempoDeDigitacao(LONGA)).toBe(RITMO_HUMANO.digitacaoTetoMs);
  });

  it('texto vazio não gera digitação', () => {
    expect(tempoDeDigitacao('')).toBe(0);
  });
});

describe('ritmo desligado', () => {
  it('devolve tudo em zero, restaurando o comportamento anterior', () => {
    expect(tempoDeLeitura(MEDIA, RITMO_IMEDIATO)).toBe(0);
    expect(tempoDeDigitacao(MEDIA, RITMO_IMEDIATO)).toBe(0);

    const passos = ritmoDaSequencia([MEDIA, MEDIA], MEDIA, RITMO_IMEDIATO);
    expect(passos.every((p) => p.leituraMs === 0 && p.digitacaoMs === 0)).toBe(true);
  });
});

describe('ritmoDaSequencia', () => {
  it('só a primeira bolha paga a leitura', () => {
    const passos = ritmoDaSequencia([MEDIA, MEDIA, MEDIA], 'e sobre o valor?');

    expect(passos[0].leituraMs).toBeGreaterThan(0);
    expect(passos[1].leituraMs).toBe(0);
    expect(passos[2].leituraMs).toBe(0);
  });

  it('toda bolha tem sua própria digitação', () => {
    const passos = ritmoDaSequencia([MEDIA, MEDIA], 'oi');

    expect(passos[0].digitacaoMs).toBeGreaterThan(0);
    expect(passos[1].digitacaoMs).toBeGreaterThan(0);
  });

  it('preserva o texto e a ordem', () => {
    const passos = ritmoDaSequencia(['um', 'dois', 'tres'], 'oi');
    expect(passos.map((p) => p.texto)).toEqual(['um', 'dois', 'tres']);
  });

  it('nunca passa do orçamento, por mais bolhas que existam', () => {
    const muitas = Array.from({ length: 12 }, () => LONGA);
    const passos = ritmoDaSequencia(muitas, LONGA);

    const total = passos.reduce((s, p) => s + p.leituraMs + p.digitacaoMs, 0);
    expect(total).toBeLessThanOrEqual(ORCAMENTO_TOTAL_MS);
  });

  it('corta as últimas bolhas, não todas por igual', () => {
    // Encolher tudo proporcionalmente deixaria a conversa uniformemente
    // acelerada — o defeito que este módulo existe para corrigir. É melhor
    // duas bolhas no ritmo certo e a terceira apressada.
    const passos = ritmoDaSequencia([LONGA, LONGA, LONGA], LONGA, RITMO_HUMANO, 7000);

    // A primeira leva o orçamento inteiro: leitura no teto (2600) e o que
    // sobra em digitação (4400). As seguintes saem secas.
    expect(passos[0].leituraMs).toBe(RITMO_HUMANO.leituraTetoMs);
    expect(passos[0].digitacaoMs).toBe(7000 - RITMO_HUMANO.leituraTetoMs);
    expect(passos[1].digitacaoMs).toBe(0);
    expect(passos[2].digitacaoMs).toBe(0);
  });

  it('orçamento zerado devolve tudo em zero sem quebrar', () => {
    const passos = ritmoDaSequencia([MEDIA, MEDIA], MEDIA, RITMO_HUMANO, 0);

    expect(passos).toHaveLength(2);
    expect(passos.every((p) => p.leituraMs === 0 && p.digitacaoMs === 0)).toBe(true);
  });

  it('sequência vazia devolve lista vazia', () => {
    expect(ritmoDaSequencia([], 'oi')).toEqual([]);
  });
});
