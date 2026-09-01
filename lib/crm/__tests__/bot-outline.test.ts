import { describe, expect, it } from 'vitest';
import { roteiroDoGrafo } from '@/lib/bot/outline';
import type { BotGraph } from '@/lib/bot/types';

/** Atalho: nó com posição irrelevante, porque o roteiro ignora o desenho. */
function no(id: string, type: BotGraph['nodes'][number]['type'], data = {}) {
  return { id, type, position: { x: 0, y: 0 }, data };
}

function aresta(source: string, target: string, sourceHandle?: string) {
  return { id: `${source}->${target}`, source, target, sourceHandle };
}

describe('roteiroDoGrafo', () => {
  it('grafo vazio não vira roteiro', () => {
    expect(roteiroDoGrafo({ nodes: [], edges: [] })).toEqual([]);
  });

  it('sequência linear sai na ordem da conversa, não na de criação', () => {
    // Os nós são declarados fora de ordem de propósito: quem desenha adiciona
    // o fim antes do meio o tempo todo.
    const grafo: BotGraph = {
      nodes: [no('fim', 'END'), no('meio', 'MESSAGE'), no('ini', 'START')],
      edges: [aresta('ini', 'meio'), aresta('meio', 'fim')],
    };

    expect(roteiroDoGrafo(grafo).map((p) => p.node.id)).toEqual(['ini', 'meio', 'fim']);
  });

  it('sem bifurcação não há recuo nem rótulo de ramo', () => {
    const grafo: BotGraph = {
      nodes: [no('ini', 'START'), no('msg', 'MESSAGE')],
      edges: [aresta('ini', 'msg')],
    };

    const passos = roteiroDoGrafo(grafo);
    expect(passos.map((p) => p.profundidade)).toEqual([0, 0]);
    expect(passos.map((p) => p.ramo)).toEqual(['', '']);
  });

  it('opções da pergunta viram ramos nomeados, na ordem do menu', () => {
    const grafo: BotGraph = {
      nodes: [
        no('ini', 'START'),
        no('perg', 'QUESTION', {
          options: [
            { key: '1', label: 'Comercial' },
            { key: '2', label: 'Suporte' },
          ],
        }),
        no('com', 'TRANSFER'),
        no('sup', 'TRANSFER'),
      ],
      edges: [
        aresta('ini', 'perg'),
        aresta('perg', 'com', '1'),
        aresta('perg', 'sup', '2'),
      ],
    };

    const passos = roteiroDoGrafo(grafo);

    expect(passos.map((p) => p.node.id)).toEqual(['ini', 'perg', 'com', 'sup']);
    expect(passos.find((p) => p.node.id === 'com')?.ramo).toBe('1) Comercial');
    expect(passos.find((p) => p.node.id === 'sup')?.ramo).toBe('2) Suporte');
    // O recuo é o que faz a leitura mostrar que os dois são alternativas.
    expect(passos.find((p) => p.node.id === 'com')?.profundidade).toBe(1);
  });

  it('condição diz "se sim" e "se não", não "true" e "false"', () => {
    const grafo: BotGraph = {
      nodes: [no('cond', 'CONDITION'), no('a', 'MESSAGE'), no('b', 'MESSAGE')],
      edges: [aresta('cond', 'a', 'true'), aresta('cond', 'b', 'false')],
    };

    const ramos = roteiroDoGrafo(grafo).map((p) => p.ramo);
    expect(ramos).toEqual(['', 'se sim', 'se não']);
  });

  it('ciclo não trava e não repete o nó', () => {
    // A repergunta volta para a própria pergunta. Sem a marca de visitado,
    // isto imprimiria linhas para sempre.
    const grafo: BotGraph = {
      nodes: [no('ini', 'START'), no('perg', 'QUESTION'), no('volta', 'MESSAGE')],
      edges: [aresta('ini', 'perg'), aresta('perg', 'volta'), aresta('volta', 'perg')],
    };

    const passos = roteiroDoGrafo(grafo);
    expect(passos.map((p) => p.node.id)).toEqual(['ini', 'perg', 'volta']);
  });

  it('nó que ninguém alcança aparece no fim, marcado', () => {
    const grafo: BotGraph = {
      nodes: [no('ini', 'START'), no('msg', 'MESSAGE'), no('orfao', 'MESSAGE')],
      edges: [aresta('ini', 'msg')],
    };

    const passos = roteiroDoGrafo(grafo);

    expect(passos.map((p) => p.node.id)).toEqual(['ini', 'msg', 'orfao']);
    expect(passos.map((p) => p.alcancavel)).toEqual([true, true, false]);
  });

  it('sem START, começa pelo primeiro nó em vez de devolver vazio', () => {
    const grafo: BotGraph = {
      nodes: [no('a', 'MESSAGE'), no('b', 'END')],
      edges: [aresta('a', 'b')],
    };

    expect(roteiroDoGrafo(grafo).map((p) => p.node.id)).toEqual(['a', 'b']);
  });

  it('todo nó do grafo aparece exatamente uma vez', () => {
    const grafo: BotGraph = {
      nodes: [
        no('ini', 'START'),
        no('perg', 'QUESTION', { options: [{ key: '1', label: 'A' }] }),
        no('x', 'MESSAGE'),
        no('y', 'END'),
      ],
      // Dois caminhos chegam em 'y': sem o visitado, ele sairia duas vezes.
      edges: [aresta('ini', 'perg'), aresta('perg', 'x', '1'), aresta('x', 'y'), aresta('perg', 'y', '2')],
    };

    const ids = roteiroDoGrafo(grafo).map((p) => p.node.id);
    expect([...new Set(ids)].length).toBe(ids.length);
    expect(ids.length).toBe(grafo.nodes.length);
  });
});
