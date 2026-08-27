import type { Lead } from '@/lib/mock-data';
import type { ChannelType, DealCardDTO, PriorityLevel } from './types';

/**
 * Traduz uma oportunidade do CRM para o tipo `Lead` de lib/mock-data.ts.
 *
 * DÍVIDA DELIBERADA, com prazo de validade.
 *
 * `LeadSheet` (o drawer), o modal de WhatsApp rápido e a conversão em mentorado
 * foram escritos contra o formato `Lead`. Reescrever os três junto com o Kanban
 * tornaria a F2 grande demais para revisar de uma vez, então eles continuam
 * recebendo `Lead` e este arquivo faz a tradução.
 *
 * Sai de cena quando a F4 reescrever o drawer com o histórico real da conversa.
 * Até lá, é o único ponto do código que conhece os dois formatos — se precisar
 * mapear um campo novo, é aqui, e em nenhum outro lugar.
 */

const PRIORITY_TO_LEAD: Record<PriorityLevel, Lead['priority']> = {
  LOW: 'baixa',
  MEDIUM: 'media',
  HIGH: 'alta',
  // O `Lead` não tem nível acima de "alta"; urgente colapsa para alta.
  URGENT: 'alta',
};

const CHANNEL_TO_SOURCE: Record<ChannelType, Lead['source']> = {
  WHATSAPP: 'WhatsApp Direct',
  INSTAGRAM: 'Instagram',
  VOIP: 'Outros',
  WEBCHAT: 'Outros',
  WEBHOOK: 'Outros',
};

/**
 * Deduz o `stage` textual do `Lead` a partir do nome da etapa.
 *
 * As etapas agora são linhas no banco, configuráveis pelo usuário, enquanto o
 * `Lead` tem um enum fixo de seis valores. A correspondência é pelo número que
 * abre o nome ("3. Proposta Enviada"), que o seed garante — e cai em `novo`
 * quando o usuário cria uma etapa fora desse padrão, em vez de quebrar.
 */
function stageNameToLeadStage(stageName: string): Lead['stage'] {
  const ordem = Number.parseInt(stageName.trim().charAt(0), 10);

  switch (ordem) {
    case 2:
      return 'qualificacao';
    case 3:
      return 'proposta';
    case 4:
      return 'negociacao';
    case 5:
      return 'ganho';
    case 6:
      return 'perdido';
    default:
      return 'novo';
  }
}

function campo(customFields: Record<string, unknown> | null, chave: string): string | undefined {
  const valor = customFields?.[chave];
  return typeof valor === 'string' && valor ? valor : undefined;
}

export function dealToLead(deal: DealCardDTO, stageName: string): Lead {
  const cf = deal.customFields;

  return {
    id: deal.id,
    name: deal.contact.name,
    company: deal.contact.company ?? '',
    specialty: campo(cf, 'specialty') ?? deal.title,
    email: campo(cf, 'email') ?? '',
    // O drawer exibe o telefone; a forma canônica fica no banco.
    phone: deal.contact.phoneFormatted ?? '',
    source: CHANNEL_TO_SOURCE[deal.channel],
    estimatedValue: deal.dealValue,
    stage: stageNameToLeadStage(stageName),
    priority: PRIORITY_TO_LEAD[deal.priority],
    notes: campo(cf, 'notes') ?? '',
    lastContact: (deal.lastMessageAt ?? deal.updatedAt).slice(0, 10),
    createdAt: deal.createdAt.slice(0, 10),
    assignedTo: deal.assignedUserName ?? undefined,

    // Campos de qualificação, gravados em customFields pela F1 e pelo bot da F6.
    currentRevenue: campo(cf, 'currentRevenue'),
    teamSize: campo(cf, 'teamSize'),
    mainBottleneck: campo(cf, 'mainBottleneck'),
    targetGoal: campo(cf, 'targetGoal'),
    hasPartners: campo(cf, 'hasPartners'),
    urgencyLevel: campo(cf, 'urgencyLevel') as Lead['urgencyLevel'],
    cityState: campo(cf, 'cityState'),
    role: campo(cf, 'role'),
    lossReason: deal.lostReason ?? undefined,
    timelineLogs: [],
  };
}

/** Campos do `Lead` editados no drawer, de volta ao formato do CRM. */
export function leadToDealPatch(lead: Lead): Record<string, unknown> {
  const priority = (Object.entries(PRIORITY_TO_LEAD).find(
    ([, valor]) => valor === lead.priority
  )?.[0] ?? 'MEDIUM') as PriorityLevel;

  return {
    title: lead.specialty || lead.name,
    dealValue: lead.estimatedValue,
    priority,
    lostReason: lead.lossReason ?? null,
    customFields: {
      specialty: lead.specialty,
      email: lead.email,
      notes: lead.notes,
      currentRevenue: lead.currentRevenue,
      teamSize: lead.teamSize,
      mainBottleneck: lead.mainBottleneck,
      targetGoal: lead.targetGoal,
      hasPartners: lead.hasPartners,
      urgencyLevel: lead.urgencyLevel,
      cityState: lead.cityState,
      role: lead.role,
    },
  };
}
