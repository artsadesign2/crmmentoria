import { describe, expect, it } from 'vitest';
import { validateGraph } from '@/lib/bot/validate';
import { montarGrafo } from '@/lib/bot/seed-triagem';
import type { BotEdge, BotGraph, BotNode, BotNodeType } from '@/lib/bot/types';

/**
 * A validação do grafo.
 *
 * Ela existe para um momento só: publicar. É a última porta antes de o fluxo
 * alcançar um cliente de verdade, e cada defeito que passa daqui vira uma
 * conversa esquisita com uma pessoa real — um menu cuja opção 3 não leva a
 * lugar nenhum, uma mensagem em branco, um laço que dispara cinco mensagens
 * seguidas e transfere.
 *
 * Todo problema aponta um `nodeId` sempre que existe um nó culpado: a tela
 * precisa poder acender o nó certo no canvas, e não só dizer "há um erro".
 */

function no(id: string, type: BotNodeType, data: BotNode['data'] = {}): BotNode {
  return { id, type, position: { x: 0, y: 0 }, data };
}

function aresta(source: string, target: string, sourceHandle: string | null = null): BotEdge {
  return { id: `${source}->${target}:${sourceHandle ?? ''}`, source, target, sourceHandle };
}

function grafo(nodes: BotNode[], edges: BotEdge[]): BotGraph {
  return { nodes, edges };
}

/** Os problemas em texto, para as asserções lerem como frase. */
function mensagens(g: BotGraph): string[] {
  return validateGraph(g).map((p) => p.mensagem);
}

function temProblemaEm(g: BotGraph, nodeId: string): boolean {
  return validateGraph(g).some((p) => p.nodeId === nodeId);
}

describe('validateGraph — o início', () => {
  it('grafo vazio reclama da falta de início', () => {
    const problemas = validateGraph({ nodes: [], edges: [] });

    expect(problemas).toHaveLength(1);
    expect(problemas[0].mensagem).toMatch(/início/i);
    expect(problemas[0].nodeId).toBeNull();
  });

  it('dois nós de início são um problema', () => {
    const g = grafo(
      [no('a', 'START'), no('b', 'START'), no('fim', 'END', { text: 'tchau' })],
      [aresta('a', 'fim'), aresta('b', 'fim')]
    );

    // O motor devolve `null` com dois START em vez de escolher um: escolher
    // faria o bot atender por um fluxo que ninguém desenhou.
    expect(mensagens(g).some((m) => /mais de um|dois/i.test(m))).toBe(true);
  });
});

describe('validateGraph — as ligações', () => {
  it('aresta apontando para nó inexistente é problema, com o culpado', () => {
    const g = grafo(
      [no('start', 'START'), no('oi', 'MESSAGE', { text: 'Olá' })],
      [aresta('start', 'oi'), aresta('oi', 'fantasma')]
    );

    expect(temProblemaEm(g, 'oi')).toBe(true);
    expect(mensagens(g).some((m) => m.includes('fantasma'))).toBe(true);
  });

  it('nó que o início não alcança é problema, apontando o nó', () => {
    const g = grafo(
      [
        no('start', 'START'),
        no('fim', 'END', { text: 'tchau' }),
        no('orfao', 'MESSAGE', { text: 'ninguém me vê' }),
      ],
      [aresta('start', 'fim')]
    );

    expect(temProblemaEm(g, 'orfao')).toBe(true);
    expect(mensagens(g).some((m) => /não é alcançad/i.test(m))).toBe(true);
  });

  it('dois nós com o mesmo id é problema: o motor acharia sempre o primeiro', () => {
    const g = grafo(
      [no('start', 'START'), no('x', 'END', { text: 'a' }), no('x', 'END', { text: 'b' })],
      [aresta('start', 'x')]
    );

    expect(mensagens(g).some((m) => /repetid|duplicad/i.test(m))).toBe(true);
  });
});

describe('validateGraph — perguntas', () => {
  it('opção sem aresta correspondente é problema', () => {
    const g = grafo(
      [
        no('start', 'START'),
        no('menu', 'QUESTION', {
          text: 'Com quem falar?',
          options: [
            { key: '1', label: 'Vendas' },
            { key: '2', label: 'Suporte' },
          ],
        }),
        no('vendas', 'TRANSFER', { departmentId: null }),
      ],
      [aresta('start', 'menu'), aresta('menu', 'vendas', '1')]
    );

    expect(temProblemaEm(g, 'menu')).toBe(true);
    expect(mensagens(g).some((m) => m.includes('Suporte'))).toBe(true);
  });

  it('pergunta sem texto enviaria uma mensagem em branco', () => {
    const g = grafo(
      [
        no('start', 'START'),
        no('menu', 'QUESTION', { options: [{ key: '1', label: 'Vendas' }] }),
        no('vendas', 'TRANSFER', {}),
      ],
      [aresta('start', 'menu'), aresta('menu', 'vendas', '1')]
    );

    expect(mensagens(g).some((m) => /texto/i.test(m))).toBe(true);
  });

  it('pergunta de campo livre é válida — mas precisa levar a algum lugar', () => {
    // O motor trata pergunta sem opções como campo livre de propósito: é assim
    // que se pede um e-mail ou um CPF. O defeito não é não ter opções; é o
    // cliente responder e o fluxo acabar ali, sem nada acontecer.
    const semSaida = grafo(
      [no('start', 'START'), no('email', 'QUESTION', { text: 'Qual seu e-mail?' })],
      [aresta('start', 'email')]
    );

    expect(temProblemaEm(semSaida, 'email')).toBe(true);

    const comSaida = grafo(
      [
        no('start', 'START'),
        no('email', 'QUESTION', { text: 'Qual seu e-mail?' }),
        no('guardar', 'CAPTURE', { field: 'email' }),
        no('fim', 'END', { text: 'Obrigado!' }),
      ],
      [aresta('start', 'email'), aresta('email', 'guardar'), aresta('guardar', 'fim')]
    );

    expect(validateGraph(comSaida)).toEqual([]);
  });
});

describe('validateGraph — os outros nós', () => {
  it('condição sem variável não tem o que comparar', () => {
    const g = grafo(
      [
        no('start', 'START'),
        no('se', 'CONDITION', { equals: 'sim' }),
        no('sim', 'END', { text: 'a' }),
        no('nao', 'END', { text: 'b' }),
      ],
      [aresta('start', 'se'), aresta('se', 'sim', 'true'), aresta('se', 'nao', 'false')]
    );

    expect(temProblemaEm(g, 'se')).toBe(true);
    expect(mensagens(g).some((m) => /variável/i.test(m))).toBe(true);
  });

  it('condição sem a saída "false" abandona metade dos clientes', () => {
    const g = grafo(
      [
        no('start', 'START'),
        no('se', 'CONDITION', { variable: 'plano', equals: 'ouro' }),
        no('sim', 'END', { text: 'a' }),
      ],
      [aresta('start', 'se'), aresta('se', 'sim', 'true')]
    );

    expect(mensagens(g).some((m) => /false|não confere|falso/i.test(m))).toBe(true);
  });

  it('captura sem campo não guarda nada', () => {
    const g = grafo(
      [no('start', 'START'), no('cap', 'CAPTURE', {}), no('fim', 'END', { text: 'ok' })],
      [aresta('start', 'cap'), aresta('cap', 'fim')]
    );

    expect(temProblemaEm(g, 'cap')).toBe(true);
  });

  it('mensagem sem texto é um nó que não faz nada', () => {
    const g = grafo(
      [no('start', 'START'), no('vazio', 'MESSAGE', {}), no('fim', 'END', { text: 'ok' })],
      [aresta('start', 'vazio'), aresta('vazio', 'fim')]
    );

    expect(temProblemaEm(g, 'vazio')).toBe(true);
  });
});

describe('validateGraph — ciclos', () => {
  it('ciclo do qual não se sai é problema', () => {
    // start → a → b → a. O motor roda 25 nós, aborta e transfere; o cliente
    // recebe nada e vai parar num atendente sem contexto.
    const g = grafo(
      [
        no('start', 'START'),
        no('a', 'MESSAGE', { text: 'oi' }),
        no('b', 'MESSAGE', { text: 'de novo' }),
      ],
      [aresta('start', 'a'), aresta('a', 'b'), aresta('b', 'a')]
    );

    expect(mensagens(g).some((m) => /laço|ciclo/i.test(m))).toBe(true);
    expect(temProblemaEm(g, 'a')).toBe(true);
  });

  it('ciclo com saída alcançável é válido: é assim que se repete um menu', () => {
    const g = grafo(
      [
        no('start', 'START'),
        no('menu', 'QUESTION', {
          text: 'Escolha:',
          options: [
            { key: '1', label: 'Ver de novo' },
            { key: '2', label: 'Falar com alguém' },
          ],
        }),
        no('volta', 'MESSAGE', { text: 'Sem problema, veja de novo.' }),
        no('humano', 'TRANSFER', {}),
      ],
      [
        aresta('start', 'menu'),
        aresta('menu', 'volta', '1'),
        aresta('menu', 'humano', '2'),
        aresta('volta', 'menu'),
      ]
    );

    expect(validateGraph(g)).toEqual([]);
  });
});

describe('validateGraph — o menu de triagem', () => {
  it('o grafo gerado pela Tarefa 3 não tem nenhum problema', () => {
    // Se este teste falhar, o botão "criar menu de triagem" passou a produzir
    // um fluxo que a própria publicação recusa.
    const g = montarGrafo([
      { id: 'dep-1', name: 'Comercial' },
      { id: 'dep-2', name: 'Financeiro' },
      { id: 'dep-3', name: 'Suporte' },
    ]);

    expect(validateGraph(g)).toEqual([]);
  });

  it('um fluxo mínimo e correto não tem problema', () => {
    const g = grafo(
      [
        no('start', 'START'),
        no('oi', 'MESSAGE', { text: 'Olá, {{nome}}!' }),
        no('fim', 'END', { text: 'Até logo.' }),
      ],
      [aresta('start', 'oi'), aresta('oi', 'fim')]
    );

    expect(validateGraph(g)).toEqual([]);
  });
});
