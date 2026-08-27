import { describe, it, expect } from 'vitest';
import { canAttend, pickAgent, JANELA_ONLINE_MS, type RoutingCandidate } from '../routing';

/**
 * A distribuição decide quem recebe cada cliente. Se ela errar em silêncio,
 * alguém trabalha o dobro ou uma conversa some na caixa de quem foi almoçar —
 * e ninguém descobre olhando a tela.
 */

const AGORA = new Date('2026-08-27T12:00:00Z');

/** Minutos atrás, a partir de AGORA. */
function atras(minutos: number): Date {
  return new Date(AGORA.getTime() - minutos * 60_000);
}

function candidato(over: Partial<RoutingCandidate> & { id: string }): RoutingCandidate {
  return {
    role: 'EDITOR',
    status: 'ATIVO',
    lastActiveAt: atras(1),
    openConversations: 0,
    lastAssignedAt: atras(60),
    ...over,
  };
}

describe('canAttend', () => {
  it('Master, Administrador e Editor atendem', () => {
    expect(canAttend('MASTER', 'ATIVO')).toBe(true);
    expect(canAttend('ADMINISTRADOR', 'ATIVO')).toBe(true);
    expect(canAttend('EDITOR', 'ATIVO')).toBe(true);
  });

  it('Cliente e Usuario nunca recebem conversa', () => {
    expect(canAttend('CLIENTE', 'ATIVO')).toBe(false);
    expect(canAttend('USUARIO', 'ATIVO')).toBe(false);
  });

  it('quem nao esta ATIVO nao atende, por mais alto que seja o cargo', () => {
    expect(canAttend('MASTER', 'INATIVO')).toBe(false);
    expect(canAttend('MASTER', 'BLOQUEADO')).toBe(false);
  });
});

describe('pickAgent — carga', () => {
  it('escolhe quem tem menos conversas abertas', () => {
    const escolhido = pickAgent(
      [
        candidato({ id: 'ana', openConversations: 5 }),
        candidato({ id: 'bruno', openConversations: 1 }),
        candidato({ id: 'carla', openConversations: 3 }),
      ],
      AGORA
    );

    expect(escolhido).toBe('bruno');
  });

  it('empate na carga resolve por quem recebeu conversa ha mais tempo', () => {
    const escolhido = pickAgent(
      [
        candidato({ id: 'ana', openConversations: 2, lastAssignedAt: atras(5) }),
        candidato({ id: 'bruno', openConversations: 2, lastAssignedAt: atras(90) }),
      ],
      AGORA
    );

    expect(escolhido).toBe('bruno');
  });

  it('quem nunca recebeu conversa vem antes de quem ja recebeu', () => {
    const escolhido = pickAgent(
      [
        candidato({ id: 'ana', openConversations: 0, lastAssignedAt: atras(300) }),
        candidato({ id: 'bruno', openConversations: 0, lastAssignedAt: null }),
      ],
      AGORA
    );

    expect(escolhido).toBe('bruno');
  });

  it('empate total resolve por id, para a escolha ser reproduzivel', () => {
    const candidatos = [
      candidato({ id: 'zeca', openConversations: 1, lastAssignedAt: null }),
      candidato({ id: 'ana', openConversations: 1, lastAssignedAt: null }),
    ];

    expect(pickAgent(candidatos, AGORA)).toBe('ana');
    // A ordem de entrada nao pode mudar o resultado.
    expect(pickAgent([...candidatos].reverse(), AGORA)).toBe('ana');
  });
});

describe('pickAgent — presenca', () => {
  it('ignora quem nao aparece ha mais de 15 minutos, mesmo ocioso', () => {
    const escolhido = pickAgent(
      [
        candidato({ id: 'ausente', openConversations: 0, lastActiveAt: atras(40) }),
        candidato({ id: 'presente', openConversations: 7, lastActiveAt: atras(2) }),
      ],
      AGORA
    );

    // Sete conversas na mão de quem está aqui é melhor do que zero na de quem saiu.
    expect(escolhido).toBe('presente');
  });

  it('quem nunca acessou nao e considerado presente', () => {
    expect(pickAgent([candidato({ id: 'novato', lastActiveAt: null })], AGORA)).toBeNull();
  });

  it('a janela de presenca e configuravel', () => {
    const candidatos = [candidato({ id: 'ana', lastActiveAt: atras(30) })];

    expect(pickAgent(candidatos, AGORA)).toBeNull();
    expect(pickAgent(candidatos, AGORA, 60 * 60_000)).toBe('ana');
  });

  it('a janela padrao e de 15 minutos', () => {
    expect(JANELA_ONLINE_MS).toBe(15 * 60_000);
  });
});

describe('pickAgent — fila', () => {
  it('sem ninguem online, devolve null e a conversa fica na fila', () => {
    const escolhido = pickAgent(
      [
        candidato({ id: 'ana', lastActiveAt: atras(40) }),
        candidato({ id: 'bruno', lastActiveAt: atras(120) }),
      ],
      AGORA
    );

    expect(escolhido).toBeNull();
  });

  it('lista vazia devolve null', () => {
    expect(pickAgent([], AGORA)).toBeNull();
  });

  it('descarta quem nao pode atender antes de olhar carga', () => {
    const escolhido = pickAgent(
      [
        candidato({ id: 'cliente', role: 'CLIENTE', openConversations: 0 }),
        candidato({ id: 'inativo', status: 'INATIVO', openConversations: 0 }),
        candidato({ id: 'editor', openConversations: 9 }),
      ],
      AGORA
    );

    expect(escolhido).toBe('editor');
  });
});
