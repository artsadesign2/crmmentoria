import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth/jwt';
import { assertRole } from '@/lib/auth/session';
import { BotError } from './types';
import { DIAS_UTEIS, RETOMADA_PADRAO, lerDiasDeExpediente, type RetomadaConfig } from './reengage';

/**
 * Configuração da retomada.
 *
 * Separada de `dispatch_settings` de propósito. A janela do disparo responde
 * "quando é aceitável incomodar um desconhecido" (8h–20h, todo dia); a do
 * expediente responde "quando existe gente trabalhando" (9h–18h, dias úteis).
 * São perguntas diferentes e mudam por motivos diferentes — juntá-las faria
 * alguém encurtar o disparo ao ajustar o expediente.
 */

interface Limite {
  min: number;
  max: number;
  rotulo: string;
}

const LIMITES: Record<'reengageAfterHours' | 'officeStartHour' | 'officeEndHour', Limite> = {
  // Menos de uma hora transformaria um atendente em reunião em abandono. Mais
  // de 30 dias é a mesma coisa que desligar — e para isso existe o interruptor.
  reengageAfterHours: { min: 1, max: 720, rotulo: 'O tempo até a retomada' },
  officeStartHour: { min: 0, max: 23, rotulo: 'A hora de início do expediente' },
  officeEndHour: { min: 1, max: 24, rotulo: 'A hora de fim do expediente' },
};

/**
 * Recebe `organizationId` e não a sessão: quem mais chama isto é o executor,
 * rodando a partir de um webhook, onde não existe usuário logado.
 */
export async function getBotSettings(organizationId: string): Promise<RetomadaConfig> {
  const salva = await prisma.botSettings.findUnique({ where: { organizationId } });

  if (!salva) return RETOMADA_PADRAO;

  return {
    reengageEnabled: salva.reengageEnabled,
    reengageAfterHours: salva.reengageAfterHours,
    officeDays: lerDiasDeExpediente(salva.officeDays),
    officeStartHour: salva.officeStartHour,
    officeEndHour: salva.officeEndHour,
    timeZone: salva.timeZone,
  };
}

export interface EntradaBotSettings {
  reengageEnabled?: boolean;
  reengageAfterHours?: number;
  officeDays?: number[];
  officeStartHour?: number;
  officeEndHour?: number;
  timeZone?: string;
  notifyByEmail?: boolean;
}

/**
 * Administrador ou acima: quem mexe aqui decide quanto tempo um cliente pode
 * ficar esperando antes de o sistema considerar que houve falha.
 */
export async function saveBotSettings(
  session: SessionPayload,
  entrada: EntradaBotSettings
): Promise<RetomadaConfig> {
  assertRole(session, 'Administrador');

  const atual = await getBotSettings(session.organizationId);
  const proposta: RetomadaConfig = { ...atual, ...limpar(entrada) };

  for (const [campo, limite] of Object.entries(LIMITES)) {
    const valor = proposta[campo as keyof typeof LIMITES];
    if (valor < limite.min || valor > limite.max) {
      throw new BotError(`${limite.rotulo} precisa ficar entre ${limite.min} e ${limite.max}.`);
    }
  }

  if (proposta.officeStartHour === proposta.officeEndHour) {
    // Início igual ao fim não é "24 horas": é uma janela de duração zero. Todo
    // contato cairia no robô, o dia inteiro, para sempre.
    throw new BotError('O expediente precisa ter duração. Para o dia inteiro, use 0 e 24.');
  }

  if (proposta.officeDays.length === 0) {
    throw new BotError('Escolha ao menos um dia de expediente.');
  }

  if (!fusoValido(proposta.timeZone)) {
    throw new BotError('Fuso horário desconhecido.');
  }

  const linha = {
    reengageEnabled: proposta.reengageEnabled,
    reengageAfterHours: proposta.reengageAfterHours,
    officeDays: proposta.officeDays.join(','),
    officeStartHour: proposta.officeStartHour,
    officeEndHour: proposta.officeEndHour,
    timeZone: proposta.timeZone,
    ...(entrada.notifyByEmail === undefined ? {} : { notifyByEmail: entrada.notifyByEmail }),
  };

  await prisma.botSettings.upsert({
    where: { organizationId: session.organizationId },
    create: { organizationId: session.organizationId, ...linha },
    update: { ...linha, updatedAt: new Date() },
  });

  return proposta;
}

/** Verdadeiro quando a organização quer ser avisada por e-mail do abandono. */
export async function notificaPorEmail(organizationId: string): Promise<boolean> {
  const salva = await prisma.botSettings.findUnique({
    where: { organizationId },
    select: { notifyByEmail: true },
  });

  return salva?.notifyByEmail ?? true;
}

/** Campo de formulário chega como string; `NaN` não pode virar coluna. */
function limpar(entrada: EntradaBotSettings): Partial<RetomadaConfig> {
  const saida: Partial<RetomadaConfig> = {};

  for (const campo of Object.keys(LIMITES) as Array<keyof typeof LIMITES>) {
    const valor = entrada[campo];
    if (typeof valor === 'number' && Number.isFinite(valor)) saida[campo] = Math.round(valor);
  }

  if (typeof entrada.reengageEnabled === 'boolean') {
    saida.reengageEnabled = entrada.reengageEnabled;
  }

  if (Array.isArray(entrada.officeDays)) {
    // Sem cair no padrão: aqui uma lista vazia é um formulário sem nenhum dia
    // marcado, e isso precisa virar erro visível em vez de "segunda a sexta"
    // aparecendo sozinho na tela depois de salvar.
    const dias = entrada.officeDays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    saida.officeDays = [...new Set(dias)].sort((a, b) => a - b);
  }

  if (typeof entrada.timeZone === 'string' && entrada.timeZone.trim()) {
    saida.timeZone = entrada.timeZone.trim();
  }

  return saida;
}

function fusoValido(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export { DIAS_UTEIS };
