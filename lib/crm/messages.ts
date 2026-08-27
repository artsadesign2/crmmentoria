import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendText } from '@/lib/evolution/server';
import type { SessionPayload } from '@/lib/auth/jwt';
import { formatPhoneBr } from './phone';
import { applySignature, signatureEnabled } from './signature';
import { conversationVisibilityFilter, sessionDepartmentId, messageToDTO } from './conversations';
import type { InboundMessage } from './inbound';
import type { MessageDTO } from './inbox-types';

/**
 * Gravação e envio de mensagens.
 *
 * Responder ao cliente e anotar para a equipe são funções distintas, e a de
 * anotar não importa `sendText`. Isso não é organização de arquivo: é a
 * garantia de que não existe caminho de código em que um `if` errado publica
 * uma nota interna para o cliente.
 */

export class MessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MessageError';
  }
}

const comAutor = { user: { select: { name: true } } } as const;

/**
 * Grava a mensagem que chegou pelo webhook.
 *
 * Reenvio do mesmo `key.id` é o caso normal, não excepcional: a Evolution
 * reenvia quando não recebe 2xx a tempo. O índice único
 * `messages_org_external_key` barra a duplicata, e o P2002 vira
 * `{ duplicated: true }` em vez de erro — o webhook precisa responder 200 para
 * a retentativa parar.
 */
export async function recordInboundMessage(
  organizationId: string,
  conversationId: string,
  parsed: InboundMessage
): Promise<{ duplicated: boolean }> {
  // Mensagem enviada pelo aparelho entra como saída sem autor: foi alguém pelo
  // celular, não pelo sistema, e atribuí-la a um usuário seria inventar.
  const direction = parsed.fromMe ? 'OUTBOUND' : 'INBOUND';

  try {
    await prisma.message.create({
      data: {
        organizationId,
        conversationId,
        direction,
        contentType: parsed.contentType,
        content: parsed.content,
        mediaUrl: parsed.mediaUrl,
        status: 'DELIVERED',
        externalId: parsed.externalId,
        createdAt: parsed.timestamp,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { duplicated: true };
    }
    throw error;
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: parsed.timestamp,
      // Só o que o cliente manda conta como não lido.
      ...(direction === 'INBOUND' ? { unreadCount: { increment: 1 } } : {}),
      updatedAt: new Date(),
    },
  });

  await espelharNoCard(conversationId, parsed.content, parsed.timestamp);

  return { duplicated: false };
}

/** Mantém a prévia do card do Kanban em dia, quando existe card vinculado. */
async function espelharNoCard(
  conversationId: string,
  texto: string,
  quando: Date
): Promise<void> {
  const conversa = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { dealCardId: true },
  });

  if (!conversa?.dealCardId) return;

  await prisma.dealCard.update({
    where: { id: conversa.dealCardId },
    data: { lastMessageText: texto, lastMessageAt: quando },
  });
}

/** Conversa visível à sessão, com o que o envio precisa saber. */
async function carregarParaEscrita(session: SessionPayload, conversationId: string) {
  const setor = await sessionDepartmentId(session);
  const visivel = conversationVisibilityFilter(session, setor);

  return prisma.conversation.findFirst({
    where: { AND: [{ id: conversationId }, visivel] },
    select: {
      id: true,
      status: true,
      contact: { select: { phone: true, name: true } },
      organization: { select: { features: true } },
    },
  });
}

/**
 * Responde ao cliente pelo número central e grava o que foi enviado.
 *
 * A mensagem é gravada antes do envio, como `PENDING`. Enviar primeiro e gravar
 * depois perde a mensagem se a gravação falhar — e o cliente já teria recebido.
 * Aqui o pior caso é uma linha `FAILED` na tela, que o atendente vê e reenvia.
 */
export async function sendCustomerMessage(
  session: SessionPayload,
  conversationId: string,
  text: string
): Promise<MessageDTO | null> {
  const conteudo = text.trim();
  if (!conteudo) throw new MessageError('Escreva a mensagem antes de enviar.');

  const conversa = await carregarParaEscrita(session, conversationId);
  if (!conversa) return null;

  const telefone = conversa.contact.phone;
  if (!telefone) {
    throw new MessageError(
      `${conversa.contact.name} não tem telefone cadastrado, então não há para onde enviar.`
    );
  }

  const autor = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true },
  });

  // `content` guarda o que o atendente digitou; a assinatura é aplicada no fio.
  // Ver lib/crm/signature.ts.
  const noFio = applySignature(
    conteudo,
    autor?.name ?? null,
    signatureEnabled(conversa.organization.features)
  );

  const gravada = await prisma.message.create({
    data: {
      organizationId: session.organizationId,
      conversationId,
      userId: session.userId,
      direction: 'OUTBOUND',
      contentType: 'TEXT',
      content: conteudo,
      status: 'PENDING',
    },
    include: comAutor,
  });

  const envio = await sendText(telefone, noFio);

  const finalizada = await prisma.message.update({
    where: { id: gravada.id },
    data: envio.ok
      ? { status: 'SENT', externalId: envio.externalId }
      : { status: 'FAILED' },
    include: comAutor,
  });

  if (envio.ok) {
    const agora = new Date();
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: agora,
        // Responder encerra a espera: a conversa volta a ser atendimento ativo.
        ...(conversa.status === 'PENDING' ? { status: 'OPEN' } : {}),
        updatedAt: agora,
      },
    });
    await espelharNoCard(conversationId, conteudo, agora);
  } else {
    // A conversa ainda mudou: o atendente precisa ver a falha na lista.
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }

  return messageToDTO(finalizada);
}

/**
 * Anota para a equipe. Não envia nada, e não tem como enviar: este módulo é o
 * único que importa `sendText`, e esta função não o chama.
 */
export async function addInternalNote(
  session: SessionPayload,
  conversationId: string,
  text: string
): Promise<MessageDTO | null> {
  const conteudo = text.trim();
  if (!conteudo) throw new MessageError('Escreva a nota antes de salvar.');

  const conversa = await carregarParaEscrita(session, conversationId);
  if (!conversa) return null;

  const nota = await prisma.message.create({
    data: {
      organizationId: session.organizationId,
      conversationId,
      userId: session.userId,
      direction: 'INTERNAL',
      contentType: 'TEXT',
      content: conteudo,
      status: 'SENT',
    },
    include: comAutor,
  });

  // `updatedAt` avança para o polling levar a nota aos colegas, mas
  // `lastMessageAt` e `unreadCount` não: nota interna não é conversa com o
  // cliente e não deve reordenar a lista como se fosse.
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return messageToDTO(nota);
}

/**
 * Promove a conversa a oportunidade no funil.
 *
 * Deliberadamente manual: se todo número desconhecido virasse card, o quadro
 * receberia engano de número e disparo de lista, e um quadro que precisa de
 * faxina diária para de ser lido.
 */
export async function promoteToDeal(
  session: SessionPayload,
  conversationId: string
): Promise<{ dealCardId: string } | null> {
  const conversa = await carregarParaEscrita(session, conversationId);
  if (!conversa) return null;

  const existente = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { dealCardId: true, contactId: true, channel: true, departmentId: true },
  });
  if (!existente) return null;
  if (existente.dealCardId) return { dealCardId: existente.dealCardId };

  const primeiraEtapa = await prisma.stage.findFirst({
    where: { pipeline: { organizationId: session.organizationId } },
    orderBy: { position: 'asc' },
    select: { id: true },
  });
  if (!primeiraEtapa) {
    throw new MessageError('Nenhum funil configurado. Rode: npm run db:seed:crm');
  }

  const ultima = await prisma.message.findFirst({
    where: { conversationId, direction: { in: ['INBOUND', 'OUTBOUND'] } },
    orderBy: { createdAt: 'desc' },
    select: { content: true, createdAt: true },
  });

  const card = await prisma.dealCard.create({
    data: {
      organizationId: session.organizationId,
      contactId: existente.contactId,
      stageId: primeiraEtapa.id,
      assignedUserId: session.userId,
      departmentId: existente.departmentId,
      channel: existente.channel,
      title: `Atendimento — ${conversa.contact.name}`,
      priority: 'MEDIUM',
      lastMessageText: ultima?.content ?? null,
      lastMessageAt: ultima?.createdAt ?? null,
      customFields: {
        origem: 'Inbox',
        telefone: conversa.contact.phone ? formatPhoneBr(conversa.contact.phone) : null,
      },
    },
    select: { id: true },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { dealCardId: card.id, updatedAt: new Date() },
  });

  return { dealCardId: card.id };
}
