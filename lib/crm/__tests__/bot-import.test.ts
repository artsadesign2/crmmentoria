import { describe, expect, it } from 'vitest';
import { exportarGrafo, importarGrafo } from '@/lib/bot/import';
import { validateGraph } from '@/lib/bot/validate';

describe('importarGrafo — o que recusa', () => {
  it('recusa o que não é objeto', () => {
    for (const lixo of [null, 42, 'texto', [1, 2]]) {
      const r = importarGrafo(lixo);
      expect(r.ok).toBe(false);
      expect(r.grafo.nodes).toEqual([]);
    }
  });

  it('recusa JSON sem "nodes", dizendo o que "nodes" é', () => {
    const r = importarGrafo({ passos: [] });
    expect(r.ok).toBe(false);
    expect(r.erros[0]).toContain('nodes');
    expect(r.erros[0]).toContain('passos do fluxo');
  });

  it('recusa fluxo vazio', () => {
    expect(importarGrafo({ nodes: [] }).ok).toBe(false);
  });

  it('tipo inventado é erro, e a mensagem lista os que existem', () => {
    const r = importarGrafo({ nodes: [{ id: 'a', type: 'WEBHOOK' }] });

    expect(r.ok).toBe(false);
    expect(r.erros[0]).toContain('WEBHOOK');
    expect(r.erros[0]).toContain('TRANSFER');
  });

  it('um passo inválido invalida o arquivo, e não só aquele passo', () => {
    // Importar sete de oito passos entregaria um fluxo que parece pronto e
    // não é — pior que recusar.
    const r = importarGrafo({
      nodes: [{ id: 'a', type: 'START' }, { id: 'b', type: 'NAO_EXISTE' }],
    });

    expect(r.ok).toBe(false);
    expect(r.grafo.nodes).toEqual([]);
  });
});

describe('importarGrafo — o que conserta', () => {
  it('tipo em minúsculas é aceito', () => {
    const r = importarGrafo({ nodes: [{ id: 'a', type: 'message', data: { text: 'oi' } }] });

    expect(r.ok).toBe(true);
    expect(r.grafo.nodes[0].type).toBe('MESSAGE');
  });

  it('passo sem id ganha um, e avisa', () => {
    const r = importarGrafo({ nodes: [{ type: 'START' }] });

    expect(r.ok).toBe(true);
    expect(r.grafo.nodes[0].id).toBe('start-0');
    expect(r.avisos.join(' ')).toContain('sem id');
  });

  it('id repetido é renomeado em vez de sobrescrever o primeiro', () => {
    const r = importarGrafo({
      nodes: [
        { id: 'x', type: 'START' },
        { id: 'x', type: 'END', data: { text: 'tchau' } },
      ],
    });

    expect(r.ok).toBe(true);
    expect(r.grafo.nodes.map((n) => n.id)).toEqual(['x', 'x-1']);
    expect(r.avisos.join(' ')).toContain('mais de uma vez');
  });

  it('ligação para passo inexistente é descartada com aviso, não com erro', () => {
    const r = importarGrafo({
      nodes: [{ id: 'a', type: 'START' }],
      edges: [{ source: 'a', target: 'fantasma' }],
    });

    expect(r.ok).toBe(true);
    expect(r.grafo.edges).toEqual([]);
    expect(r.avisos.join(' ')).toContain('descartada');
  });

  it('sem "edges", importa mesmo assim e avisa', () => {
    const r = importarGrafo({ nodes: [{ id: 'a', type: 'START' }] });

    expect(r.ok).toBe(true);
    expect(r.avisos.join(' ')).toContain('edges');
  });

  it('ligação sem id ganha um id estável derivado das pontas', () => {
    const r = importarGrafo({
      nodes: [{ id: 'a', type: 'START' }, { id: 'b', type: 'END' }],
      edges: [{ source: 'a', target: 'b' }],
    });

    expect(r.grafo.edges[0].id).toBe('a-b-x');
  });
});

describe('importarGrafo — posições', () => {
  it('quem não trouxe posição não fica empilhado na origem', () => {
    const r = importarGrafo({
      nodes: [
        { id: 'a', type: 'START' },
        { id: 'b', type: 'MESSAGE', data: { text: 'oi' } },
        { id: 'c', type: 'END', data: { text: 'tchau' } },
      ],
      edges: [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' },
      ],
    });

    const ys = r.grafo.nodes.map((n) => n.position.y);
    expect(new Set(ys).size).toBe(3);
    expect(ys[0]).toBeLessThan(ys[1]);
    expect(ys[1]).toBeLessThan(ys[2]);
  });

  it('ramos da mesma pergunta ficam lado a lado, na mesma altura', () => {
    const r = importarGrafo({
      nodes: [
        { id: 'p', type: 'START' },
        { id: 'x', type: 'END' },
        { id: 'y', type: 'END' },
      ],
      edges: [
        { source: 'p', target: 'x' },
        { source: 'p', target: 'y' },
      ],
    });

    const x = r.grafo.nodes.find((n) => n.id === 'x')!.position;
    const y = r.grafo.nodes.find((n) => n.id === 'y')!.position;

    expect(x.y).toBe(y.y);
    expect(x.x).not.toBe(y.x);
  });

  it('posição que veio no arquivo é respeitada', () => {
    const r = importarGrafo({
      nodes: [{ id: 'a', type: 'START', position: { x: 777, y: 555 } }],
    });

    expect(r.grafo.nodes[0].position).toEqual({ x: 777, y: 555 });
  });

  it('a marca interna de posição não sobrevive à importação', () => {
    const r = importarGrafo({ nodes: [{ id: 'a', type: 'START' }] });

    expect(JSON.stringify(r.grafo)).not.toContain('__semPosicao');
  });
});

describe('exportar e reimportar', () => {
  it('o arquivo exportado volta idêntico', () => {
    const original = importarGrafo({
      nodes: [
        { id: 'a', type: 'START', position: { x: 40, y: 40 } },
        { id: 'b', type: 'END', position: { x: 40, y: 190 }, data: { text: 'tchau' } },
      ],
      edges: [{ id: 'a-b', source: 'a', target: 'b', sourceHandle: null }],
    }).grafo;

    const arquivo = exportarGrafo('Triagem', original);
    const devolta = importarGrafo(JSON.parse(arquivo));

    expect(devolta.ok).toBe(true);
    expect(devolta.avisos).toEqual([]);
    expect(devolta.grafo).toEqual(original);
  });
});

describe('importar e validar são coisas diferentes', () => {
  it('um fluxo bem formado e sem sentido importa, e a validação é que reclama', () => {
    // A pergunta oferece duas opções e nenhuma leva a lugar nenhum. A forma
    // está certa; o sentido, não. Recusar na importação esconderia de quem
    // escreveu o arquivo exatamente o que precisa consertar.
    const r = importarGrafo({
      nodes: [
        { id: 'i', type: 'START' },
        {
          id: 'q',
          type: 'QUESTION',
          data: {
            text: 'Do que você precisa?',
            options: [
              { key: '1', label: 'Comprar' },
              { key: '2', label: 'Suporte' },
            ],
          },
        },
      ],
      edges: [{ source: 'i', target: 'q' }],
    });

    expect(r.ok).toBe(true);
    expect(r.erros).toEqual([]);

    const problemas = validateGraph(r.grafo);
    expect(problemas.map((p) => p.mensagem).join(' ')).toContain('não leva a lugar nenhum');
  });
});
