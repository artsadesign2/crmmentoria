import type { BotEdge, BotGraph, BotNode, BotNodeType } from './types';

/**
 * Importação de fluxo em JSON.
 *
 * Existe para dar um caminho de entrada além do canvas: colar um fluxo pronto,
 * duplicar de outra empresa, versionar em arquivo, ou receber o que uma IA
 * escreveu. Os quatro casos chegam aqui pela mesma porta, e é de propósito —
 * uma segunda porta seria uma segunda validação, que envelhece diferente.
 *
 * **Puro.** Roda no navegador (pré-visualização antes de confirmar) e no
 * servidor (a importação de verdade), com o mesmo resultado.
 *
 * A divisão de trabalho com `validate.ts` é estrita: aqui é *forma* — isto é
 * um grafo? os tipos existem? as arestas apontam para nós que existem? Lá é
 * *sentido* — a pergunta tem saída para cada opção? há laço sem fim? Misturar
 * as duas obrigaria a repetir regra, e regra repetida é regra que diverge.
 *
 * Um JSON malformado é **erro** e não importa nada. Um detalhe ausente ou
 * consertado é **aviso** e a importação segue: um fluxo recebido pela metade
 * é mais útil aberto no editor do que recusado na porta.
 */

const TIPOS: BotNodeType[] = [
  'START',
  'MESSAGE',
  'QUESTION',
  'CONDITION',
  'CAPTURE',
  'TRANSFER',
  'AI',
  'END',
];

/** Espaçamento do arranjo automático, em pixels do canvas. */
const PASSO_X = 280;
const PASSO_Y = 150;

export interface ResultadoImportacao {
  ok: boolean;
  grafo: BotGraph;
  /** Impedem a importação. Quando há algum, `grafo` sai vazio. */
  erros: string[];
  /** O que foi consertado sozinho. A importação segue. */
  avisos: string[];
}

function ehObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Aceita `{nodes,edges}` e também o arquivo exportado inteiro, que embrulha o
 * grafo em `{name, graph}`. Quem exporta e reimporta não deveria precisar
 * editar o arquivo no meio do caminho.
 */
function extrairGrafo(bruto: unknown): Record<string, unknown> | null {
  if (!ehObjeto(bruto)) return null;
  if (ehObjeto(bruto.graph)) return bruto.graph;
  return bruto;
}

export function importarGrafo(bruto: unknown): ResultadoImportacao {
  const vazio: BotGraph = { nodes: [], edges: [] };
  const erros: string[] = [];
  const avisos: string[] = [];

  const raiz = extrairGrafo(bruto);

  if (!raiz) {
    return { ok: false, grafo: vazio, erros: ['O conteúdo não é um objeto JSON.'], avisos };
  }

  if (!Array.isArray(raiz.nodes)) {
    return {
      ok: false,
      grafo: vazio,
      erros: ['O JSON não tem a lista "nodes", que é onde ficam os passos do fluxo.'],
      avisos,
    };
  }

  if (raiz.nodes.length === 0) {
    return { ok: false, grafo: vazio, erros: ['O fluxo não tem nenhum passo.'], avisos };
  }

  // -- Passos ---------------------------------------------------------------

  const nodes: Array<BotNode & { __semPosicao?: boolean }> = [];
  const usados = new Set<string>();
  let invalidos = 0;

  raiz.nodes.forEach((cru: unknown, i: number) => {
    if (!ehObjeto(cru)) {
      invalidos++;
      erros.push(`O passo ${i + 1} não é um objeto.`);
      return;
    }

    const tipo = String(cru.type ?? '').toUpperCase() as BotNodeType;

    if (!TIPOS.includes(tipo)) {
      invalidos++;
      erros.push(
        `O passo ${i + 1} tem tipo "${cru.type ?? '(vazio)'}", que não existe. ` +
          `Os tipos são: ${TIPOS.join(', ')}.`
      );
      return;
    }

    // Id ausente ou repetido ganha um novo, em vez de recusar o arquivo: quem
    // escreve JSON à mão esquece id o tempo todo, e uma IA repete.
    let id = typeof cru.id === 'string' && cru.id.trim() ? cru.id.trim() : '';

    if (!id) {
      id = `${tipo.toLowerCase()}-${i}`;
      avisos.push(`O passo ${i + 1} estava sem id; recebeu "${id}".`);
    }

    if (usados.has(id)) {
      const novo = `${id}-${i}`;
      avisos.push(`O id "${id}" aparecia mais de uma vez; o segundo virou "${novo}".`);
      id = novo;
    }

    usados.add(id);

    const posicao =
      ehObjeto(cru.position) &&
      typeof cru.position.x === 'number' &&
      typeof cru.position.y === 'number'
        ? { x: cru.position.x, y: cru.position.y }
        : null;

    nodes.push({
      id,
      type: tipo,
      position: posicao ?? { x: 0, y: 0 },
      data: ehObjeto(cru.data) ? (cru.data as BotNode['data']) : {},
      // Marca temporária: quem não trouxe posição entra no arranjo automático.
      ...(posicao ? {} : { __semPosicao: true }),
    });
  });

  if (invalidos > 0 || nodes.length === 0) {
    return { ok: false, grafo: vazio, erros, avisos };
  }

  // -- Ligações -------------------------------------------------------------

  const existe = new Set(nodes.map((n) => n.id));
  const edges: BotEdge[] = [];

  if (!Array.isArray(raiz.edges)) {
    avisos.push('O JSON não trazia "edges"; o fluxo entrou sem nenhuma ligação.');
  }

  const crus: unknown[] = Array.isArray(raiz.edges) ? raiz.edges : [];

  crus.forEach((cru: unknown, i: number) => {
    if (!ehObjeto(cru)) {
      avisos.push(`A ligação ${i + 1} não é um objeto e foi descartada.`);
      return;
    }

    const source = String(cru.source ?? '');
    const target = String(cru.target ?? '');

    // Ligação pendurada é descartada, não é erro: `validate.ts` já reclama do
    // passo que ficou sem saída, com uma frase melhor que a que eu daria aqui.
    if (!existe.has(source) || !existe.has(target)) {
      avisos.push(
        `A ligação de "${source || '?'}" para "${target || '?'}" foi descartada: ` +
          'um dos dois passos não existe no arquivo.'
      );
      return;
    }

    const handle =
      cru.sourceHandle === null || cru.sourceHandle === undefined
        ? null
        : String(cru.sourceHandle);

    edges.push({
      id:
        typeof cru.id === 'string' && cru.id.trim()
          ? cru.id.trim()
          : `${source}-${target}-${handle ?? 'x'}`,
      source,
      target,
      sourceHandle: handle,
    });
  });

  return { ok: true, grafo: posicionar({ nodes, edges }), erros, avisos };
}

/**
 * Dá coordenadas a quem não trouxe, em camadas a partir do início.
 *
 * Sem isto, um JSON escrito à mão (ou por uma IA, que não tem por que inventar
 * pixels) abre com todos os passos empilhados na origem — um borrão que parece
 * um passo só. Quem trouxe posição a mantém: reposicionar um fluxo exportado
 * destruiria o arranjo que alguém organizou.
 */
export function posicionar(grafo: BotGraph): BotGraph {
  const marcados = grafo.nodes as Array<BotNode & { __semPosicao?: boolean }>;
  if (!marcados.some((n) => n.__semPosicao)) return limpar(grafo);

  const inicio = grafo.nodes.find((n) => n.type === 'START') ?? grafo.nodes[0];

  // Largura em camadas: a profundidade vira linha, e a ordem dentro da camada
  // vira coluna. É o arranjo mais próximo do que alguém desenharia à mão.
  const profundidade = new Map<string, number>([[inicio.id, 0]]);
  const fila = [inicio.id];

  while (fila.length > 0) {
    const atual = fila.shift() as string;
    const nivel = profundidade.get(atual) ?? 0;

    for (const aresta of grafo.edges) {
      if (aresta.source !== atual || profundidade.has(aresta.target)) continue;
      profundidade.set(aresta.target, nivel + 1);
      fila.push(aresta.target);
    }
  }

  // Órfãos entram numa camada própria, abaixo de tudo: ficam visíveis, e
  // visivelmente separados do que o fluxo alcança.
  const maior = Math.max(0, ...profundidade.values());
  const ocupacao = new Map<number, number>();

  const nodes = marcados.map((no) => {
    if (!no.__semPosicao) return no;

    const nivel = profundidade.get(no.id) ?? maior + 1;
    const coluna = ocupacao.get(nivel) ?? 0;
    ocupacao.set(nivel, coluna + 1);

    return { ...no, position: { x: 40 + coluna * PASSO_X, y: 40 + nivel * PASSO_Y } };
  });

  return limpar({ nodes, edges: grafo.edges });
}

/** Tira a marca temporária: ela nunca deve chegar ao banco. */
function limpar(grafo: BotGraph): BotGraph {
  return {
    nodes: grafo.nodes.map((n) => {
      const { __semPosicao: _descartado, ...limpo } = n as BotNode & { __semPosicao?: boolean };
      return limpo as BotNode;
    }),
    edges: grafo.edges,
  };
}

/** O que o botão de exportar grava. Legível, e reimportável sem edição. */
export function exportarGrafo(nome: string, grafo: BotGraph): string {
  return JSON.stringify({ name: nome, graph: grafo }, null, 2);
}
