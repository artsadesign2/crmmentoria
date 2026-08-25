import { sendEvolutionWhatsAppMessage, formatWhatsAppNumber, getEvolutionConfig, EvolutionApiConfig } from './evolution-api';

export interface WhatsAppTemplateVariables {
  nome?: string;
  empresa?: string;
  especialidade?: string;
  data?: string;
  horario?: string;
  link?: string;
  dataRenovacao?: string;
  diasRestantes?: string | number;
  tarefa?: string;
  status?: string;
  valor?: string;
  linkPagamento?: string;
  eventoTitulo?: string;
  eventoData?: string;
  eventoLocal?: string;
  [key: string]: any;
}

export interface WhatsAppCustomTemplate {
  id: string;
  title: string;
  description?: string;
  icon: string;
  category: 'onboarding' | 'session' | 'renewal' | 'task' | 'finance' | 'event' | 'custom';
  content: string;
  isDefault?: boolean;
  createdAt?: string;
}

export const INITIAL_DEFAULT_TEMPLATES: WhatsAppCustomTemplate[] = [
  {
    id: 'welcome',
    title: 'Boas-Vindas Oficial',
    description: 'Enviado ao cadastrar ou iniciar o mentorado',
    icon: '🚀',
    category: 'onboarding',
    isDefault: true,
    content: `Fala, {nome}! 🚀 Seja muito bem-vindo ao *Rocket Club*!

É uma honra ter você e a *{empresa}* a bordo da nossa mentoria de aceleração e escala. Seu acesso ao portal exclusivo já está liberado.

O próximo passo é o nosso alinhamento de diagnóstico inicial. Vamos pra cima! 🛸`,
  },
  {
    id: 'sessionReminder',
    title: 'Lembrete de Sessão',
    description: 'Disparado 24h ou 1h antes da call',
    icon: '⏰',
    category: 'session',
    isDefault: true,
    content: `Olá, {nome}! ⏰

Passando para lembrar que nossa *Sessão Estratégica de Mentoria* acontece em *{data}* às *{horario}*.

📍 *Link da sala ao vivo:* {link}

Prepare seus principais indicadores, métricas e gargalos da semana para acelerarmos ao máximo! 🚀`,
  },
  {
    id: 'renewalAlert',
    title: 'Alerta de Renovação',
    description: 'Aviso de término de ciclo de mentoria',
    icon: '🎯',
    category: 'renewal',
    isDefault: true,
    content: `Olá, {nome}! 🎯

Passando para avisar que o ciclo atual da sua mentoria no *Rocket Club* encerra em *{dataRenovacao}* ({diasRestantes} dias restantes).

Vamos agendar nossa sessão de consolidação de resultados e estruturar o plano de escala para o próximo ciclo? 🚀`,
  },
  {
    id: 'taskStatus',
    title: 'Status de Tarefa / Meta',
    description: 'Atualização sobre plano de ação e entregas',
    icon: '📋',
    category: 'task',
    isDefault: true,
    content: `Olá, {nome}! 📋

Atualização no seu plano de ação do *Rocket Club*:
A meta/tarefa *"{tarefa}"* foi atualizada para o status: *{status}*.

Acesse seu painel para conferir o progresso e os próximos entregáveis! 🛸`,
  },
  {
    id: 'event_announcement',
    title: 'Divulgação de Novo Evento / Mastermind',
    description: 'Disparo em massa de novos eventos para todos os mentorados',
    icon: '🎟️',
    category: 'event',
    isDefault: true,
    content: `Fala {nome}! 🎟️🚀

Temos um novo evento confirmado na agenda oficial do *Rocket Club*!

🏆 *Evento:* {eventoTitulo}
📅 *Data:* {eventoData}
📍 *Local / Transmissão:* {eventoLocal}

Acesse o portal para confirmar sua presença e garantir sua vaga. Te vejo lá! 🛸`,
  },
  {
    id: 'nps_feedback',
    title: 'Pesquisa de Satisfação & NPS',
    description: 'Coleta de feedback sobre a mentoria',
    icon: '⭐',
    category: 'custom',
    isDefault: false,
    content: `Olá {nome}! ⭐

Como está sendo sua experiência na mentoria do *Rocket Club* até agora?

Sua evolução é nossa prioridade número um. Em uma escala de 0 a 10, qual nota você daria para o impacto que estamos gerando na *{empresa}*? Conta pra gente! 🚀`,
  },
  {
    id: 'vip_invite',
    title: 'Convite Mastermind / Encontro VIP',
    description: 'Convite para eventos presenciais e online',
    icon: '🏆',
    category: 'custom',
    isDefault: false,
    content: `Fala {nome}! 🎟️

Temos um encontro especial de Mastermind do *Rocket Club* marcado para *{data} às {horario}*.

Tema central: *Estratégias de Alto Crescimento & IA para Escala*.
Confirme sua presença e garanta sua vaga VIP! 🚀`,
  },
];

const CUSTOM_TEMPLATES_STORAGE_KEY = 'rocket_club_custom_whatsapp_templates_v2';

/**
 * Gets all templates (defaults + user created) from localStorage
 */
export function getAllWhatsAppTemplates(): WhatsAppCustomTemplate[] {
  if (typeof window === 'undefined') return INITIAL_DEFAULT_TEMPLATES;
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading custom templates from localStorage', e);
  }
  return INITIAL_DEFAULT_TEMPLATES;
}

/**
 * Saves or updates a template in localStorage
 */
export function saveWhatsAppTemplate(template: WhatsAppCustomTemplate): WhatsAppCustomTemplate[] {
  if (typeof window === 'undefined') return INITIAL_DEFAULT_TEMPLATES;
  try {
    const current = getAllWhatsAppTemplates();
    const existingIndex = current.findIndex((t) => t.id === template.id);
    let updated: WhatsAppCustomTemplate[];

    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = { ...template };
    } else {
      updated = [
        ...current,
        {
          ...template,
          id: template.id || `custom_${Date.now()}`,
          createdAt: new Date().toISOString(),
        },
      ];
    }

    localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error saving custom template to localStorage', e);
    return getAllWhatsAppTemplates();
  }
}

/**
 * Deletes a template by ID
 */
export function deleteWhatsAppTemplate(templateId: string): WhatsAppCustomTemplate[] {
  if (typeof window === 'undefined') return INITIAL_DEFAULT_TEMPLATES;
  try {
    const current = getAllWhatsAppTemplates();
    const updated = current.filter((t) => t.id !== templateId);
    localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error deleting template from localStorage', e);
    return getAllWhatsAppTemplates();
  }
}

/**
 * Resets all templates back to factory default
 */
export function resetWhatsAppTemplatesToDefault(): WhatsAppCustomTemplate[] {
  if (typeof window === 'undefined') return INITIAL_DEFAULT_TEMPLATES;
  try {
    localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(INITIAL_DEFAULT_TEMPLATES));
  } catch (e) {
    console.error('Error resetting templates in localStorage', e);
  }
  return INITIAL_DEFAULT_TEMPLATES;
}

/**
 * Legacy compatibility helper for getStoredWhatsAppTemplates
 */
export function getStoredWhatsAppTemplates(): {
  welcome: string;
  sessionReminder: string;
  renewalAlert: string;
  taskStatus: string;
} {
  const all = getAllWhatsAppTemplates();
  return {
    welcome: all.find((t) => t.id === 'welcome')?.content || INITIAL_DEFAULT_TEMPLATES[0].content,
    sessionReminder: all.find((t) => t.id === 'sessionReminder')?.content || INITIAL_DEFAULT_TEMPLATES[1].content,
    renewalAlert: all.find((t) => t.id === 'renewalAlert')?.content || INITIAL_DEFAULT_TEMPLATES[2].content,
    taskStatus: all.find((t) => t.id === 'taskStatus')?.content || INITIAL_DEFAULT_TEMPLATES[3].content,
  };
}

/**
 * Replaces placeholders like {nome}, {empresa} with real values
 */
export function interpolateWhatsAppTemplate(template: string, vars: WhatsAppTemplateVariables): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{${key}\\}`, 'gi');
    result = result.replace(regex, String(value ?? ''));
  }
  return result.trim();
}

/**
 * Universal Sender using any template
 */
export async function sendWhatsAppWithTemplate(
  phone: string,
  templateContent: string,
  vars: WhatsAppTemplateVariables,
  configOverride?: EvolutionApiConfig
): Promise<{ success: boolean; messageId?: string; error?: string; textSent?: string }> {
  if (!phone) {
    return { success: false, error: 'Número de telefone não informado.' };
  }
  const message = interpolateWhatsAppTemplate(templateContent, vars);
  const res = await sendEvolutionWhatsAppMessage(phone, message, configOverride);
  return { ...res, textSent: message };
}

/**
 * 1. Dispara mensagem de Boas-Vindas para novo mentorado
 */
export async function sendMenteeWelcomeMessage(
  mentee: { name: string; phone?: string; company?: string; specialty?: string },
  customTemplate?: string,
  configOverride?: EvolutionApiConfig
): Promise<{ success: boolean; messageId?: string; error?: string; textSent?: string }> {
  if (!mentee.phone) {
    return { success: false, error: 'Mentorado sem número de telefone cadastrado.' };
  }

  const templates = getAllWhatsAppTemplates();
  const rawTemplate = customTemplate || templates.find((t) => t.id === 'welcome')?.content || INITIAL_DEFAULT_TEMPLATES[0].content;
  return sendWhatsAppWithTemplate(
    mentee.phone,
    rawTemplate,
    {
      nome: mentee.name,
      empresa: mentee.company || 'sua empresa',
      especialidade: mentee.specialty || 'Mentoria',
    },
    configOverride
  );
}

/**
 * 2. Dispara lembrete de Sessão de Mentoria (24h / 1h antes)
 */
export async function sendSessionReminderMessage(
  mentee: { name: string; phone?: string; company?: string },
  sessionData: { date: string; time: string; link?: string },
  customTemplate?: string,
  configOverride?: EvolutionApiConfig
): Promise<{ success: boolean; messageId?: string; error?: string; textSent?: string }> {
  if (!mentee.phone) {
    return { success: false, error: 'Mentorado sem telefone cadastrado.' };
  }

  const templates = getAllWhatsAppTemplates();
  const rawTemplate = customTemplate || templates.find((t) => t.id === 'sessionReminder')?.content || INITIAL_DEFAULT_TEMPLATES[1].content;
  return sendWhatsAppWithTemplate(
    mentee.phone,
    rawTemplate,
    {
      nome: mentee.name,
      empresa: mentee.company || 'sua empresa',
      data: sessionData.date,
      horario: sessionData.time,
      link: sessionData.link || 'https://meet.google.com/rocket-club',
    },
    configOverride
  );
}

/**
 * 3. Dispara alerta de Renovação de Ciclo de Mentoria
 */
export async function sendPlanRenewalAlertMessage(
  mentee: { name: string; phone?: string; company?: string },
  renewalData: { renewalDate: string; daysLeft: number | string },
  customTemplate?: string,
  configOverride?: EvolutionApiConfig
): Promise<{ success: boolean; messageId?: string; error?: string; textSent?: string }> {
  if (!mentee.phone) {
    return { success: false, error: 'Mentorado sem telefone cadastrado.' };
  }

  const templates = getAllWhatsAppTemplates();
  const rawTemplate = customTemplate || templates.find((t) => t.id === 'renewalAlert')?.content || INITIAL_DEFAULT_TEMPLATES[2].content;
  return sendWhatsAppWithTemplate(
    mentee.phone,
    rawTemplate,
    {
      nome: mentee.name,
      empresa: mentee.company || 'sua empresa',
      dataRenovacao: renewalData.renewalDate,
      diasRestantes: renewalData.daysLeft,
    },
    configOverride
  );
}

/**
 * 4. Dispara alerta de Atualização de Status de Tarefa / Meta
 */
export async function sendTaskStatusAlertMessage(
  mentee: { name: string; phone?: string; company?: string },
  taskData: { taskTitle: string; status: string },
  customTemplate?: string,
  configOverride?: EvolutionApiConfig
): Promise<{ success: boolean; messageId?: string; error?: string; textSent?: string }> {
  if (!mentee.phone) {
    return { success: false, error: 'Mentorado sem telefone cadastrado.' };
  }

  const templates = getAllWhatsAppTemplates();
  const rawTemplate = customTemplate || templates.find((t) => t.id === 'taskStatus')?.content || INITIAL_DEFAULT_TEMPLATES[3].content;
  return sendWhatsAppWithTemplate(
    mentee.phone,
    rawTemplate,
    {
      nome: mentee.name,
      empresa: mentee.company || 'sua empresa',
      tarefa: taskData.taskTitle,
      status: taskData.status,
    },
    configOverride
  );
}

/**
 * 5. DISPARO EM MASSA / BROADCAST PARA TODOS OS MENTORADOS
 * Com controle de intervalo anti-ban e callback de progresso em tempo real
 */
export interface BroadcastRecipient {
  name: string;
  phone?: string;
  company?: string;
  specialty?: string;
}

export interface BroadcastProgressCallback {
  (progress: {
    current: number;
    total: number;
    percent: number;
    currentName: string;
    successCount: number;
    failedCount: number;
    isFinished: boolean;
  }): void;
}

export async function sendWhatsAppBroadcastToAll(
  recipients: BroadcastRecipient[],
  templateOrMessage: string,
  options: {
    delayMs?: number;
    extraVars?: WhatsAppTemplateVariables;
    configOverride?: EvolutionApiConfig;
    onProgress?: BroadcastProgressCallback;
  } = {}
): Promise<{
  total: number;
  sent: number;
  failed: number;
  details: Array<{ name: string; phone: string; success: boolean; error?: string }>;
}> {
  const { delayMs = 1500, extraVars = {}, configOverride, onProgress } = options;
  const validRecipients = recipients.filter((r) => r.phone && r.phone.replace(/\D/g, '').length >= 10);

  let sent = 0;
  let failed = 0;
  const details: Array<{ name: string; phone: string; success: boolean; error?: string }> = [];

  for (let i = 0; i < validRecipients.length; i++) {
    const r = validRecipients[i];
    const vars: WhatsAppTemplateVariables = {
      nome: r.name,
      empresa: r.company || 'sua empresa',
      especialidade: r.specialty || 'Mentoria',
      ...extraVars,
    };

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: validRecipients.length,
        percent: Math.round(((i + 1) / validRecipients.length) * 100),
        currentName: r.name,
        successCount: sent,
        failedCount: failed,
        isFinished: false,
      });
    }

    try {
      const res = await sendWhatsAppWithTemplate(r.phone!, templateOrMessage, vars, configOverride);
      if (res.success) {
        sent++;
        details.push({ name: r.name, phone: r.phone!, success: true });
      } else {
        failed++;
        details.push({ name: r.name, phone: r.phone!, success: false, error: res.error });
      }
    } catch (err: any) {
      failed++;
      details.push({ name: r.name, phone: r.phone!, success: false, error: err.message });
    }

    // Intervalo de segurança anti-bloqueio entre mensagens
    if (i < validRecipients.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  if (onProgress) {
    onProgress({
      current: validRecipients.length,
      total: validRecipients.length,
      percent: 100,
      currentName: 'Concluído',
      successCount: sent,
      failedCount: failed,
      isFinished: true,
    });
  }

  return {
    total: validRecipients.length,
    sent,
    failed,
    details,
  };
}
