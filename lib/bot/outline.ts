import type { BotGraph, BotNode } from './types';

/**
 * O grafo lido como roteiro: a conversa em ordem, de cima para baixo.
 *
 * Existe porque um canvas de nós não cabe num celular. Não é uma questão de
 * CSS: editar um grafo com o dedo em 390px não funciona com arranjo nenhum, e
 * fingir que funciona entrega um canvas de 150px em que não cabe um nó
 * inteiro. Em vez de espremer o desenho, esta função troca a representação —
 * quem está no telefone lê o que o robô fala, testa no simulador e publica;
 * quem vai desenhar abre no computador.
 *
 * A travessia é em profundidade a partir do START, e é isso que faz a leitura
 * seguir a conversa em vez da ordem em que os nós foram criados. Cada nó
 * aparece uma vez só: um grafo que volta para trás (a repergunta, por exemplo)
 * imprimiria infinitas linhas se cada visita virasse um passo.
 */

export interface PassoRoteiro {
  node: BotNode;
  /** Recuo: sobe a cada bifurcação, para o desenho mostrar o que é ramo. */
  profundidade: number;
  /** Por qual saída se chegou aqui. Vazio quando o pai tinha uma saída só. */
  ramo: string;
  /** Falso quando nada leva até o nó — órfão que o motor nunca alcança. */
  alcancavel: boolean;
}

/** Nome legível da saída, resolvido no nó de origem. */
function rotuloDoRamo(origem: BotNode, handle: string | null | undefined): string {
  if (!handle) return '';

  if (origem.type === 'CONDITION') {
    return handle === 'true' ? 'se sim' : 'se não';
  }

  if (origem.type === 'QUESTION') {
    const opcao = origem.data.options?.find((o) => o.key === handle);
    return opcao ? `${opcao.key}) ${opcao.label}` : handle;
  }

  return handle;
}

export function roteiroDoGrafo(grafo: BotGraph): PassoRoteiro[] {
  const porId = new Map(grafo.nodes.map((n) => [n.id, n]));
  if (porId.size === 0) return [];

  const saidas = new Map<string, typeof grafo.edges>();
  for (const aresta of grafo.edges) {
    const lista = saidas.get(aresta.source) ?? [];
    lista.push(aresta);
    saidas.set(aresta.source, lista);
  }

  const inicio = grafo.nodes.find((n) => n.type === 'START') ?? grafo.nodes[0];

  const passos: PassoRoteiro[] = [];
  const visitados = new Set<string>();

  // Pilha explícita, e não recursão: um fluxo grande com ciclos estoura a
  // pilha do JavaScript antes de estourar a paciência de quem o desenhou.
  const pilha: Array<{ id: string; profundidade: number; ramo: string }> = [
    { id: inicio.id, profundidade: 0, ramo: '' },
  ];

  while (pilha.length > 0) {
    const atual = pilha.pop()!;
    if (visitados.has(atual.id)) continue;

    const node = porId.get(atual.id);
    if (!node) continue;

    visitados.add(atual.id);
    passos.push({ node, profundidade: atual.profundidade, ramo: atual.ramo, alcancavel: true });

    const filhas = saidas.get(atual.id) ?? [];
    const bifurca = filhas.length > 1;

    // Empilhado ao contrário para sair na ordem em que as saídas aparecem:
    // a primeira opção do menu é a primeira a ser lida.
    for (let i = filhas.length - 1; i >= 0; i--) {
      const aresta = filhas[i];
      if (visitados.has(aresta.target)) continue;

      pilha.push({
        id: aresta.target,
        profundidade: bifurca ? atual.profundidade + 1 : atual.profundidade,
        ramo: bifurca ? rotuloDoRamo(node, aresta.sourceHandle) : '',
      });
    }
  }

  // Os órfãos vão para o fim, marcados. Escondê-los seria pior: um nó que
  // ninguém alcança é justamente o que a pessoa precisa ver para entender
  // por que o fluxo não faz o que ela escreveu nele.
  for (const node of grafo.nodes) {
    if (!visitados.has(node.id)) {
      passos.push({ node, profundidade: 0, ramo: '', alcancavel: false });
    }
  }

  return passos;
}
