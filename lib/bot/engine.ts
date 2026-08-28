import { renderTemplate } from '@/lib/dispatch/template';
import type {
  BotGraph,
  BotNode,
  BotSessionState,
  SessionStatus,
} from './types';

/**
 * O motor do bot.
 *
 * **Puro.** Sem banco, sem rede, sem `Date.now`, sem `Math.random`. Recebe o
 * grafo, o estado da sessão e o que o cliente escreveu; devolve o próximo
 * estado e uma lista de ações para o executor realizar.
 *
 * A razão é direta: um bot testado só ponta a ponta se testa mandando mensagem
 * para alguém. Assim, cem caminhos de ramificação rodam em milissegundos — e o
 * simulador da tela sai de graça, porque simular é rodar isto sem executor.
 *
 * A parte que mais importa aqui não é o caminho feliz: são os tetos. Um ciclo
 * no grafo, sem eles, manda mensagem em laço para uma pessoa real e queima o
 * número da empresa em minutos. Um bot silencioso é um chamado de suporte; um
 * bot em laço é um número bloqueado.
 */

export type BotAction =
  | { tipo: 'ENVIAR'; texto: string }
  | { tipo: 'CAPTURAR'; campo: string; valor: string }
  | { tipo: 'TRANSFERIR'; departmentId: string | null; motivo: string }
  | { tipo: 'PERGUNTAR_IA'; pergunta: string }
  | { tipo: 'ENCERRAR'; motivo: string };

export interface StepInput {
  /** O que o cliente mandou. Vazio na primeira execução da conversa. */
  texto: string;
  /** Resolve `{{nome}}` e `{{empresa}}` no texto dos nós. */
  contato: { nome: string; empresa: string | null };
  /** Resposta do Gemini, realimentada pelo executor. */
  respostaIa?: string;
}

export interface StepResult {
  proximaSessao: BotSessionState;
  acoes: BotAction[];
  status: SessionStatus;
}

/** Nós percorridos numa única mensagem recebida. Barra ciclo no grafo. */
export const TETO_NOS = 25;

/** Mensagens enviadas numa única mensagem recebida. Barra rajada. */
export const TETO_MENSAGENS = 5;

/** Trocas com o nó de IA por sessão. Barra conversa infinita com o robô. */
export const TETO_TROCAS_IA = 3;

/**
 * O nó de início, ou `null`.
 *
 * Dois START também devolvem `null`: não dá para adivinhar por onde começar, e
 * escolher o primeiro faria o bot atender por um fluxo que ninguém desenhou.
 */
export function nodeInicial(grafo: BotGraph): BotNode | null {
  const inicios = grafo.nodes.filter((n) => n.type === 'START');
  return inicios.length === 1 ? inicios[0] : null;
}

export function sessaoInicial(grafo: BotGraph): BotSessionState {
  return {
    currentNodeId: nodeInicial(grafo)?.id ?? null,
    variables: {},
    aiTurns: 0,
    awaitingInput: false,
  };
}

/** Estado interno de uma passada, para não passar seis argumentos adiante. */
interface Passada {
  grafo: BotGraph;
  entrada: StepInput;
  sessao: BotSessionState;
  acoes: BotAction[];
  nosPercorridos: number;
  mensagensEnviadas: number;
}

export function step(
  grafo: BotGraph,
  sessao: BotSessionState,
  entrada: StepInput
): StepResult {
  const p: Passada = {
    grafo,
    entrada,
    sessao: { ...sessao, variables: { ...sessao.variables } },
    acoes: [],
    nosPercorridos: 0,
    mensagensEnviadas: 0,
  };

  // Sem início não há por onde andar. Transferir é a única saída honesta:
  // ficar em silêncio deixaria o cliente falando sozinho.
  if (!p.sessao.currentNodeId) {
    return abortar(p, 'O fluxo não tem um nó de início válido.');
  }

  // A sessão estava parada esperando resposta. Consumir a entrada é o primeiro
  // passo, e ele pode não avançar (resposta inválida repete a pergunta).
  if (p.sessao.awaitingInput) {
    const retomada = retomar(p);
    if (retomada) return retomada;
  }

  return avancar(p);
}

/**
 * Consome a resposta do cliente no nó em que a sessão parou.
 *
 * Devolve um `StepResult` quando a passada termina aqui mesmo — resposta
 * inválida, ou espera continuando —, e `null` quando o fluxo deve seguir.
 */
function retomar(p: Passada): StepResult | null {
  const atual = acharNo(p.grafo, p.sessao.currentNodeId);
  if (!atual) return abortar(p, 'A sessão apontava para um nó que não existe mais.');

  if (atual.type === 'AI') {
    // O executor ainda não trouxe a resposta: nada a fazer nesta passada.
    if (p.entrada.respostaIa === undefined) {
      return { proximaSessao: p.sessao, acoes: [], status: 'RUNNING' };
    }

    const texto = p.entrada.respostaIa.trim();
    if (texto) enviar(p, texto);

    p.sessao = {
      ...p.sessao,
      aiTurns: p.sessao.aiTurns + 1,
      awaitingInput: false,
    };

    return null;
  }

  if (atual.type !== 'QUESTION') {
    p.sessao = { ...p.sessao, awaitingInput: false };
    return null;
  }

  const resposta = p.entrada.texto.trim();
  const opcoes = atual.data.options ?? [];

  // Pergunta sem opções é campo livre: qualquer coisa serve, e quem grava é o
  // nó de captura seguinte.
  if (opcoes.length === 0) {
    const saida = seguir(p.grafo, atual.id, null);

    if (saida.tipo === 'QUEBRADA') {
      return abortar(p, `A pergunta aponta para o nó "${saida.alvo}", que não existe.`);
    }

    p.sessao = {
      ...p.sessao,
      variables: { ...p.sessao.variables, __ultimaResposta: resposta },
      // Avançar aqui é o que impede o fluxo de repetir a mesma pergunta para
      // sempre depois de o cliente já ter respondido.
      currentNodeId: saida.tipo === 'OK' ? saida.destino : null,
      awaitingInput: false,
    };
    return null;
  }

  const escolhida = casarOpcao(opcoes, resposta);

  if (!escolhida) {
    // Repetir, não transferir e não calar. Quem digitou errado precisa de outra
    // chance — transferir na primeira confusão joga fora o fluxo inteiro.
    enviar(p, textoDaPergunta(p, atual));
    return {
      proximaSessao: { ...p.sessao, awaitingInput: true },
      acoes: p.acoes,
      status: 'RUNNING',
    };
  }

  const saida = seguir(p.grafo, atual.id, escolhida.key);
  if (saida.tipo !== 'OK') {
    return abortar(p, `A opção "${escolhida.label}" não leva a lugar nenhum.`);
  }

  p.sessao = {
    ...p.sessao,
    variables: { ...p.sessao.variables, __ultimaResposta: escolhida.key },
    currentNodeId: saida.destino,
    awaitingInput: false,
  };

  return null;
}

/** Caminha pelo grafo até parar, encerrar ou bater num teto. */
function avancar(p: Passada): StepResult {
  while (p.sessao.currentNodeId) {
    if (p.nosPercorridos >= TETO_NOS) {
      return abortar(
        p,
        'O fluxo passou do limite de passos numa mesma mensagem — provavelmente há um ciclo.'
      );
    }
    p.nosPercorridos += 1;

    const atual = acharNo(p.grafo, p.sessao.currentNodeId);
    if (!atual) return abortar(p, 'O fluxo aponta para um nó que não existe.');

    switch (atual.type) {
      case 'START': {
        const saida = seguir(p.grafo, atual.id, null);
        if (saida.tipo === 'QUEBRADA') return quebrado(p, saida.alvo);
        if (saida.tipo === 'SEM_SAIDA') return concluir(p, 'O fluxo não tem nada depois do início.');
        p.sessao = { ...p.sessao, currentNodeId: saida.destino };
        break;
      }

      case 'MESSAGE': {
        const texto = interpolar(p, atual.data.text);
        if (texto) {
          if (p.mensagensEnviadas >= TETO_MENSAGENS) {
            return abortar(p, 'O fluxo tentou enviar mensagens demais de uma vez.');
          }
          enviar(p, texto);
        }

        const saida = seguir(p.grafo, atual.id, null);
        if (saida.tipo === 'QUEBRADA') return quebrado(p, saida.alvo);
        if (saida.tipo === 'SEM_SAIDA') return concluir(p, 'Fim do fluxo.');
        p.sessao = { ...p.sessao, currentNodeId: saida.destino };
        break;
      }

      case 'QUESTION': {
        if (p.mensagensEnviadas >= TETO_MENSAGENS) {
          return abortar(p, 'O fluxo tentou enviar mensagens demais de uma vez.');
        }
        enviar(p, textoDaPergunta(p, atual));

        return {
          proximaSessao: { ...p.sessao, currentNodeId: atual.id, awaitingInput: true },
          acoes: p.acoes,
          status: 'RUNNING',
        };
      }

      case 'CONDITION': {
        const valor = p.sessao.variables[atual.data.variable ?? ''];
        const casou = valor !== undefined && valor === atual.data.equals;

        const saida = seguir(p.grafo, atual.id, casou ? 'true' : 'false');
        if (saida.tipo === 'QUEBRADA') return quebrado(p, saida.alvo);
        if (saida.tipo === 'SEM_SAIDA') return concluir(p, 'A condição não tem saída para este caso.');
        p.sessao = { ...p.sessao, currentNodeId: saida.destino };
        break;
      }

      case 'CAPTURE': {
        const campo = atual.data.field?.trim();
        const valor = p.sessao.variables.__ultimaResposta ?? '';

        if (campo && valor) {
          p.sessao = {
            ...p.sessao,
            variables: { ...p.sessao.variables, [campo]: valor },
          };
          p.acoes.push({ tipo: 'CAPTURAR', campo, valor });
        }

        const saida = seguir(p.grafo, atual.id, null);
        if (saida.tipo === 'QUEBRADA') return quebrado(p, saida.alvo);
        if (saida.tipo === 'SEM_SAIDA') return concluir(p, 'Fim do fluxo.');
        p.sessao = { ...p.sessao, currentNodeId: saida.destino };
        break;
      }

      case 'AI': {
        // O teto é por sessão, não por passada: é o que impede a conversa com
        // o robô de nunca terminar.
        if (p.sessao.aiTurns >= TETO_TROCAS_IA) {
          return transferir(
            p,
            atual.data.departmentId ?? null,
            'A conversa com o assistente chegou ao limite de trocas.'
          );
        }

        const pergunta = p.entrada.texto.trim();
        if (!pergunta) {
          const saida = seguir(p.grafo, atual.id, null);
          if (saida.tipo === 'QUEBRADA') return quebrado(p, saida.alvo);
          if (saida.tipo === 'SEM_SAIDA') return concluir(p, 'Fim do fluxo.');
          p.sessao = { ...p.sessao, currentNodeId: saida.destino };
          break;
        }

        p.acoes.push({ tipo: 'PERGUNTAR_IA', pergunta });
        return {
          proximaSessao: { ...p.sessao, currentNodeId: atual.id, awaitingInput: true },
          acoes: p.acoes,
          status: 'RUNNING',
        };
      }

      case 'TRANSFER':
        return transferir(
          p,
          atual.data.departmentId ?? null,
          'Fluxo encaminhou para o setor.'
        );

      case 'END': {
        const texto = interpolar(p, atual.data.text);
        if (texto && p.mensagensEnviadas < TETO_MENSAGENS) enviar(p, texto);
        return concluir(p, 'Fim do fluxo.');
      }

      default:
        return abortar(p, `Tipo de nó desconhecido: ${String(atual.type)}.`);
    }
  }

  return concluir(p, 'Fim do fluxo.');
}

// ---------------------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------------------

function acharNo(grafo: BotGraph, id: string | null): BotNode | null {
  if (!id) return null;
  return grafo.nodes.find((n) => n.id === id) ?? null;
}

/**
 * Para onde ir a partir de `origem`, saindo por `handle`.
 *
 * Os três resultados são distintos de propósito. "Não tem aresta" é fim de
 * fluxo — normal, encerra. "Tem aresta apontando para um nó que não existe" é
 * grafo quebrado — precisa transferir e registrar, porque alguém publicou algo
 * defeituoso e ninguém vai descobrir se o bot só encerrar em silêncio.
 */
type Saida =
  | { tipo: 'OK'; destino: string }
  | { tipo: 'SEM_SAIDA' }
  | { tipo: 'QUEBRADA'; alvo: string };

function seguir(grafo: BotGraph, origem: string, handle: string | null): Saida {
  const aresta = grafo.edges.find(
    (e) => e.source === origem && (handle === null ? true : (e.sourceHandle ?? null) === handle)
  );

  if (!aresta) return { tipo: 'SEM_SAIDA' };

  if (!grafo.nodes.some((n) => n.id === aresta.target)) {
    return { tipo: 'QUEBRADA', alvo: aresta.target };
  }

  return { tipo: 'OK', destino: aresta.target };
}

function interpolar(p: Passada, texto: string | undefined): string {
  if (!texto?.trim()) return '';
  return renderTemplate(texto, {
    nome: p.entrada.contato.nome,
    empresa: p.entrada.contato.empresa,
  });
}

/**
 * O texto da pergunta com as opções listadas.
 *
 * Sem as opções no corpo da mensagem, o cliente não tem como saber o que
 * digitar — o menu existiria só no desenho do fluxo.
 */
function textoDaPergunta(p: Passada, no: BotNode): string {
  const cabeca = interpolar(p, no.data.text);
  const opcoes = no.data.options ?? [];

  if (opcoes.length === 0) return cabeca;

  const linhas = opcoes.map((o) => `${o.key}) ${o.label}`);
  return [cabeca, '', ...linhas].filter((l) => l !== undefined).join('\n');
}

/**
 * Casa a resposta do cliente com uma opção.
 *
 * Aceita a chave ("2"), a chave com pontuação ("2.") e o rótulo escrito por
 * extenso ("suporte") — as três formas em que uma pessoa responde a um menu.
 */
function casarOpcao(
  opcoes: Array<{ key: string; label: string }>,
  resposta: string
): { key: string; label: string } | null {
  const limpo = normalizar(resposta);
  if (!limpo) return null;

  return (
    opcoes.find((o) => normalizar(o.key) === limpo) ??
    opcoes.find((o) => normalizar(o.label) === limpo) ??
    null
  );
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(ACENTOS, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Marcas de acento soltas depois do NFD (U+0300 a U+036F). */
const ACENTOS = new RegExp('[\u0300-\u036f]', 'g');

function enviar(p: Passada, texto: string): void {
  p.acoes.push({ tipo: 'ENVIAR', texto });
  p.mensagensEnviadas += 1;
}

/**
 * Aresta apontando para um nó que não existe: alguém publicou um grafo
 * defeituoso.
 *
 * Transfere e registra, em vez de encerrar em silêncio — encerrar faria o
 * defeito passar despercebido até o próximo cliente cair nele.
 */
function quebrado(p: Passada, alvo: string): StepResult {
  return abortar(p, `O fluxo aponta para o nó "${alvo}", que não existe.`);
}

function concluir(p: Passada, motivo: string): StepResult {
  p.acoes.push({ tipo: 'ENCERRAR', motivo });
  return {
    proximaSessao: { ...p.sessao, currentNodeId: null, awaitingInput: false },
    acoes: p.acoes,
    status: 'DONE',
  };
}

function transferir(p: Passada, departmentId: string | null, motivo: string): StepResult {
  p.acoes.push({ tipo: 'TRANSFERIR', departmentId, motivo });
  return {
    proximaSessao: { ...p.sessao, currentNodeId: null, awaitingInput: false },
    acoes: p.acoes,
    status: 'HANDED_OFF',
  };
}

/**
 * Saída de emergência: o fluxo está quebrado ou bateu num teto.
 *
 * Sempre transfere para um humano — nunca fica em silêncio. Silêncio é o modo
 * de falha que ninguém percebe: o cliente acha que foi ignorado e a empresa
 * não fica sabendo.
 */
function abortar(p: Passada, motivo: string): StepResult {
  p.acoes.push({ tipo: 'TRANSFERIR', departmentId: null, motivo });
  return {
    proximaSessao: { ...p.sessao, currentNodeId: null, awaitingInput: false },
    acoes: p.acoes,
    status: 'ABORTED',
  };
}
