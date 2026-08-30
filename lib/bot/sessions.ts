import { prisma } from '@/lib/prisma';
import { asGraph, type BotGraph, type BotSessionState } from './types';
import { sessaoInicial } from './engine';

/**
 * O estado de uma conversa dentro de um fluxo.
 *
 * Este arquivo é o único lugar que sabe onde a sessão mora. O motor não sabe —
 * ele é puro — e o executor pede tudo por aqui.
 */

export interface SessaoCarregada {
  id: string;
  conversationId: string;
  organizationId: string;
  flowId: string;
  version: number;
  /** Da versão publicada, **nunca** do rascunho. */
  grafo: BotGraph;
  estado: BotSessionState;
  startedAt: Date;
}

/**
 * Teto de duração da sessão.
 *
 * Uma sessão órfã de semanas, retomada do nó 4, mandaria ao cliente a metade
 * de uma conversa que ele não lembra de ter começado. O relógio mora aqui e
 * não no motor, que é puro e não chama `Date.now`.
 */
export const SESSAO_MAX_MS = 24 * 60 * 60 * 1000;

/**
 * A sessão ativa da conversa, ou `null`.
 *
 * Sessão vencida é encerrada aqui mesmo e devolve `null` — para quem chama, é
 * como se não houvesse sessão nenhuma, que é exatamente o comportamento certo.
 */
export async function sessaoAtiva(conversationId: string): Promise<SessaoCarregada | null> {
  const linha = await prisma.botSession.findFirst({
    where: { conversationId, status: 'RUNNING' },
    select: {
      id: true,
      conversationId: true,
      organizationId: true,
      flowId: true,
      version: true,
      currentNodeId: true,
      variables: true,
      aiTurns: true,
      awaitingInput: true,
      startedAt: true,
    },
  });

  if (!linha) return null;

  if (Date.now() - linha.startedAt.getTime() > SESSAO_MAX_MS) {
    await encerrarSessao(conversationId, 'Sessão expirada por tempo.');
    return null;
  }

  const versao = await prisma.botFlowVersion.findFirst({
    where: { flowId: linha.flowId, version: linha.version },
    select: { graph: true },
  });

  if (!versao) {
    // A versão sumiu debaixo da sessão. Não dá para continuar de onde parou, e
    // adivinhar por outra versão mandaria o cliente para um nó aleatório.
    await encerrarSessao(conversationId, 'A versão do fluxo não existe mais.');
    return null;
  }

  return {
    id: linha.id,
    conversationId: linha.conversationId,
    organizationId: linha.organizationId,
    flowId: linha.flowId,
    version: linha.version,
    grafo: asGraph(versao.graph),
    estado: {
      currentNodeId: linha.currentNodeId,
      variables: (linha.variables as Record<string, string> | null) ?? {},
      aiTurns: linha.aiTurns,
      awaitingInput: linha.awaitingInput,
    },
    startedAt: linha.startedAt,
  };
}

/**
 * Qual fluxo abre a sessão.
 *
 * `TRIGGER` atende quem chegou agora. `REENGAGE` retoma quem já estava sendo
 * atendido e ficou parado — e por isso não pode ser o mesmo fluxo: "Olá! Você
 * chegou ao atendimento da nossa equipe" é exatamente a frase errada para quem
 * espera resposta há dois dias.
 */
export type PapelDoFluxo = 'TRIGGER' | 'REENGAGE';

/**
 * Abre uma sessão para uma conversa que ainda não tem.
 *
 * Devolve `null` — e o bot simplesmente não atua — quando não há fluxo
 * publicado para o papel pedido. Uma organização sem bot precisa continuar
 * funcionando como antes da F6, sem nenhuma diferença perceptível.
 */
export async function abrirSessao(
  organizationId: string,
  conversationId: string,
  papel: PapelDoFluxo = 'TRIGGER'
): Promise<SessaoCarregada | null> {
  const fluxo = await fluxoPublicado(organizationId, papel);

  if (!fluxo?.publishedVersion) return null;

  const versao = await prisma.botFlowVersion.findFirst({
    where: { flowId: fluxo.id, version: fluxo.publishedVersion },
    select: { graph: true },
  });

  if (!versao) return null;

  const grafo = asGraph(versao.graph);
  const estado = sessaoInicial(grafo);

  // Sem nó de início não vale abrir sessão: o motor abortaria e transferiria,
  // gastando uma linha de sessão para não fazer nada.
  if (!estado.currentNodeId) return null;

  try {
    const criada = await prisma.botSession.create({
      data: {
        conversationId,
        organizationId,
        flowId: fluxo.id,
        version: fluxo.publishedVersion,
        currentNodeId: estado.currentNodeId,
        variables: {},
        aiTurns: 0,
        awaitingInput: false,
        status: 'RUNNING',
      },
      select: { id: true, startedAt: true },
    });

    return {
      id: criada.id,
      conversationId,
      organizationId,
      flowId: fluxo.id,
      version: fluxo.publishedVersion,
      grafo,
      estado,
      startedAt: criada.startedAt,
    };
  } catch {
    // Corrida com outra execução: o índice único parcial
    // `bot_sessions_active_key` recusou a segunda. Quem perdeu carrega a que
    // venceu, em vez de estourar — duas sessões responderiam em dobro.
    return sessaoAtiva(conversationId);
  }
}

/**
 * O fluxo publicado do papel pedido.
 *
 * A retomada cai no fluxo-gatilho quando não há um fluxo de retomada próprio:
 * uma saudação fora de contexto ainda é melhor que silêncio. Quem quiser a
 * mensagem certa publica um fluxo de retomada.
 */
async function fluxoPublicado(
  organizationId: string,
  papel: PapelDoFluxo
): Promise<{ id: string; publishedVersion: number | null } | null> {
  const publicado = {
    organizationId,
    status: 'PUBLISHED',
    publishedVersion: { not: null },
  } as const;

  if (papel === 'REENGAGE') {
    const retomada = await prisma.botFlow.findFirst({
      where: { ...publicado, isReengage: true },
      select: { id: true, publishedVersion: true },
    });

    if (retomada) return retomada;
  }

  return prisma.botFlow.findFirst({
    where: { ...publicado, isTrigger: true },
    select: { id: true, publishedVersion: true },
  });
}

/** Grava o avanço da sessão. */
export async function salvarEstado(
  sessionId: string,
  estado: BotSessionState,
  status: 'RUNNING' | 'HANDED_OFF' | 'DONE' | 'ABORTED'
): Promise<void> {
  await prisma.botSession.update({
    where: { id: sessionId },
    data: {
      currentNodeId: estado.currentNodeId,
      variables: estado.variables,
      aiTurns: estado.aiTurns,
      awaitingInput: estado.awaitingInput,
      status,
      updatedAt: new Date(),
    },
  });
}

/**
 * Encerra a sessão da conversa. Idempotente de propósito.
 *
 * É chamada de muitos lugares — resposta humana, transferência, expiração,
 * falha do motor — e nenhum deles deveria precisar saber se já havia sessão.
 */
export async function encerrarSessao(conversationId: string, motivo: string): Promise<void> {
  const ativa = await prisma.botSession.findFirst({
    where: { conversationId, status: 'RUNNING' },
    select: { id: true },
  });

  if (!ativa) return;

  await prisma.botSession.updateMany({
    where: { id: ativa.id, status: 'RUNNING' },
    data: { status: 'HANDED_OFF', awaitingInput: false, updatedAt: new Date() },
  });

  await gravarEvento(ativa.id, null, 'TRANSFER', motivo);
}

/**
 * Trilha do que o bot fez.
 *
 * Nunca lança: perder uma linha de log não pode derrubar um atendimento. Mas
 * sem a trilha, "o bot mandou uma coisa estranha para o cliente" é impossível
 * de investigar — o histórico mostra o texto e não por qual nó ele passou.
 */
export async function gravarEvento(
  sessionId: string,
  nodeId: string | null,
  kind: string,
  detail: string
): Promise<void> {
  try {
    const sessao = await prisma.botSession.findUnique({
      where: { id: sessionId },
      select: { organizationId: true },
    });
    if (!sessao) return;

    await prisma.botEvent.create({
      data: {
        sessionId,
        organizationId: sessao.organizationId,
        nodeId,
        kind,
        detail: detail.slice(0, 2000),
      },
    });
  } catch (error) {
    console.error('[bot] falha ao gravar evento:', error);
  }
}
