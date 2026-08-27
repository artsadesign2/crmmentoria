import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth/jwt';
import { formatPhoneBr, normalizePhone } from '@/lib/crm/phone';
import {
  CampaignError,
  STATUS_FINAIS,
  type CampaignDTO,
  type CampaignDetailDTO,
  type CampaignStatus,
  type TargetDTO,
  type TargetStatus,
} from './types';

/**
 * Campanhas de disparo.
 *
 * A campanha guarda a mensagem e os contadores; quem recebe o quê vive em
 * `dispatch_targets`, um registro por pessoa, com estado próprio. É o que
 * permite retomar de onde parou — o laço no navegador que isto substitui
 * perdia o resto da lista a cada falha, e não deixava rastro de quem já tinha
 * recebido.
 */

const LIMITE_DESTINATARIOS = 5000;

type CampanhaRow = {
  id: string;
  name: string;
  messageTemplate: string;
  status: string;
  scheduledAt: Date | null;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  createdBy?: { name: string } | null;
};

function toDTO(row: CampanhaRow): CampaignDTO {
  const decididos = row.sentCount + row.failedCount + row.skippedCount;

  return {
    id: row.id,
    name: row.name,
    messageTemplate: row.messageTemplate,
    status: row.status as CampaignStatus,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    totalCount: row.totalCount,
    sentCount: row.sentCount,
    failedCount: row.failedCount,
    skippedCount: row.skippedCount,
    // Nunca negativo: contador dessincronizado não deve virar "-3 restantes".
    pendingCount: Math.max(0, row.totalCount - decididos),
    startedAt: row.startedAt?.toISOString() ?? null,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    createdByName: row.createdBy?.name ?? null,
  };
}

const comAutor = { createdBy: { select: { name: true } } } as const;

/**
 * Cria a campanha e materializa a lista de destinatários.
 *
 * A lista é resolvida **agora**, não na hora do envio. Um filtro salvo mudaria
 * de resultado entre a criação e o disparo, e a pessoa que aprovou "187
 * contatos" receberia outra coisa.
 *
 * Ninguém é descartado em silêncio: quem não vai receber entra como `SKIPPED`
 * com o motivo escrito. É assim que a tela explica por que 200 contatos
 * viraram 187 — sem isso, a diferença parece perda de mensagem.
 */
export async function createCampaign(
  session: SessionPayload,
  input: {
    name: string;
    message: string;
    contactIds?: string[];
    recipients?: CampaignRecipientInput[];
    scheduledAt?: string;
  }
): Promise<CampaignDTO> {
  const nome = input.name.trim();
  if (!nome) throw new CampaignError('Dê um nome à campanha.');

  const mensagem = input.message.trim();
  if (!mensagem) throw new CampaignError('Escreva a mensagem antes de criar a campanha.');

  let agendadaPara: Date | null = null;
  if (input.scheduledAt) {
    const quando = new Date(input.scheduledAt);
    if (Number.isNaN(quando.getTime())) throw new CampaignError('Data de agendamento inválida.');
    agendadaPara = quando;
  }

  const ids = [...new Set(input.contactIds ?? [])];
  const puloDeEntrada: LinhaDestinatario[] = [];

  if (input.recipients?.length) {
    const resolvidos = await resolverDestinatarios(session.organizationId, input.recipients);
    for (const id of resolvidos.contactIds) if (!ids.includes(id)) ids.push(id);
    puloDeEntrada.push(...resolvidos.pulados);
  }

  if (ids.length === 0 && puloDeEntrada.length === 0) {
    throw new CampaignError('Selecione ao menos um contato.');
  }
  if (ids.length + puloDeEntrada.length > LIMITE_DESTINATARIOS) {
    throw new CampaignError(
      `Uma campanha aceita no máximo ${LIMITE_DESTINATARIOS} contatos. Divida a lista.`
    );
  }

  // Escopado pela organização da sessão: id de contato de outra organização
  // simplesmente não aparece, e some da campanha como "não encontrado".
  const contatos = await prisma.contact.findMany({
    where: { id: { in: ids }, organizationId: session.organizationId },
    select: { id: true, name: true, phone: true, company: true, optedOutAt: true },
  });

  const encontrados = new Map(contatos.map((c) => [c.id, c]));
  const telefonesVistos = new Set<string>();

  const dosContatos = ids.map((id): LinhaDestinatario => {
    const contato = encontrados.get(id);

    if (!contato) {
      return linhaPulada(session.organizationId, id, 'Contato não encontrado nesta organização.');
    }

    if (!contato.phone) {
      return linhaPulada(session.organizationId, id, 'Sem telefone cadastrado.', contato.name);
    }

    if (contato.optedOutAt) {
      return linhaPulada(session.organizationId, id, 'Pediu para não receber disparos.', contato.name, contato.phone);
    }

    if (telefonesVistos.has(contato.phone)) {
      // Dois cadastros, um telefone. Enviar duas vezes a mesma mensagem é o
      // comportamento que mais rápido faz o cliente pedir para sair.
      return linhaPulada(
        session.organizationId,
        id,
        'Telefone repetido nesta campanha.',
        contato.name,
        contato.phone
      );
    }

    telefonesVistos.add(contato.phone);

    return {
      contactId: id,
      organizationId: session.organizationId,
      name: contato.name,
      phone: contato.phone,
      status: 'PENDING' as TargetStatus,
      skipReason: null as string | null,
    };
  });

  const destinatarios = [...dosContatos, ...puloDeEntrada];
  const pulados = destinatarios.filter((d) => d.status === 'SKIPPED').length;

  const campanha = await prisma.dispatchCampaign.create({
    data: {
      organizationId: session.organizationId,
      createdByUserId: session.userId,
      name: nome,
      messageTemplate: mensagem,
      status: agendadaPara ? 'SCHEDULED' : 'DRAFT',
      scheduledAt: agendadaPara,
      totalCount: destinatarios.length,
      skippedCount: pulados,
      targets: { create: destinatarios },
    },
    include: comAutor,
  });

  return toDTO(campanha);
}

function linhaPulada(
  organizationId: string,
  contactId: string | null,
  motivo: string,
  nome = 'Contato removido',
  telefone = '—'
): LinhaDestinatario {
  return {
    contactId,
    organizationId,
    name: nome,
    phone: telefone,
    status: 'SKIPPED',
    skipReason: motivo,
  };
}

/**
 * Destinatário que ainda não é contato do CRM.
 *
 * A tela de eventos dispara para mentorados e leads que vivem fora da tabela
 * `contacts`. Em vez de aceitar uma lista solta de telefones, cada um vira um
 * contato de verdade: sem isso, a resposta do cliente chegaria como uma
 * conversa nova, sem nome e sem histórico do que a empresa mandou.
 */
export interface CampaignRecipientInput {
  name: string;
  phone: string;
  company?: string | null;
}

interface LinhaDestinatario {
  contactId: string | null;
  organizationId: string;
  name: string;
  phone: string;
  status: TargetStatus;
  skipReason: string | null;
}

/**
 * Converte destinatários crus em contatos, criando os que faltarem.
 *
 * Em duas consultas, não uma por pessoa: uma lista de 300 mentorados viraria
 * 300 idas ao banco antes mesmo de a campanha existir.
 */
async function resolverDestinatarios(
  organizationId: string,
  recebidos: CampaignRecipientInput[]
): Promise<{ contactIds: string[]; pulados: LinhaDestinatario[] }> {
  const pulados: LinhaDestinatario[] = [];
  const porTelefone = new Map<string, CampaignRecipientInput>();

  for (const bruto of recebidos) {
    const telefone = normalizePhone(bruto.phone ?? '');

    if (!telefone) {
      pulados.push(
        linhaPulada(organizationId, null, 'Telefone ausente ou inválido.', bruto.name || 'Sem nome')
      );
      continue;
    }

    // Primeiro da lista ganha: repetido não vira segunda mensagem.
    if (!porTelefone.has(telefone)) porTelefone.set(telefone, bruto);
  }

  const telefones = [...porTelefone.keys()];
  if (telefones.length === 0) return { contactIds: [], pulados };

  const existentes = await prisma.contact.findMany({
    where: { organizationId, phone: { in: telefones } },
    select: { id: true, phone: true },
  });

  const jaCadastrados = new Set(existentes.map((c) => c.phone));
  const novos = telefones.filter((t) => !jaCadastrados.has(t));

  if (novos.length > 0) {
    await prisma.contact.createMany({
      data: novos.map((telefone) => {
        const bruto = porTelefone.get(telefone)!;
        return {
          organizationId,
          name: bruto.name?.trim() || formatPhoneBr(telefone),
          phone: telefone,
          company: bruto.company?.trim() || null,
          type: 'LEAD',
          source: 'Disparo',
        };
      }),
      skipDuplicates: true,
    });
  }

  const todos = await prisma.contact.findMany({
    where: { organizationId, phone: { in: telefones } },
    select: { id: true },
  });

  return { contactIds: todos.map((c) => c.id), pulados };
}

export async function listCampaigns(session: SessionPayload): Promise<CampaignDTO[]> {
  const linhas = await prisma.dispatchCampaign.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: comAutor,
  });

  return linhas.map(toDTO);
}

/** `null` quando não existe **ou** é de outra organização — 404, nunca 403. */
export async function getCampaign(
  session: SessionPayload,
  id: string
): Promise<CampaignDetailDTO | null> {
  const campanha = await prisma.dispatchCampaign.findFirst({
    where: { id, organizationId: session.organizationId },
    include: {
      ...comAutor,
      targets: { orderBy: { createdAt: 'asc' }, take: LIMITE_DESTINATARIOS },
    },
  });

  if (!campanha) return null;

  const targets: TargetDTO[] = campanha.targets.map((t) => ({
    id: t.id,
    contactId: t.contactId,
    name: t.name,
    phone: t.phone,
    phoneFormatted: t.phone === '—' ? t.phone : formatPhoneBr(t.phone),
    status: t.status as TargetStatus,
    skipReason: t.skipReason,
    error: t.error,
    attempts: t.attempts,
    sentAt: t.sentAt?.toISOString() ?? null,
  }));

  return { ...toDTO(campanha), targets };
}

/**
 * Transições permitidas.
 *
 * Uma tabela em vez de uma cadeia de `if`: o conjunto inteiro fica visível de
 * uma olhada, e é onde se confere que nada sai de `DONE` ou `CANCELED`.
 */
const TRANSICOES: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ['RUNNING', 'SCHEDULED', 'CANCELED'],
  SCHEDULED: ['RUNNING', 'PAUSED', 'CANCELED'],
  RUNNING: ['PAUSED', 'CANCELED', 'DONE'],
  PAUSED: ['RUNNING', 'CANCELED'],
  DONE: [],
  CANCELED: [],
};

/**
 * Muda o estado da campanha.
 *
 * `RUNNING` é o que autoriza o worker a enviar; `PAUSED` o faz parar no
 * próximo lote, sem perder o que já saiu. Cancelar não desfaz envio nenhum —
 * mensagem entregue não volta —, apenas impede os que faltam.
 */
export async function setCampaignStatus(
  session: SessionPayload,
  id: string,
  status: CampaignStatus
): Promise<CampaignDTO | null> {
  const atual = await prisma.dispatchCampaign.findFirst({
    where: { id, organizationId: session.organizationId },
    select: { id: true, status: true, totalCount: true, skippedCount: true },
  });

  if (!atual) return null;

  const de = atual.status as CampaignStatus;
  if (de === status) {
    const inalterada = await prisma.dispatchCampaign.findFirstOrThrow({
      where: { id },
      include: comAutor,
    });
    return toDTO(inalterada);
  }

  if (!TRANSICOES[de].includes(status)) {
    const explicacao = STATUS_FINAIS.includes(de)
      ? `A campanha já está ${rotulo(de)} e não volta atrás.`
      : `Não dá para ir de ${rotulo(de)} para ${rotulo(status)}.`;
    throw new CampaignError(explicacao);
  }

  if (status === 'RUNNING' && atual.totalCount === atual.skippedCount) {
    throw new CampaignError('Nenhum destinatário desta campanha pode receber mensagem.');
  }

  const atualizada = await prisma.dispatchCampaign.update({
    where: { id },
    data: {
      status,
      updatedAt: new Date(),
      ...(status === 'RUNNING' ? { startedAt: atual.status === 'PAUSED' ? undefined : new Date() } : {}),
      ...(status === 'DONE' || status === 'CANCELED' ? { finishedAt: new Date() } : {}),
    },
    include: comAutor,
  });

  return toDTO(atualizada);
}

function rotulo(status: CampaignStatus): string {
  const nomes: Record<CampaignStatus, string> = {
    DRAFT: 'rascunho',
    SCHEDULED: 'agendada',
    RUNNING: 'em andamento',
    PAUSED: 'pausada',
    DONE: 'concluída',
    CANCELED: 'cancelada',
  };
  return nomes[status];
}
