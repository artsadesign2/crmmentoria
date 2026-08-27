import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth/jwt';
import { assertRole } from '@/lib/auth/session';
import { POLITICA_PADRAO, type DispatchPolicy } from './policy';
import { CampaignError } from './types';

/**
 * Parâmetros anti-bloqueio da organização.
 *
 * São ajustáveis porque o número certo depende do histórico do número e do tipo
 * de lista. O que não é ajustável é o formato: cada campo tem um limite, e o
 * limite existe para impedir que alguém "acelere o disparo" até queimar o
 * número da empresa numa tarde.
 */

interface Limite {
  min: number;
  max: number;
  rotulo: string;
}

const LIMITES: Record<keyof Omit<DispatchPolicy, 'timeZone'>, Limite> = {
  minIntervalMs: { min: 1000, max: 120_000, rotulo: 'O intervalo entre envios' },
  jitterMs: { min: 0, max: 60_000, rotulo: 'A variação aleatória' },
  maxPerMinute: { min: 1, max: 60, rotulo: 'O teto por minuto' },
  windowStartHour: { min: 0, max: 23, rotulo: 'A hora de início' },
  windowEndHour: { min: 1, max: 24, rotulo: 'A hora de fim' },
  dailyCap: { min: 1, max: 5000, rotulo: 'O teto diário' },
};

export async function getDispatchSettings(session: SessionPayload): Promise<DispatchPolicy> {
  const salva = await prisma.dispatchSettings.findUnique({
    where: { organizationId: session.organizationId },
  });

  if (!salva) return POLITICA_PADRAO;

  return {
    minIntervalMs: salva.minIntervalMs,
    jitterMs: salva.jitterMs,
    maxPerMinute: salva.maxPerMinute,
    windowStartHour: salva.windowStartHour,
    windowEndHour: salva.windowEndHour,
    dailyCap: salva.dailyCap,
    timeZone: salva.timeZone,
  };
}

/** Administrador ou acima: afrouxar estes números é assumir risco pela empresa. */
export async function saveDispatchSettings(
  session: SessionPayload,
  entrada: Partial<DispatchPolicy>
): Promise<DispatchPolicy> {
  assertRole(session, 'Administrador');

  const atual = await getDispatchSettings(session);
  const proposta: DispatchPolicy = { ...atual, ...limparNumeros(entrada) };

  for (const [campo, limite] of Object.entries(LIMITES)) {
    const valor = proposta[campo as keyof typeof LIMITES];
    if (valor < limite.min || valor > limite.max) {
      throw new CampaignError(
        `${limite.rotulo} precisa ficar entre ${limite.min} e ${limite.max}.`
      );
    }
  }

  if (proposta.windowStartHour === proposta.windowEndHour) {
    // Início igual ao fim não é "24 horas": é uma janela de duração zero, e a
    // fila nunca andaria. Quem quer o dia inteiro configura 0 e 24.
    throw new CampaignError(
      'A janela precisa ter duração. Para o dia inteiro, use 0 e 24.'
    );
  }

  if (!fusoValido(proposta.timeZone)) {
    throw new CampaignError('Fuso horário desconhecido.');
  }

  const salva = await prisma.dispatchSettings.upsert({
    where: { organizationId: session.organizationId },
    create: { organizationId: session.organizationId, ...proposta },
    update: { ...proposta, updatedAt: new Date() },
  });

  return {
    minIntervalMs: salva.minIntervalMs,
    jitterMs: salva.jitterMs,
    maxPerMinute: salva.maxPerMinute,
    windowStartHour: salva.windowStartHour,
    windowEndHour: salva.windowEndHour,
    dailyCap: salva.dailyCap,
    timeZone: salva.timeZone,
  };
}

/** Campo de formulário chega como string; `NaN` não pode virar coluna. */
function limparNumeros(entrada: Partial<DispatchPolicy>): Partial<DispatchPolicy> {
  const saida: Partial<DispatchPolicy> = {};

  for (const campo of Object.keys(LIMITES) as Array<keyof typeof LIMITES>) {
    const valor = entrada[campo];
    if (typeof valor === 'number' && Number.isFinite(valor)) {
      saida[campo] = Math.round(valor);
    }
  }

  if (typeof entrada.timeZone === 'string' && entrada.timeZone.trim()) {
    saida.timeZone = entrada.timeZone.trim();
  }

  return saida;
}

/**
 * Um fuso inválido só apareceria na hora do envio, como janela calculada
 * errada — e ninguém ligaria uma coisa à outra.
 */
function fusoValido(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}
