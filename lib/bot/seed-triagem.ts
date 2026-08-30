import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth/jwt';
import { assertRole } from '@/lib/auth/session';
import { getVozConfig } from './settings';
import { BotError, type BotEdge, type BotGraph, type BotNode } from './types';

/**
 * Monta um fluxo pronto a partir dos setores da organização.
 *
 * É a promessa que a F3 deixou por escrito — "menu de setor: F6" — e o que
 * torna esta fase utilizável antes de existir qualquer canvas. Quem não quiser
 * desenhar nada clica um botão e tem um bot que atende.
 *
 * O grafo gerado é comum: sai daqui e vira rascunho editável como outro
 * qualquer. Não é um caso especial no motor.
 *
 * **O texto foi escrito para não parecer texto de robô.** "Você chegou ao
 * atendimento da nossa equipe" é linguagem de URA: correta, impessoal e
 * inconfundível. O que uma pessoa escreve no WhatsApp da empresa é "oi, tudo
 * bem?" — e é isso que sai daqui.
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

  const voz = await getVozConfig(session.organizationId);
  const grafo = montarGrafo(setores, voz.personaName);

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
 * O desenho: saudação, apresentação opcional, pergunta e uma entrega por setor.
 *
 * A apresentação é um nó separado, criado só quando há nome configurado. É a
 * alternativa a espalhar `{{atendente}}` pelo texto: sem nome, a frase não
 * existe no fluxo, em vez de existir e renderizar vazia — que é como se produz
 * "Aqui é a , tudo bem?" no aparelho de um cliente.
 *
 * As posições são calculadas em coluna para o canvas abrir com o fluxo legível,
 * e não com todos os nós empilhados na origem.
 */
export function montarGrafo(
  setores: Array<{ id: string; name: string }>,
  persona = ''
): BotGraph {
  const nome = persona.trim();
  const y = (linha: number) => linha * 120;

  const nodes: BotNode[] = [
    { id: 'start', type: 'START', position: { x: 0, y: y(0) }, data: { label: 'Início' } },
    {
      id: 'saudacao',
      type: 'MESSAGE',
      position: { x: 0, y: y(1) },
      data: {
        label: 'Saudação',
        // Sem "prezado", sem "nossa equipe", sem ponto de exclamação duplo.
        // Só o que uma pessoa digitaria ao ver uma mensagem nova.
        text: 'Oi, {{nome}}! Tudo bem?',
      },
    },
  ];

  const edges: BotEdge[] = [{ id: 'e-start', source: 'start', target: 'saudacao', sourceHandle: null }];

  let anterior = 'saudacao';
  let linha = 2;

  if (nome) {
    nodes.push({
      id: 'apresentacao',
      type: 'MESSAGE',
      position: { x: 0, y: y(linha) },
      data: {
        label: 'Apresentação',
        text: `Aqui é ${nome} 🙂`,
      },
    });

    edges.push({ id: 'e-apresentacao', source: anterior, target: 'apresentacao', sourceHandle: null });
    anterior = 'apresentacao';
    linha += 1;
  }

  nodes.push({
    id: 'menu',
    type: 'QUESTION',
    position: { x: 0, y: y(linha) },
    data: {
      label: 'Do que se trata',
      // A pergunta não cita os setores: o motor escreve a enumeração sozinho,
      // no formato configurado. Escrevê-los aqui congelaria a lista, e ela
      // muda toda vez que alguém cria um setor.
      text: 'Me conta rapidinho, do que você precisa?',
      reperguntaTexto: 'Foi mal, não peguei.',
      options: setores.map((setor, i) => ({ key: String(i + 1), label: setor.name })),
    },
  });

  edges.push({ id: 'e-menu', source: anterior, target: 'menu', sourceHandle: null });

  setores.forEach((setor, i) => {
    const id = `transferir-${setor.id}`;
    const chave = String(i + 1);

    nodes.push({
      id,
      type: 'TRANSFER',
      position: {
        x: i * 260 - ((setores.length - 1) * 260) / 2,
        y: y(linha + 1) + 40,
      },
      data: {
        label: setor.name,
        departmentId: setor.id,
        // Vazio usaria a frase padrão do motor. Esta é melhor porque reconhece
        // o que a pessoa acabou de dizer — e porque mantém a primeira pessoa,
        // então quem assumir a conversa continua dali sem se reapresentar.
        text: 'Perfeito, já vou olhar isso pra você.',
      },
    });

    edges.push({ id: `e-menu-${chave}`, source: 'menu', target: id, sourceHandle: chave });
  });

  return { nodes, edges };
}

/**
 * O fluxo que fala com quem foi esquecido.
 *
 * Existe separado porque o de triagem, usado aqui, cumprimentaria com "oi, tudo
 * bem?" alguém que espera resposta há dois dias — e essa é exatamente a
 * mensagem que faz um cliente irritado virar um cliente perdido.
 *
 * A regra do texto: reconhecer a demora sem explicá-la, e sem nomear a causa.
 * "Nosso sistema identificou que você está sem resposta" entrega o robô e
 * transforma um pedido de desculpas em relatório de falha.
 */
export function montarGrafoRetomada(persona = ''): BotGraph {
  const nome = persona.trim();

  // Duas frases, não uma com o nome encaixado no meio: "Oi, Marcos! Marina,
  // desculpa a demora" é português quebrado, e nada denuncia mais uma máquina
  // do que uma frase montada por concatenação.
  const abertura = nome
    ? `Oi, {{nome}}! Aqui é ${nome}. Desculpa a demora pra te responder.`
    : 'Oi, {{nome}}! Desculpa a demora pra te responder.';

  return {
    nodes: [
      { id: 'start', type: 'START', position: { x: 0, y: 0 }, data: { label: 'Início' } },
      {
        id: 'desculpa',
        type: 'MESSAGE',
        position: { x: 0, y: 120 },
        data: {
          label: 'Reconhece a demora',
          text: abertura,
        },
      },
      {
        id: 'retoma',
        type: 'QUESTION',
        position: { x: 0, y: 240 },
        data: {
          label: 'Ainda precisa?',
          text: 'Você ainda precisa de ajuda com aquilo, ou já conseguiu resolver?',
          // A pergunta já contém as duas respostas. Enumerar produziria
          // "…ou já conseguiu resolver? Ainda preciso ou Já resolvi?".
          estilo: 'LIVRE',
          options: [
            { key: '1', label: 'Ainda preciso' },
            { key: '2', label: 'Já resolvi' },
          ],
          reperguntaTexto: 'Desculpa, não peguei.',
        },
      },
      {
        id: 'assume',
        type: 'TRANSFER',
        position: { x: -150, y: 400 },
        data: {
          label: 'Retoma o atendimento',
          departmentId: null,
          text: 'Certo, já estou vendo isso aqui.',
        },
      },
      {
        id: 'encerra',
        type: 'END',
        position: { x: 150, y: 400 },
        data: {
          label: 'Cliente já resolveu',
          text: 'Que bom! Qualquer coisa é só chamar por aqui.',
        },
      },
    ],
    edges: [
      { id: 'r-start', source: 'start', target: 'desculpa', sourceHandle: null },
      { id: 'r-desculpa', source: 'desculpa', target: 'retoma', sourceHandle: null },
      { id: 'r-sim', source: 'retoma', target: 'assume', sourceHandle: '1' },
      { id: 'r-nao', source: 'retoma', target: 'encerra', sourceHandle: '2' },
    ],
  };
}

/** Cria o fluxo de retomada como rascunho editável, igual ao de triagem. */
export async function criarFluxoRetomada(
  session: SessionPayload,
  nome = 'Retomada de lead parado'
): Promise<{ flowId: string; version: number }> {
  assertRole(session, 'Administrador');

  const voz = await getVozConfig(session.organizationId);

  const fluxo = await prisma.botFlow.create({
    data: {
      organizationId: session.organizationId,
      createdByUserId: session.userId,
      name: nome,
      graph: montarGrafoRetomada(voz.personaName) as unknown as object,
      status: 'DRAFT',
      isTrigger: false,
      isReengage: false,
      publishedVersion: null,
    },
    select: { id: true },
  });

  return { flowId: fluxo.id, version: 0 };
}
