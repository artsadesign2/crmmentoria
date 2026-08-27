import { prisma } from '@/lib/prisma';
import { hasAtLeastRole } from '@/lib/auth/roles';
import { isAiConfigured } from './gemini';
import type { SessionPayload } from '@/lib/auth/jwt';

/**
 * Base de conhecimento da organização.
 *
 * É o que separa um copiloto útil de um que inventa preço na frente do
 * cliente. Texto livre de propósito: quem escreve conhece o negócio, e um
 * formulário com campos fixos ("preço", "prazo") só serviria para deixar de
 * fora o que aquele negócio tem de particular.
 */

export interface AiSettingsDTO {
  knowledgeBase: string;
  tone: string;
  enabled: boolean;
  updatedAt: string | null;
  /** Verdadeiro só quando há chave no servidor E a organização não desligou. */
  available: boolean;
}

export class AiSettingsForbiddenError extends Error {
  constructor() {
    super('Só Administrador ou acima pode editar a base de conhecimento.');
    this.name = 'AiSettingsForbiddenError';
  }
}

const PADRAO = { knowledgeBase: '', tone: '', enabled: true };

export async function getAiSettings(organizationId: string): Promise<AiSettingsDTO> {
  const linha = await prisma.aiSettings.findUnique({ where: { organizationId } });

  const enabled = linha?.enabled ?? PADRAO.enabled;

  return {
    knowledgeBase: linha?.knowledgeBase ?? PADRAO.knowledgeBase,
    tone: linha?.tone ?? PADRAO.tone,
    enabled,
    updatedAt: linha?.updatedAt.toISOString() ?? null,
    // Sem chave no servidor não adianta a organização querer: nada funciona.
    available: isAiConfigured() && enabled,
  };
}

export async function saveAiSettings(
  session: SessionPayload,
  patch: { knowledgeBase?: string; tone?: string; enabled?: boolean }
): Promise<AiSettingsDTO> {
  if (!hasAtLeastRole(session.role, 'Administrador')) {
    throw new AiSettingsForbiddenError();
  }

  const dados = {
    ...(patch.knowledgeBase !== undefined ? { knowledgeBase: patch.knowledgeBase.trim() } : {}),
    ...(patch.tone !== undefined ? { tone: patch.tone.trim() } : {}),
    ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
    updatedAt: new Date(),
  };

  await prisma.aiSettings.upsert({
    where: { organizationId: session.organizationId },
    update: dados,
    create: { organizationId: session.organizationId, ...PADRAO, ...dados },
  });

  return getAiSettings(session.organizationId);
}
