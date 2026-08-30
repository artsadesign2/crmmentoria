import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth/jwt';
import { assertRole } from '@/lib/auth/session';
import { BotError, type BotEdge, type BotGraph, type BotNode } from './types';

/**
 * Monta um menu de triagem a partir dos setores da organização.
 *
 * É a promessa que a F3 deixou por escrito — "menu de setor: F6" — e o que
 * torna esta fase utilizável antes de existir qualquer canvas. Quem não quiser
 * desenhar nada clica um botão e tem um bot que atende.
 *
 * O grafo gerado é comum: sai daqui e vira rascunho editável como outro
 * qualquer. Não é um caso especial no motor.
 */

/** Teto de opções num menu. Além disso, ninguém lê. */
const MAXIMO_OPCOES = 8;

export async function criarFluxoTriagem(
  session: SessionPayload,
  nome = 'Menu de triagem'
): Promise<{ flowId: string; version: number }> {
  assertRole(session, 'Administrador');

  const setores = await prisma.department.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { name: 'asc' },
    take: MAXIMO_OPCOES,
    select: { id: true, name: true },
  });

  if (setores.length === 0) {
    throw new BotError('Cadastre ao menos um setor antes de criar o menu de triagem.');
  }

  const grafo = montarGrafo(setores);

  const fluxo = await prisma.botFlow.create({
    data: {
      organizationId: session.organizationId,
      createdByUserId: session.userId,
      name: nome,
      graph: grafo as unknown as object,
      status: 'DRAFT',
      isTrigger: false,
      publishedVersion: null,
    },
    select: { id: true },
  });

  return { flowId: fluxo.id, version: 0 };
}

/**
 * O desenho: saudação, menu, e um nó de transferência por setor.
 *
 * As posições são calculadas em coluna para o canvas da Tarefa 7 abrir com o
 * fluxo legível, e não com todos os nós empilhados na origem.
 */
export function montarGrafo(setores: Array<{ id: string; name: string }>): BotGraph {
  const nodes: BotNode[] = [
    {
      id: 'start',
      type: 'START',
      position: { x: 0, y: 0 },
      data: { label: 'Início' },
    },
    {
      id: 'saudacao',
      type: 'MESSAGE',
      position: { x: 0, y: 120 },
      data: {
        label: 'Saudação',
        text: 'Olá, {{nome}}! Você chegou ao atendimento da nossa equipe.',
      },
    },
    {
      id: 'menu',
      type: 'QUESTION',
      position: { x: 0, y: 240 },
      data: {
        label: 'Menu de setores',
        text: 'Para agilizar, com quem você prefere falar? Responda com o número.',
        options: setores.map((setor, i) => ({ key: String(i + 1), label: setor.name })),
      },
    },
  ];

  const edges: BotEdge[] = [
    { id: 'e-start', source: 'start', target: 'saudacao', sourceHandle: null },
    { id: 'e-saudacao', source: 'saudacao', target: 'menu', sourceHandle: null },
  ];

  setores.forEach((setor, i) => {
    const id = `transferir-${setor.id}`;
    const chave = String(i + 1);

    nodes.push({
      id,
      type: 'TRANSFER',
      position: { x: i * 260 - ((setores.length - 1) * 260) / 2, y: 400 },
      data: { label: setor.name, departmentId: setor.id },
    });

    edges.push({ id: `e-menu-${chave}`, source: 'menu', target: id, sourceHandle: chave });
  });

  return { nodes, edges };
}
