import { describe, it, expect } from 'vitest';
import {
  step,
  nodeInicial,
  sessaoInicial,
  TETO_NOS,
  TETO_MENSAGENS,
  type StepInput,
} from '@/lib/bot/engine';
import type { BotGraph, BotNode, BotEdge } from '@/lib/bot/types';

/**
 * O motor é a parte que fala com o cliente sem ninguém no meio.
 *
 * Um bug aqui não aparece num teste manual: aparece na conversa de uma pessoa
 * real, e o pior deles — ciclo no grafo — manda mensagem em laço e queima o
 * número da empresa em minutos. Por isso o motor é puro, e por isso os tetos
 * têm teste próprio.
 */

function no(id: string, type: BotNode['type'], data: BotNode['data'] = {}): BotNode {
  return { id, type, position: { x: 0, y: 0 }, data };
}

function aresta(source: string, target: string, sourceHandle: string | null = null): BotEdge {
  return { id: `${source}->${target}:${sourceHandle ?? ''}`, source, target, sourceHandle };
}

const CONTATO = { nome: 'Ana Paula', empresa: 'Clínica Vida' };

function entrada(texto = ''): StepInput {
  return { texto, contato: CONTATO };
}

/** Roda o motor a partir do zero sobre um grafo. */
function rodar(grafo: BotGraph, texto = '') {
  return step(grafo, sessaoInicial(grafo), entrada(texto));
}

describe('nodeInicial', () => {
  it('encontra o unico START', () => {
    const grafo: BotGraph = { nodes: [no('a', 'START'), no('b', 'END')], edges: [] };
    expect(nodeInicial(grafo)?.id).toBe('a');
  });

  it('grafo sem START devolve null', () => {
    expect(nodeInicial({ nodes: [no('b', 'END')], edges: [] })).toBeNull();
  });

  it('dois START devolve null: nao da para adivinhar por onde comecar', () => {
    const grafo: BotGraph = { nodes: [no('a', 'START'), no('z', 'START')], edges: [] };
    expect(nodeInicial(grafo)).toBeNull();
  });
});

describe('step — caminho feliz', () => {
  it('START -> MESSAGE -> END envia uma vez e conclui', () => {
    const grafo: BotGraph = {
      nodes: [
        no('s', 'START'),
        no('m', 'MESSAGE', { text: 'Bom dia!' }),
        no('f', 'END', {}),
      ],
      edges: [aresta('s', 'm'), aresta('m', 'f')],
    };

    const r = rodar(grafo);

    expect(r.acoes.filter((a) => a.tipo === 'ENVIAR')).toHaveLength(1);
    expect(r.acoes[0]).toEqual({ tipo: 'ENVIAR', texto: 'Bom dia!' });
    expect(r.status).toBe('DONE');
  });

  it('MESSAGE resolve {{nome}} e {{empresa}} pelo contato', () => {
    const grafo: BotGraph = {
      nodes: [no('s', 'START'), no('m', 'MESSAGE', { text: 'Oi {{nome}}, da {{empresa}}!' })],
      edges: [aresta('s', 'm')],
    };

    const r = rodar(grafo);
    expect(r.acoes[0]).toEqual({ tipo: 'ENVIAR', texto: 'Oi Ana Paula, da Clínica Vida!' });
  });

  it('END com texto envia antes de encerrar', () => {
    const grafo: BotGraph = {
      nodes: [no('s', 'START'), no('f', 'END', { text: 'Até logo.' })],
      edges: [aresta('s', 'f')],
    };

    const r = rodar(grafo);
    expect(r.acoes).toContainEqual({ tipo: 'ENVIAR', texto: 'Até logo.' });
    expect(r.status).toBe('DONE');
  });
});

describe('step — QUESTION', () => {
  const grafo: BotGraph = {
    nodes: [
      no('s', 'START'),
      no('q', 'QUESTION', {
        text: 'Com quem você quer falar?',
        options: [
          { key: '1', label: 'Comercial' },
          { key: '2', label: 'Suporte' },
        ],
      }),
      no('t1', 'TRANSFER', { departmentId: 'dep-comercial' }),
      no('t2', 'TRANSFER', { departmentId: 'dep-suporte' }),
    ],
    edges: [aresta('s', 'q'), aresta('q', 't1', '1'), aresta('q', 't2', '2')],
  };

  it('envia a pergunta COM as opcoes e para para esperar', () => {
    const r = rodar(grafo);

    const enviada = r.acoes.find((a) => a.tipo === 'ENVIAR');
    expect(enviada).toBeDefined();
    if (enviada?.tipo === 'ENVIAR') {
      expect(enviada.texto).toContain('Com quem você quer falar?');
      // Sem as opções no texto, o cliente não sabe o que digitar.
      expect(enviada.texto).toContain('1');
      expect(enviada.texto).toContain('Comercial');
      expect(enviada.texto).toContain('2');
      expect(enviada.texto).toContain('Suporte');
    }

    expect(r.proximaSessao.awaitingInput).toBe(true);
    expect(r.proximaSessao.currentNodeId).toBe('q');
    expect(r.status).toBe('RUNNING');
  });

  it('resposta "2" segue a aresta da opcao 2', () => {
    const parada = rodar(grafo).proximaSessao;
    const r = step(grafo, parada, entrada('2'));

    expect(r.acoes).toContainEqual({
      tipo: 'TRANSFERIR',
      departmentId: 'dep-suporte',
      motivo: 'Fluxo encaminhou para o setor.',
    });
    expect(r.status).toBe('HANDED_OFF');
  });

  it('espaco e pontuacao na resposta nao atrapalham', () => {
    const parada = rodar(grafo).proximaSessao;
    const r = step(grafo, parada, entrada('  1. '));

    expect(r.acoes.some((a) => a.tipo === 'TRANSFERIR' && a.departmentId === 'dep-comercial')).toBe(
      true
    );
  });

  it('resposta invalida REPETE a pergunta e nao avanca', () => {
    // O erro caro seria transferir na primeira confusão, ou pior, ficar em
    // silêncio: quem digitou errado precisa de outra chance, não de um humano.
    const parada = rodar(grafo).proximaSessao;
    const r = step(grafo, parada, entrada('abc'));

    expect(r.acoes.some((a) => a.tipo === 'ENVIAR')).toBe(true);
    expect(r.acoes.some((a) => a.tipo === 'TRANSFERIR')).toBe(false);
    expect(r.proximaSessao.currentNodeId).toBe('q');
    expect(r.proximaSessao.awaitingInput).toBe(true);
    expect(r.status).toBe('RUNNING');
  });

  it('o cliente pode responder pelo rotulo, nao so pelo numero', () => {
    const parada = rodar(grafo).proximaSessao;
    const r = step(grafo, parada, entrada('suporte'));

    expect(r.acoes.some((a) => a.tipo === 'TRANSFERIR' && a.departmentId === 'dep-suporte')).toBe(
      true
    );
  });
});

describe('step — CONDITION', () => {
  const grafo: BotGraph = {
    nodes: [
      no('s', 'START'),
      no('c', 'CONDITION', { variable: 'plano', equals: 'ouro' }),
      no('sim', 'MESSAGE', { text: 'Atendimento prioritário.' }),
      no('nao', 'MESSAGE', { text: 'Atendimento padrão.' }),
    ],
    edges: [aresta('s', 'c'), aresta('c', 'sim', 'true'), aresta('c', 'nao', 'false')],
  };

  it('variavel que casa segue o ramo verdadeiro', () => {
    const inicial = { ...sessaoInicial(grafo), variables: { plano: 'ouro' } };
    const r = step(grafo, inicial, entrada());

    expect(r.acoes).toContainEqual({ tipo: 'ENVIAR', texto: 'Atendimento prioritário.' });
  });

  it('variavel ausente segue o ramo falso', () => {
    const r = rodar(grafo);
    expect(r.acoes).toContainEqual({ tipo: 'ENVIAR', texto: 'Atendimento padrão.' });
  });

  it('variavel com valor diferente segue o ramo falso', () => {
    const inicial = { ...sessaoInicial(grafo), variables: { plano: 'prata' } };
    const r = step(grafo, inicial, entrada());

    expect(r.acoes).toContainEqual({ tipo: 'ENVIAR', texto: 'Atendimento padrão.' });
  });
});

describe('step — CAPTURE', () => {
  const grafo: BotGraph = {
    nodes: [
      no('s', 'START'),
      no('p', 'QUESTION', { text: 'Qual seu e-mail?' }),
      no('cap', 'CAPTURE', { field: 'email' }),
      no('f', 'END', { text: 'Anotado.' }),
    ],
    edges: [aresta('s', 'p'), aresta('p', 'cap'), aresta('cap', 'f')],
  };

  it('pergunta sem opcoes espera texto livre', () => {
    const r = rodar(grafo);
    expect(r.proximaSessao.awaitingInput).toBe(true);
  });

  it('grava em variables E emite a acao de capturar', () => {
    const parada = rodar(grafo).proximaSessao;
    const r = step(grafo, parada, entrada('ana@exemplo.com'));

    expect(r.proximaSessao.variables.email).toBe('ana@exemplo.com');
    expect(r.acoes).toContainEqual({
      tipo: 'CAPTURAR',
      campo: 'email',
      valor: 'ana@exemplo.com',
    });
  });
});

describe('step — as travas', () => {
  it('ciclo infinito para no teto de nos e TRANSFERE', () => {
    // Dois MESSAGE apontando um para o outro: sem teto, isto manda mensagem
    // para uma pessoa real até o número ser bloqueado.
    const grafo: BotGraph = {
      nodes: [
        no('s', 'START'),
        no('a', 'MESSAGE', { text: 'ping' }),
        no('b', 'MESSAGE', { text: 'pong' }),
      ],
      edges: [aresta('s', 'a'), aresta('a', 'b'), aresta('b', 'a')],
    };

    const r = rodar(grafo);

    expect(r.status).toBe('ABORTED');
    expect(r.acoes.some((a) => a.tipo === 'TRANSFERIR')).toBe(true);
    // E, sobretudo, não mandou mensagem sem parar.
    expect(r.acoes.filter((a) => a.tipo === 'ENVIAR').length).toBeLessThanOrEqual(TETO_MENSAGENS);
  });

  it('nunca percorre mais que TETO_NOS', () => {
    const nos: BotNode[] = [no('s', 'START')];
    const arestas: BotEdge[] = [];
    for (let i = 0; i < TETO_NOS * 2; i++) {
      nos.push(no(`n${i}`, 'CONDITION', { variable: 'x', equals: 'y' }));
      arestas.push(aresta(i === 0 ? 's' : `n${i - 1}`, `n${i}`, i === 0 ? null : 'false'));
    }

    const r = step({ nodes: nos, edges: arestas }, sessaoInicial({ nodes: nos, edges: arestas }), entrada());
    expect(r.status).toBe('ABORTED');
  });

  it('rajada de mensagens para no teto e transfere', () => {
    const nos: BotNode[] = [no('s', 'START')];
    const arestas: BotEdge[] = [];
    for (let i = 0; i < TETO_MENSAGENS + 4; i++) {
      nos.push(no(`m${i}`, 'MESSAGE', { text: `linha ${i}` }));
      arestas.push(aresta(i === 0 ? 's' : `m${i - 1}`, `m${i}`));
    }
    const grafo = { nodes: nos, edges: arestas };

    const r = rodar(grafo);

    expect(r.acoes.filter((a) => a.tipo === 'ENVIAR')).toHaveLength(TETO_MENSAGENS);
    expect(r.status).toBe('ABORTED');
    expect(r.acoes.some((a) => a.tipo === 'TRANSFERIR')).toBe(true);
  });
});

describe('step — grafo quebrado nunca lanca', () => {
  it('aresta para no inexistente transfere com motivo', () => {
    const grafo: BotGraph = {
      nodes: [no('s', 'START'), no('m', 'MESSAGE', { text: 'oi' })],
      edges: [aresta('s', 'm'), aresta('m', 'fantasma')],
    };

    const r = rodar(grafo);

    expect(r.status).toBe('ABORTED');
    const transfer = r.acoes.find((a) => a.tipo === 'TRANSFERIR');
    expect(transfer).toBeDefined();
    if (transfer?.tipo === 'TRANSFERIR') expect(transfer.motivo.length).toBeGreaterThan(0);
  });

  it('nó sem saida encerra sem transferir para o vazio', () => {
    const grafo: BotGraph = {
      nodes: [no('s', 'START'), no('m', 'MESSAGE', { text: 'oi' })],
      edges: [aresta('s', 'm')],
    };

    const r = rodar(grafo);

    expect(r.acoes).toContainEqual({ tipo: 'ENVIAR', texto: 'oi' });
    expect(r.status).toBe('DONE');
  });

  it('grafo sem START transfere em vez de travar', () => {
    const grafo: BotGraph = { nodes: [no('m', 'MESSAGE', { text: 'oi' })], edges: [] };

    const r = rodar(grafo);

    expect(r.status).toBe('ABORTED');
    expect(r.acoes.some((a) => a.tipo === 'TRANSFERIR')).toBe(true);
    expect(r.acoes.some((a) => a.tipo === 'ENVIAR')).toBe(false);
  });

  it('grafo vazio nao lanca', () => {
    expect(() => rodar({ nodes: [], edges: [] })).not.toThrow();
  });

  it('MESSAGE sem texto nao envia mensagem vazia', () => {
    const grafo: BotGraph = {
      nodes: [no('s', 'START'), no('m', 'MESSAGE', {}), no('f', 'END', {})],
      edges: [aresta('s', 'm'), aresta('m', 'f')],
    };

    const r = rodar(grafo);
    expect(r.acoes.some((a) => a.tipo === 'ENVIAR')).toBe(false);
  });
});

describe('step — nó de IA', () => {
  const grafo: BotGraph = {
    nodes: [no('s', 'START'), no('ia', 'AI', {}), no('t', 'TRANSFER', { departmentId: null })],
    edges: [aresta('s', 'ia'), aresta('ia', 't')],
  };

  it('pede a resposta ao executor e para', () => {
    // O motor é síncrono e puro: ele não chama o Gemini, pede que chamem.
    const r = step(grafo, sessaoInicial(grafo), entrada('vocês abrem sábado?'));

    expect(r.acoes).toContainEqual({ tipo: 'PERGUNTAR_IA', pergunta: 'vocês abrem sábado?' });
    expect(r.proximaSessao.awaitingInput).toBe(true);
    expect(r.status).toBe('RUNNING');
  });

  it('resposta realimentada e enviada, e a troca e contada', () => {
    const parada = step(grafo, sessaoInicial(grafo), entrada('vocês abrem sábado?')).proximaSessao;

    const r = step(grafo, parada, {
      texto: '',
      contato: CONTATO,
      respostaIa: 'Abrimos das 9h às 13h.',
    });

    expect(r.acoes).toContainEqual({ tipo: 'ENVIAR', texto: 'Abrimos das 9h às 13h.' });
    expect(r.proximaSessao.aiTurns).toBe(1);
  });
});
