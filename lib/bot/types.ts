/**
 * O formato do grafo, do estado e dos erros do bot.
 *
 * Sem I/O e sem dependências: este arquivo é importado tanto pelo motor (que
 * roda no servidor) quanto pelo canvas e pelo simulador (que rodam no
 * navegador). Qualquer `import` de Prisma ou de sessão aqui quebraria o build
 * do cliente — foi assim que a F5 quebrou, em `quick-replies.ts`.
 */

export type BotNodeType =
  | 'START'
  | 'MESSAGE'
  | 'QUESTION'
  | 'CONDITION'
  | 'CAPTURE'
  | 'TRANSFER'
  | 'AI'
  | 'END';

export interface BotNodeData {
  label?: string;
  /** MESSAGE, QUESTION, END, AI: texto enviado. Aceita {{nome}} e {{empresa}}. */
  text?: string;
  /** QUESTION: o que se oferece. `key` é o que o cliente digita ("1", "2"). */
  options?: Array<{ key: string; label: string }>;
  /**
   * QUESTION: como as opções chegam ao cliente.
   *
   * `LISTA` numera (`1) Comercial`); `NATURAL` escreve em frase corrida;
   * `LIVRE` não lista nada, porque a pergunta já diz quais são as respostas —
   * é o caso de toda pergunta de sim ou não, em que enumerar as opções produz
   * "Você ainda precisa? Ainda preciso ou Já resolvi?".
   *
   * Vazio segue a configuração da organização — que é o normal, para o
   * interruptor de humanização valer para o fluxo inteiro de uma vez.
   */
  estilo?: 'LISTA' | 'NATURAL' | 'LIVRE';
  /** QUESTION: abertura da segunda tentativa, quando o cliente não entendeu. */
  reperguntaTexto?: string;
  /** CONDITION: variável comparada e o valor esperado. */
  variable?: string;
  equals?: string;
  /** CAPTURE: nome do campo em `contacts.custom_fields`. */
  field?: string;
  /**
   * TRANSFER: setor de destino. Nulo cai na distribuição padrão da F3.
   *
   * O `text` deste nó, quando escrito, é a última frase antes de uma pessoa
   * assumir. Vazio usa a frase padrão do motor.
   */
  departmentId?: string | null;
}

export interface BotNode {
  id: string;
  type: BotNodeType;
  /** Posição no canvas. O motor ignora; só o editor usa. */
  position: { x: number; y: number };
  data: BotNodeData;
}

export interface BotEdge {
  id: string;
  source: string;
  target: string;
  /**
   * Por onde a aresta sai do nó de origem.
   *
   * QUESTION: a `key` da opção. CONDITION: `'true'` ou `'false'`. Nos demais,
   * nulo — eles têm uma saída só.
   */
  sourceHandle?: string | null;
}

export interface BotGraph {
  nodes: BotNode[];
  edges: BotEdge[];
}

/** Grafo vazio, para fluxo recém-criado. */
export const GRAFO_VAZIO: BotGraph = { nodes: [], edges: [] };

export type FlowStatus = 'DRAFT' | 'PUBLISHED';

/**
 * Como a sessão terminou.
 *
 * `HANDED_OFF` é entrega planejada a um humano; `ABORTED` é o bot batendo num
 * teto ou num grafo quebrado. Distinguir os dois é o que permite descobrir que
 * um fluxo está abortando sem ninguém reclamar.
 */
export type SessionStatus = 'RUNNING' | 'HANDED_OFF' | 'DONE' | 'ABORTED';

export interface BotSessionState {
  currentNodeId: string | null;
  variables: Record<string, string>;
  aiTurns: number;
  /** Verdadeiro quando o fluxo parou numa pergunta e espera o cliente. */
  awaitingInput: boolean;
}

/** Erro de domínio do bot: vira 400 ou 422, nunca 500. */
export class BotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BotError';
  }
}

/** Converte o JSONB do Prisma em grafo, sem confiar no que está gravado. */
export function asGraph(valor: unknown): BotGraph {
  if (!valor || typeof valor !== 'object') return GRAFO_VAZIO;

  const bruto = valor as { nodes?: unknown; edges?: unknown };

  return {
    nodes: Array.isArray(bruto.nodes) ? (bruto.nodes as BotNode[]) : [],
    edges: Array.isArray(bruto.edges) ? (bruto.edges as BotEdge[]) : [],
  };
}
