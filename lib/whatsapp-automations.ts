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
  [key: string]: any;
}

export interface AutomationTemplates {
  welcome: string;
  sessionReminder: string;
  renewalAlert: string;
  taskStatus: string;
}

export const DEFAULT_WHATSAPP_TEMPLATES: AutomationTemplates = {
  welcome: `Fala, {nome}! 🚀 Seja muito bem-vindo ao *Rocket Club*!

É uma honra ter você e a *{empresa}* a bordo da nossa mentoria de aceleração e escala. Seu acesso ao portal exclusivo já está liberado.

O próximo passo é o nosso alinhamento de diagnóstico inicial. Vamos pra cima! 🛸`,

  sessionReminder: `Olá, {nome}! ⏰

Passando para lembrar que nossa *Sessão Estratégica de Mentoria* acontece em *{data}* às *{horario}*.

📍 *Link da sala ao vivo:* {link}

Prepare seus principais indicadores, métricas e gargalos da semana para acelerarmos ao máximo! 🚀`,

  renewalAlert: `Olá, {nome}! 🎯

Passando para avisar que o ciclo atual da sua mentoria no *Rocket Club* encerra em *{dataRenovacao}* ({diasRestantes} dias restantes).

Vamos agendar nossa sessão de consolidação de resultados e estruturar o plano de escala para o próximo ciclo? 🚀`,

  taskStatus: `Olá, {nome}! 📋

Atualização no seu plano de ação do *Rocket Club*:
A meta/tarefa *"{tarefa}"* foi atualizada para o status: *{status}*.

Acesse seu painel para conferir o progresso e os próximos entregáveis! 🛸`,
};

const TEMPLATES_STORAGE_KEY = 'rocket_club_whatsapp_templates';

/**
 * Gets customized templates from localStorage or defaults
 */
export function getStoredWhatsAppTemplates(): AutomationTemplates {
  if (typeof window === 'undefined') return DEFAULT_WHATSAPP_TEMPLATES;
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_WHATSAPP_TEMPLATES, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error reading WhatsApp templates from localStorage', e);
  }
  return DEFAULT_WHATSAPP_TEMPLATES;
}

/**
 * Saves customized templates to localStorage
 */
export function saveStoredWhatsAppTemplates(templates: Partial<AutomationTemplates>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredWhatsAppTemplates();
    const updated = { ...current, ...templates };
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving WhatsApp templates to localStorage', e);
  }
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

  const templates = getStoredWhatsAppTemplates();
  const rawTemplate = customTemplate || templates.welcome;
  const message = interpolateWhatsAppTemplate(rawTemplate, {
    nome: mentee.name,
    empresa: mentee.company || 'sua empresa',
    especialidade: mentee.specialty || 'Mentoria',
  });

  const res = await sendEvolutionWhatsAppMessage(mentee.phone, message, configOverride);
  return { ...res, textSent: message };
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

  const templates = getStoredWhatsAppTemplates();
  const rawTemplate = customTemplate || templates.sessionReminder;
  const message = interpolateWhatsAppTemplate(rawTemplate, {
    nome: mentee.name,
    empresa: mentee.company || 'sua empresa',
    data: sessionData.date,
    horario: sessionData.time,
    link: sessionData.link || 'https://meet.google.com/rocket-club',
  });

  const res = await sendEvolutionWhatsAppMessage(mentee.phone, message, configOverride);
  return { ...res, textSent: message };
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

  const templates = getStoredWhatsAppTemplates();
  const rawTemplate = customTemplate || templates.renewalAlert;
  const message = interpolateWhatsAppTemplate(rawTemplate, {
    nome: mentee.name,
    empresa: mentee.company || 'sua empresa',
    dataRenovacao: renewalData.renewalDate,
    diasRestantes: renewalData.daysLeft,
  });

  const res = await sendEvolutionWhatsAppMessage(mentee.phone, message, configOverride);
  return { ...res, textSent: message };
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

  const templates = getStoredWhatsAppTemplates();
  const rawTemplate = customTemplate || templates.taskStatus;
  const message = interpolateWhatsAppTemplate(rawTemplate, {
    nome: mentee.name,
    empresa: mentee.company || 'sua empresa',
    tarefa: taskData.taskTitle,
    status: taskData.status,
  });

  const res = await sendEvolutionWhatsAppMessage(mentee.phone, message, configOverride);
  return { ...res, textSent: message };
}
