import type { BotEdge, BotGraph, BotNode, BotNodeType } from './types';

/**
 * A conferência do grafo, feita antes de publicar.
 *
 * Publicar é o único momento em que vale a pena barrar um fluxo quebrado: é a
 * última porta antes de ele alcançar uma pessoa de verdade. Rascunho pela
 * metade é normal — ninguém desenha um fluxo inteiro de uma vez, e reclamar a
 * cada nó solto tornaria o editor insuportável.
 *
 * **Puro**, como o motor: o simulador e o canvas chamam isto no navegador.
 *
 * Cada regra aqui corresponde a um comportamento real de `engine.ts`. É a parte
 * que precisa ser mantida junto: uma validação que proíbe o que o motor aceita
 * impede fluxos legítimos, e uma que aceita o que o motor não sabe executar não
 * serve para nada. Por isso pergunta de campo livre (sem opções) **não** é
 * erro — o motor a trata como campo aberto de propósito, é assim que se pede um
 * e-mail. O erro é ela não levar a lugar nenhum.
 */

export interface ProblemaGrafo {
  /** Nulo quando o problema é do fluxo inteiro, não de um nó. */
  nodeId: string | null;
  /** Frase pronta para a tela, dizendo o que está errado. */
  mensagem: string;
}

/**
 * Nós em que a caminhada do motor termina ou espera.
 *
 * QUESTION e AI param para ouvir o cliente; TRANSFER entrega a um humano; END
 * encerra. Um nó sem aresta de saída também para — `SEM_SAIDA` vira "fim do
 * fluxo" no motor. Tudo que não estiver nessa lista continua andando, e é dessa
 * distinção que sai a detecção de laço.
 */
const PARADAS: BotNodeType[] = ['QUESTION', 'AI', 'TRANSFER', 'END'];

export function validateGraph(grafo: BotGraph): ProblemaGrafo[] {
  const problemas: ProblemaGrafo[] = [];
  const { nodes, edges } = grafo;

  problemas.push(...conferirIds(nodes));
  problemas.push(...conferirInicio(nodes));
  problemas.push(...conferirArestas(nodes, edges));

  for (const no of nodes) {
    problemas.push(...conferirNo(no, edges));
  }

  const inicios = nodes.filter((n) => n.type === 'START');

  // Sem um início único não dá para dizer o que é alcançável: o motor devolve
  // `null` nos dois casos, e apontar "nó órfão" em cima disso seria ruído sobre
  // um problema que já está listado.
  if (inicios.length === 1) {
    problemas.push(...conferirAlcance(nodes, edges, inicios[0]));
    problemas.push(...conferirLacos(nodes, edges, inicios[0]));
  }

  return problemas;
}

// ---------------------------------------------------------------------------
// Regras
// ---------------------------------------------------------------------------

function conferirIds(nodes: BotNode[]): ProblemaGrafo[] {
  const vistos = new Set<string>();
  const repetidos = new Set<string>();

  for (const no of nodes) {
    if (vistos.has(no.id)) repetidos.add(no.id);
    vistos.add(no.id);
  }

  return [...repetidos].map((id) => ({
    nodeId: id,
    mensagem:
      `Há mais de um nó com o id "${id}". Ids repetidos fazem o motor encontrar ` +
      'sempre o primeiro, e os outros nunca rodam.',
  }));
}

function conferirInicio(nodes: BotNode[]): ProblemaGrafo[] {
  const inicios = nodes.filter((n) => n.type === 'START');

  if (inicios.length === 0) {
    return [{ nodeId: null, mensagem: 'O fluxo não tem nó de início.' }];
  }

  if (inicios.length > 1) {
    return [
      {
        nodeId: null,
        mensagem:
          'O fluxo tem mais de um nó de início. O motor não escolhe entre eles — ' +
          'ele para, porque atender por um fluxo que ninguém desenhou é pior.',
      },
    ];
  }

  return [];
}

function conferirArestas(nodes: BotNode[], edges: BotEdge[]): ProblemaGrafo[] {
  const ids = new Set(nodes.map((n) => n.id));
  const problemas: ProblemaGrafo[] = [];

  for (const aresta of edges) {
    if (!ids.has(aresta.source)) {
      problemas.push({
        nodeId: null,
        mensagem: `Há uma ligação saindo de "${aresta.source}", que não existe mais.`,
      });
      continue;
    }

    if (!ids.has(aresta.target)) {
      problemas.push({
        nodeId: aresta.source,
        mensagem: `O nó "${rotulo(nodes, aresta.source)}" aponta para "${aresta.target}", que não existe.`,
      });
    }
  }

  return problemas;
}

function conferirNo(no: BotNode, edges: BotEdge[]): ProblemaGrafo[] {
  const problemas: ProblemaGrafo[] = [];
  const saidas = edges.filter((e) => e.source === no.id);
  const problema = (mensagem: string) => problemas.push({ nodeId: no.id, mensagem });

  switch (no.type) {
    case 'START':
      if (saidas.length === 0) {
        problema('O início não leva a lugar nenhum: o fluxo não faria nada.');
      }
      break;

    case 'MESSAGE':
      if (!no.data.text?.trim()) {
        problema('Esta mensagem está sem texto: o nó não faria nada.');
      }
      break;

    case 'QUESTION': {
      if (!no.data.text?.trim()) {
        problema('A pergunta está sem texto: o cliente receberia uma mensagem em branco.');
      }

      const opcoes = no.data.options ?? [];

      if (opcoes.length === 0) {
        // Campo livre. Legítimo — mas o motor avança pela aresta sem rótulo
        // depois de guardar a resposta, e sem ela a conversa acaba ali.
        if (saidas.length === 0) {
          problema(
            'A pergunta não leva a lugar nenhum: o cliente responderia e o fluxo ' +
              'terminaria ali, sem resposta e sem atendente.'
          );
        }
        break;
      }

      for (const opcao of opcoes) {
        if (!saidas.some((e) => (e.sourceHandle ?? null) === opcao.key)) {
          problema(`A opção "${opcao.label}" não leva a lugar nenhum.`);
        }
      }

      const chaves = opcoes.map((o) => o.key);
      if (new Set(chaves).size !== chaves.length) {
        problema('Duas opções usam a mesma tecla; a segunda nunca seria escolhida.');
      }
      break;
    }

    case 'CONDITION': {
      if (!no.data.variable?.trim()) {
        problema('A condição não diz qual variável comparar.');
      }

      for (const lado of ['true', 'false'] as const) {
        if (!saidas.some((e) => (e.sourceHandle ?? null) === lado)) {
          problema(
            `A condição não tem saída para o caso "${lado}" — quem cair nesse lado ` +
              'chega ao fim do fluxo sem atendimento.'
          );
        }
      }
      break;
    }

    case 'CAPTURE':
      if (!no.data.field?.trim()) {
        problema('A captura não diz em qual campo guardar a resposta.');
      }
      break;

    default:
      break;
  }

  return problemas;
}

function conferirAlcance(nodes: BotNode[], edges: BotEdge[], inicio: BotNode): ProblemaGrafo[] {
  const alcancados = alcancaveis(edges, inicio.id);

  return nodes
    .filter((n) => !alcancados.has(n.id))
    .map((n) => ({
      nodeId: n.id,
      mensagem: `O nó "${nomeDe(n)}" não é alcançado a partir do início.`,
    }));
}

/**
 * Nós de onde o fluxo nunca para.
 *
 * O motor percorre 25 nós numa mesma mensagem e então aborta, transferindo. Do
 * lado do cliente isso é uma rajada de mensagens repetidas seguida de silêncio,
 * e do lado da empresa é um número de WhatsApp mais perto do bloqueio.
 *
 * Um ciclo não é por si só um defeito: repetir o menu quando a pessoa digita
 * errado é um ciclo, e é o comportamento certo. O defeito é o ciclo do qual não
 * existe saída — nenhum caminho que chegue a uma pergunta, a uma transferência
 * ou ao fim.
 */
function conferirLacos(nodes: BotNode[], edges: BotEdge[], inicio: BotNode): ProblemaGrafo[] {
  const existe = new Set(nodes.map((n) => n.id));
  const param = new Set<string>();

  for (const no of nodes) {
    const saidas = edges.filter((e) => e.source === no.id && existe.has(e.target));
    if (PARADAS.includes(no.type) || saidas.length === 0) param.add(no.id);
  }

  // Alcança uma parada quem tem uma aresta para alguém que já alcança. Repete
  // até o conjunto estabilizar.
  let cresceu = true;
  while (cresceu) {
    cresceu = false;

    for (const no of nodes) {
      if (param.has(no.id)) continue;

      if (edges.some((e) => e.source === no.id && param.has(e.target))) {
        param.add(no.id);
        cresceu = true;
      }
    }
  }

  const alcancados = alcancaveis(edges, inicio.id);

  return nodes
    .filter((n) => n.type !== 'START' && alcancados.has(n.id) && !param.has(n.id))
    .map((n) => ({
      nodeId: n.id,
      mensagem:
        `O nó "${nomeDe(n)}" está num laço sem saída: o fluxo passaria por ele ` +
        'sem nunca parar, terminar ou chamar um atendente.',
    }));
}

// ---------------------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------------------

function alcancaveis(edges: BotEdge[], origem: string): Set<string> {
  const vistos = new Set<string>([origem]);
  const fila = [origem];

  while (fila.length > 0) {
    const atual = fila.shift() as string;

    for (const aresta of edges) {
      if (aresta.source !== atual || vistos.has(aresta.target)) continue;
      vistos.add(aresta.target);
      fila.push(aresta.target);
    }
  }

  return vistos;
}

/** O que a tela mostra: o rótulo se houver, senão o id. */
function nomeDe(no: BotNode): string {
  return no.data.label?.trim() || no.id;
}

function rotulo(nodes: BotNode[], id: string): string {
  const no = nodes.find((n) => n.id === id);
  return no ? nomeDe(no) : id;
}
