import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth/jwt';
import { assertRole } from '@/lib/auth/session';
import { asGraph, BotError, type BotGraph, type FlowStatus } from './types';
import { validateGraph, type ProblemaGrafo } from './validate';
import type { PapelDoFluxo } from './sessions';

/**
 * Os fluxos: listar, salvar rascunho, publicar, escolher qual está no ar.
 *
 * A regra que organiza este arquivo inteiro é a separação entre **rascunho** e
 * **versão publicada**. `bot_flows.graph` é o que o canvas edita e o que
 * ninguém executa; `bot_flow_versions.graph` é o que roda, e é imutável.
 *
 * Sem essa separação, editar um fluxo às 14h faria quem está no meio de um
 * atendimento pular para um nó que deixou de existir entre uma mensagem e a
 * seguinte. Com ela, uma conversa termina na versão em que começou.
 */

export interface FlowDTO {
  id: string;
  name: string;
  status: FlowStatus;
  /** Fluxo que atende conversa nova. No máximo um por organização. */
  isTrigger: boolean;
  /** Fluxo que retoma lead abandonado ou fora do expediente. */
  isReengage: boolean;
  publishedVersion: number | null;
  updatedAt: string;
  createdByName: string | null;
}

export interface FlowDetailDTO extends FlowDTO {
  /** O rascunho, que é o que o canvas edita. */
  graph: BotGraph;
  /** Problemas da validação corrente, para a tela avisar antes de publicar. */
  problemas: ProblemaGrafo[];
}

export type ResultadoPublicacao =
  | { ok: true; version: number }
  | { ok: false; problemas: ProblemaGrafo[] };

const SELECAO = {
  id: true,
  name: true,
  status: true,
  isTrigger: true,
  isReengage: true,
  publishedVersion: true,
  updatedAt: true,
  createdBy: { select: { name: true } },
} as const;

type LinhaFluxo = Prisma.BotFlowGetPayload<{ select: typeof SELECAO }>;

function paraDTO(linha: LinhaFluxo): FlowDTO {
  return {
    id: linha.id,
    name: linha.name,
    status: linha.status as FlowStatus,
    isTrigger: linha.isTrigger,
    isReengage: linha.isReengage,
    publishedVersion: linha.publishedVersion,
    updatedAt: linha.updatedAt.toISOString(),
    createdByName: linha.createdBy?.name ?? null,
  };
}

export async function listFlows(session: SessionPayload): Promise<FlowDTO[]> {
  const linhas = await prisma.botFlow.findMany({
    where: { organizationId: session.organizationId },
    orderBy: [{ isTrigger: 'desc' }, { isReengage: 'desc' }, { updatedAt: 'desc' }],
    select: SELECAO,
  });

  return linhas.map(paraDTO);
}

/**
 * Um fluxo, com o rascunho e a validação já feita.
 *
 * `null` quando não existe **ou** é de outra organização — a tela responde 404
 * nos dois casos. Distinguir "não existe" de "não é seu" conta a quem procura
 * que o id acertou em alguma coisa.
 */
export async function getFlow(session: SessionPayload, id: string): Promise<FlowDetailDTO | null> {
  const linha = await prisma.botFlow.findFirst({
    where: { id, organizationId: session.organizationId },
    select: { ...SELECAO, graph: true },
  });

  if (!linha) return null;

  const graph = asGraph(linha.graph);

  return { ...paraDTO(linha), graph, problemas: validateGraph(graph) };
}

export interface EntradaFluxo {
  /** Ausente cria; presente atualiza. */
  id?: string;
  name: string;
  graph: BotGraph;
}

/**
 * Salva o rascunho. Administrador para cima.
 *
 * Salvar **nunca** mexe na versão publicada, mesmo que o fluxo esteja no ar.
 * É o que permite ao operador mexer no fluxo com clientes conversando por ele:
 * o que mudou só entra em vigor quando alguém apertar publicar.
 */
export async function saveFlow(session: SessionPayload, entrada: EntradaFluxo): Promise<FlowDTO> {
  assertRole(session, 'Administrador');

  const name = entrada.name.trim();
  if (!name) throw new BotError('Dê um nome ao fluxo.');
  if (name.length > 200) throw new BotError('O nome do fluxo é longo demais.');

  const graph = entrada.graph as unknown as Prisma.InputJsonValue;

  if (!entrada.id) {
    const criado = await prisma.botFlow.create({
      data: {
        organizationId: session.organizationId,
        createdByUserId: session.userId,
        name,
        graph,
        status: 'DRAFT',
      },
      select: SELECAO,
    });

    return paraDTO(criado);
  }

  // `updateMany` com o filtro da organização junto: um `update` por id sozinho
  // aceitaria o id de outra empresa.
  const alterados = await prisma.botFlow.updateMany({
    where: { id: entrada.id, organizationId: session.organizationId },
    data: { name, graph, updatedAt: new Date() },
  });

  if (alterados.count === 0) throw new BotError('Fluxo não encontrado.');

  const atualizado = await prisma.botFlow.findFirstOrThrow({
    where: { id: entrada.id, organizationId: session.organizationId },
    select: SELECAO,
  });

  return paraDTO(atualizado);
}

/**
 * Publica: copia o rascunho para uma versão nova e imutável.
 *
 * Este é o único ponto em que um fluxo quebrado é barrado. Rascunho pela metade
 * é normal e não incomoda ninguém; publicado pela metade fala com um cliente.
 */
export async function publishFlow(
  session: SessionPayload,
  id: string
): Promise<ResultadoPublicacao> {
  assertRole(session, 'Administrador');

  const fluxo = await prisma.botFlow.findFirst({
    where: { id, organizationId: session.organizationId },
    select: { id: true, graph: true },
  });

  if (!fluxo) throw new BotError('Fluxo não encontrado.');

  const graph = asGraph(fluxo.graph);
  const problemas = validateGraph(graph);

  if (problemas.length > 0) return { ok: false, problemas };

  const ultima = await prisma.botFlowVersion.findFirst({
    where: { flowId: id },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  const version = (ultima?.version ?? 0) + 1;

  // Insere a versão e aponta o fluxo para ela na mesma transação. Separadas,
  // uma falha entre as duas deixaria `published_version` apontando para uma
  // versão que não existe — e `sessaoAtiva` encerraria toda conversa nova.
  await prisma.$transaction([
    prisma.botFlowVersion.create({
      data: {
        flowId: id,
        organizationId: session.organizationId,
        version,
        graph: graph as unknown as Prisma.InputJsonValue,
        publishedByUserId: session.userId,
      },
    }),
    prisma.botFlow.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedVersion: version, updatedAt: new Date() },
    }),
  ]);

  return { ok: true, version };
}

/**
 * Escolhe qual fluxo ocupa um papel — ou tira o papel de todos.
 *
 * O índice único parcial (`bot_flows_trigger_key`, `bot_flows_reengage_key`)
 * recusa dois candidatos, então desmarcar o anterior tem de acontecer na mesma
 * transação. Se a marcação falhar, a organização não pode ficar sem fluxo
 * nenhum no ar por causa de um erro no meio do caminho.
 */
export async function setFlowRole(
  session: SessionPayload,
  papel: PapelDoFluxo,
  flowId: string | null
): Promise<void> {
  assertRole(session, 'Administrador');

  const { organizationId } = session;

  await prisma.$transaction(async (tx) => {
    if (papel === 'TRIGGER') {
      await tx.botFlow.updateMany({
        where: { organizationId, isTrigger: true },
        data: { isTrigger: false },
      });
    } else {
      await tx.botFlow.updateMany({
        where: { organizationId, isReengage: true },
        data: { isReengage: false },
      });
    }

    if (!flowId) return;

    const alvo = await tx.botFlow.findFirst({
      where: { id: flowId, organizationId },
      select: { id: true, status: true, publishedVersion: true },
    });

    if (!alvo) throw new BotError('Fluxo não encontrado.');

    // Pôr um rascunho no ar não daria erro nenhum: `abrirSessao` filtra por
    // PUBLISHED, então o robô simplesmente nunca atenderia, e a tela mostraria
    // um fluxo "no ar" que não atende. Silêncio com aparência de sucesso.
    if (alvo.status !== 'PUBLISHED' || alvo.publishedVersion === null) {
      throw new BotError('Publique o fluxo antes de colocá-lo no ar.');
    }

    await tx.botFlow.update({
      where: { id: flowId },
      data:
        papel === 'TRIGGER'
          ? { isTrigger: true, updatedAt: new Date() }
          : { isReengage: true, updatedAt: new Date() },
    });
  });
}

/**
 * Apaga um fluxo, quando isso não custa histórico.
 *
 * As chaves estrangeiras são `ON DELETE CASCADE`: apagar um fluxo levaria junto
 * as versões, as sessões e os eventos de toda conversa que passou por ele. Um
 * fluxo que nunca rodou não tem nada disso e pode sumir; um que atendeu alguém
 * se aposenta sendo tirado do ar, não apagado.
 *
 * `false` quando não existe nesta organização — a rota responde 404.
 */
export async function deleteFlow(session: SessionPayload, id: string): Promise<boolean> {
  assertRole(session, 'Administrador');

  const fluxo = await prisma.botFlow.findFirst({
    where: { id, organizationId: session.organizationId },
    select: { id: true, isTrigger: true, isReengage: true },
  });

  if (!fluxo) return false;

  if (fluxo.isTrigger || fluxo.isReengage) {
    throw new BotError('Este fluxo está no ar. Tire-o do ar antes de apagar.');
  }

  const sessoes = await prisma.botSession.count({ where: { flowId: id } });

  if (sessoes > 0) {
    throw new BotError(
      `Este fluxo já atendeu ${sessoes} conversa(s). Apagá-lo apagaria esse histórico — ` +
        'tire-o do ar em vez de apagar.'
    );
  }

  await prisma.botFlow.delete({ where: { id } });

  return true;
}
