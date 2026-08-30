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
  /**
   * Escreve como gente: menu em linguagem corrida em vez de lista numerada,
   * repergunta reformulada em vez de repetida, e uma frase antes de entregar a
   * conversa a uma pessoa.
   *
   * Chega por aqui, e não de uma leitura de configuração, porque o motor é
   * puro: quem lê `bot_settings` é o executor. É também o que permite ao
   * simulador mostrar os dois comportamentos lado a lado.
   */
  humanizado?: boolean;
  /**
   * Primeiro nome com que o robô assina, resolvendo `{{atendente}}`.
   *
   * Vazio some do texto — e é por isso que ele só deve aparecer em frase que
   * sobrevive à ausência dele. O menu de triagem pronto resolve isso de outro
   * jeito: quando há nome, ele ganha uma apresentação inteira a mais; quando
   * não há, a frase simplesmente não existe no fluxo.
   */
  persona?: string;
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
 * Quantas vezes o cliente pode errar a escolha antes de virar caso de gente.
 *
 * Antes disto, o motor repetia a mesma pergunta indefinidamente, palavra por
 * palavra. Duas coisas erradas ao mesmo tempo: nenhuma pessoa se repete assim,
 * e quem não entendeu na segunda tentativa não vai entender na sétima — vai
 * desistir. Duas chances, e a segunda com outras palavras.
 */
export const TETO_TENTATIVAS = 2;

/**
 * A variável interna que conta os erros na pergunta atual.
 *
 * Vive em `variables` com o prefixo `__`, a mesma convenção de
 * `__ultimaResposta`: é estado do motor, não campo capturado, e nenhum nó de
 * captura escreve com esse prefixo. Guardar aqui evita uma coluna nova em
 * `bot_sessions` para um contador que morre junto com a pergunta.
 */
const VAR_TENTATIVAS = '__tentativas';

/**
 * O que o robô diz ao entregar a conversa, quando ninguém escreveu nada no nó.
 *
 * Não menciona transferência, setor, fila nem robô. É de propósito: a frase
 * existe para que a pessoa que assumir possa continuar dali sem emenda, e
 * qualquer uma dessas palavras denunciaria a troca. "Deixa eu ver" também
 * mantém a primeira pessoa — quem chega depois não precisa se reapresentar.
 */
export const ENTREGA_PADRAO = 'Deixa eu ver isso certinho pra você, um minutinho.';

/**
 * A abertura da segunda tentativa.
 *
 * Não promete reformular, porque o motor não reformula nada — ele repete a
 * mesma pergunta com outra abertura. "Deixa eu perguntar de outro jeito"
 * seguido da pergunta idêntica é pior que não se desculpar: entrega que quem
 * está do outro lado não é capaz de dizer a mesma coisa de duas maneiras.
 */
export const REPERGUNTA_PADRAO = 'Desculpa, não entendi.';

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

    /**
     * Respondeu: volta a esperar o cliente, no mesmo nó.
     *
     * Continuar a caminhada aqui seria voltar ao próprio nó de IA com o texto
     * do cliente ainda em `entrada.texto` — e ele perguntaria de novo, e de
     * novo, até estourar o teto de trocas. Uma pergunta viraria três respostas
     * em rajada, e o teto que existe para limitar a conversa com o robô viraria
     * o gatilho de uma metralhadora.
     *
     * O nó de IA é uma conversa por turnos: uma mensagem do cliente, uma
     * resposta. Ele só é deixado quando o teto de trocas transfere.
     */
    return {
      proximaSessao: {
        ...p.sessao,
        aiTurns: p.sessao.aiTurns + 1,
        currentNodeId: atual.id,
        awaitingInput: true,
      },
      acoes: p.acoes,
      status: 'RUNNING',
    };
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
    const tentativas = Number(p.sessao.variables[VAR_TENTATIVAS] ?? '0') + 1;

    // Esgotadas as chances, entregar a uma pessoa. Continuar reperguntando é o
    // caminho para o cliente sair da conversa achando que ninguém o entende.
    if (tentativas >= TETO_TENTATIVAS) {
      return transferir(p, null, 'O cliente não conseguiu escolher no menu.');
    }

    // Repetir, não transferir e não calar. Quem digitou errado precisa de outra
    // chance — transferir na primeira confusão joga fora o fluxo inteiro.
    enviar(p, textoDaPergunta(p, atual, tentativas));

    return {
      proximaSessao: {
        ...p.sessao,
        variables: { ...p.sessao.variables, [VAR_TENTATIVAS]: String(tentativas) },
        awaitingInput: true,
      },
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
    // O contador zera junto com a pergunta: um tropeço no menu de setor não
    // pode encurtar a paciência do robô numa pergunta seguinte.
    variables: { ...p.sessao.variables, __ultimaResposta: escolhida.key, [VAR_TENTATIVAS]: '0' },
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
          'Fluxo encaminhou para o setor.',
          interpolar(p, atual.data.text)
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

/** `{{atendente}}`, em qualquer caixa e com espaços à vontade. */
const PLACEHOLDER_PERSONA = /\{\{\s*atendente\s*\}\}/gi;

function interpolar(p: Passada, texto: string | undefined): string {
  if (!texto?.trim()) return '';

  // A persona é resolvida aqui, e não em `renderTemplate`, porque aquele
  // arquivo também serve às campanhas de disparo — que não têm persona alguma.
  // Ensinar `{{atendente}}` lá faria a prévia do disparo aceitar em silêncio
  // uma variável que nunca seria preenchida.
  const comPersona = texto.replace(PLACEHOLDER_PERSONA, p.entrada.persona?.trim() ?? '');

  return renderTemplate(comPersona, {
    nome: p.entrada.contato.nome,
    empresa: p.entrada.contato.empresa,
  });
}

/**
 * O texto da pergunta, com as opções apresentadas.
 *
 * Sem as opções no corpo da mensagem, o cliente não tem como saber o que
 * responder — o menu existiria só no desenho do fluxo.
 *
 * Dois formatos, e a diferença é o tell mais alto que um robô tem:
 *
 * - **LISTA** — `1) Comercial` / `2) Financeiro`. Confiável e inconfundível:
 *   pessoa nenhuma escreve assim no WhatsApp.
 * - **NATURAL** — as opções entram numa frase corrida. Se o autor do fluxo já
 *   escreveu os rótulos dentro da pergunta, nada é acrescentado: reescrever
 *   por cima do que alguém redigiu à mão sempre sai pior.
 */
function textoDaPergunta(p: Passada, no: BotNode, tentativa = 0): string {
  const cabeca = interpolar(p, no.data.text);
  const opcoes = no.data.options ?? [];
  const estilo = no.data.estilo ?? (p.entrada.humanizado ? 'NATURAL' : 'LISTA');

  // Na repergunta, uma abertura diferente antes do mesmo conteúdo. Repetir
  // palavra por palavra é o que denuncia a máquina — e o que faz o cliente
  // achar que não foi lido.
  const abertura =
    tentativa > 0 && estilo !== 'LISTA'
      ? `${no.data.reperguntaTexto?.trim() || REPERGUNTA_PADRAO} `
      : '';

  if (opcoes.length === 0 || estilo === 'LIVRE') return `${abertura}${cabeca}`.trim();

  if (estilo === 'LISTA') {
    const linhas = opcoes.map((o) => `${o.key}) ${o.label}`);
    return [cabeca, '', ...linhas].join('\n');
  }

  const rotulos = opcoes.map((o) => o.label);
  const corpo = mencionaTodas(cabeca, rotulos) ? cabeca : `${cabeca}\n${enumerar(rotulos)}?`;

  return `${abertura}${corpo}`.trim();
}

/** "A, B ou C" — como se escreve uma escolha em português. */
function enumerar(rotulos: string[]): string {
  if (rotulos.length === 0) return '';
  if (rotulos.length === 1) return rotulos[0];

  return `${rotulos.slice(0, -1).join(', ')} ou ${rotulos[rotulos.length - 1]}`;
}

/** Verdadeiro quando a pergunta já cita todos os rótulos por conta própria. */
function mencionaTodas(texto: string, rotulos: string[]): boolean {
  const alvo = normalizar(texto);
  return rotulos.every((r) => alvo.includes(normalizar(r)));
}

/**
 * Casa a resposta do cliente com uma opção.
 *
 * Quatro passadas, da mais segura para a mais tolerante. A ordem é o desenho:
 * uma correspondência exata nunca pode perder para um palpite, e um palpite
 * ambíguo nunca vira escolha — mandar o cliente para o setor errado é pior que
 * perguntar de novo, porque o erro só aparece depois que uma pessoa já perdeu
 * tempo com ele.
 *
 * O que cada passada resgata, na prática: "2", "Financeiro", "quero a 2",
 * "é sobre vendas".
 */
export function casarOpcao(
  opcoes: Array<{ key: string; label: string }>,
  resposta: string
): { key: string; label: string } | null {
  const limpo = normalizar(resposta);
  if (!limpo) return null;

  const exata =
    opcoes.find((o) => normalizar(o.key) === limpo) ??
    opcoes.find((o) => normalizar(o.label) === limpo);

  if (exata) return exata;

  const cercado = ` ${limpo} `;
  const palavras = limpo.split(' ');

  // "quero a 2", "pode ser a 1". Só em resposta curta: em "tenho 2 filhos" o
  // número é dado do cliente, não escolha de menu.
  if (palavras.length <= 4) {
    const porChave = opcoes.filter((o) => cercado.includes(` ${normalizar(o.key)} `));
    if (porChave.length === 1) return porChave[0];
  }

  // "é sobre vendas" contra o rótulo "Comercial & Vendas".
  const porRotulo = opcoes.filter((o) =>
    palavrasDoRotulo(o.label).some((termo) => palavras.some((dita) => casaPalavra(termo, dita)))
  );

  return porRotulo.length === 1 ? porRotulo[0] : null;
}

/**
 * As palavras de um rótulo que valem como pista.
 *
 * Curtas ficam de fora: "de", "e", "da" aparecem em qualquer frase e casariam
 * com tudo. Quatro letras é onde "Vendas" e "Suporte" entram e o ruído não.
 */
function palavrasDoRotulo(rotulo: string): string[] {
  return normalizar(rotulo)
    .split(' ')
    .filter((palavra) => palavra.length >= 4);
}

/** Tolera plural e flexão curta: "venda" casa com "vendas". */
function casaPalavra(termo: string, dita: string): boolean {
  if (termo === dita) return true;
  if (dita.length >= 4 && termo.startsWith(dita)) return true;
  if (termo.length >= 4 && dita.startsWith(termo)) return true;
  return false;
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

function transferir(
  p: Passada,
  departmentId: string | null,
  motivo: string,
  texto?: string
): StepResult {
  despedir(p, texto);
  p.acoes.push({ tipo: 'TRANSFERIR', departmentId, motivo });
  return {
    proximaSessao: { ...p.sessao, currentNodeId: null, awaitingInput: false },
    acoes: p.acoes,
    status: 'HANDED_OFF',
  };
}

/**
 * A frase antes de entregar a conversa a uma pessoa.
 *
 * Antes disto, a entrega era muda: o cliente escolhia um setor e caía num vazio
 * até alguém aparecer. Silêncio parece discreto e não é — é o modo de falha que
 * faz o cliente perguntar "alô?" e concluir que foi ignorado.
 *
 * Texto escrito no nó vale sempre: alguém redigiu aquilo de propósito. A frase
 * padrão só entra com a humanização ligada, para o interruptor devolver o
 * comportamento anterior exatamente como era.
 */
function despedir(p: Passada, texto?: string): void {
  const escrito = (texto ?? '').trim();
  const frase = escrito || (p.entrada.humanizado ? ENTREGA_PADRAO : '');

  if (!frase || p.mensagensEnviadas >= TETO_MENSAGENS) return;

  enviar(p, frase);
}

/**
 * Saída de emergência: o fluxo está quebrado ou bateu num teto.
 *
 * Sempre transfere para um humano — nunca fica em silêncio. Silêncio é o modo
 * de falha que ninguém percebe: o cliente acha que foi ignorado e a empresa
 * não fica sabendo.
 */
function abortar(p: Passada, motivo: string): StepResult {
  // O fluxo quebrou, mas quem está do outro lado não tem nada com isso: uma
  // frase é o que separa "estão vendo meu caso" de "fui ignorado".
  despedir(p);
  p.acoes.push({ tipo: 'TRANSFERIR', departmentId: null, motivo });
  return {
    proximaSessao: { ...p.sessao, currentNodeId: null, awaitingInput: false },
    acoes: p.acoes,
    status: 'ABORTED',
  };
}
