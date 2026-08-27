import { prisma } from '@/lib/prisma';
import { generate, TRANSCRIBE_MODEL } from './gemini';
import { TRANSCRIBE_PROMPT } from './prompts';
import { readEvolutionEnv } from '@/lib/evolution/server';
import { getAiSettings } from './settings';
import {
  conversationVisibilityFilter,
  sessionDepartmentId,
  messageToDTO,
} from '@/lib/crm/conversations';
import type { SessionPayload } from '@/lib/auth/jwt';
import type { MessageDTO } from '@/lib/crm/inbox-types';

/**
 * Transcrição dos áudios de uma conversa.
 *
 * Roda quando alguém abre o atendimento, não quando a mensagem chega. Assim
 * só se paga pelo áudio que alguém de fato leu, e o webhook continua
 * respondendo instantaneamente — a Evolution reenvia o que demora.
 *
 * O modelo é generalista de propósito: ver a nota em `gemini.ts` sobre o
 * modelo dedicado, que lê o áudio e devolve vazio.
 */

/** Acima disso a chamada é cara e a Gemini costuma recusar mesmo. */
export const TAMANHO_MAXIMO_BYTES = 20 * 1024 * 1024;

/** Só o suficiente para o modelo saber que é fala. */
const MIMES_ACEITOS = ['audio/'];

export interface TranscribeSummary {
  transcribed: number;
  failed: number;
  messages: MessageDTO[];
}

/**
 * Decide, sem I/O, se vale a pena baixar e mandar para a IA.
 *
 * Informação ausente não reprova: a Evolution nem sempre informa mime ou
 * tamanho, e recusar por falta de dado perderia áudio bom. O que reprova é
 * informação presente e ruim.
 */
export function avaliarMidia(
  mimeType: string | null,
  bytes: number | null
): { ok: true } | { ok: false; motivo: string } {
  if (mimeType && !MIMES_ACEITOS.some((prefixo) => mimeType.startsWith(prefixo))) {
    return { ok: false, motivo: `Não é áudio (${mimeType}).` };
  }

  if (bytes !== null) {
    if (bytes <= 0) return { ok: false, motivo: 'Arquivo vazio.' };
    if (bytes > TAMANHO_MAXIMO_BYTES) {
      const mb = Math.round(bytes / 1024 / 1024);
      return { ok: false, motivo: `Áudio grande demais (${mb} MB; o limite é 20 MB).` };
    }
  }

  return { ok: true };
}

/**
 * Baixa a mídia da Evolution.
 *
 * A URL vem do gateway e pode exigir a chave; pode também ter expirado, que é
 * a dívida registrada na F3 — a mídia é referenciada, não copiada.
 */
async function baixarMidia(
  url: string
): Promise<{ ok: true; base64: string; mimeType: string } | { ok: false; motivo: string }> {
  const env = readEvolutionEnv();

  try {
    const resposta = await fetch(url, {
      headers: env ? { apikey: env.apiKey } : {},
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store',
    });

    if (!resposta.ok) {
      return { ok: false, motivo: `A mídia não está mais acessível (HTTP ${resposta.status}).` };
    }

    const mimeType = resposta.headers.get('content-type')?.split(';')[0] ?? null;
    const tamanhoDeclarado = Number(resposta.headers.get('content-length')) || null;

    const avaliacao = avaliarMidia(mimeType, tamanhoDeclarado);
    if (!avaliacao.ok) return { ok: false, motivo: avaliacao.motivo };

    const buffer = Buffer.from(await resposta.arrayBuffer());

    // O cabeçalho pode mentir ou faltar; o tamanho real é o que vale.
    const real = avaliarMidia(mimeType, buffer.byteLength);
    if (!real.ok) return { ok: false, motivo: real.motivo };

    return {
      ok: true,
      base64: buffer.toString('base64'),
      mimeType: mimeType ?? 'audio/ogg',
    };
  } catch (erro) {
    console.error('[transcribe] falha ao baixar midia:', erro);
    return { ok: false, motivo: 'Não foi possível baixar o áudio.' };
  }
}

/**
 * Transcreve os áudios pendentes da conversa.
 *
 * Devolve `null` quando a conversa não existe ou não é visível — o chamador
 * traduz para 404, nunca 403.
 */
export async function transcribeConversationAudio(
  session: SessionPayload,
  conversationId: string
): Promise<TranscribeSummary | null> {
  const setor = await sessionDepartmentId(session);
  const visivel = conversationVisibilityFilter(session, setor);

  const conversa = await prisma.conversation.findFirst({
    where: { AND: [{ id: conversationId }, visivel] },
    select: { id: true },
  });
  if (!conversa) return null;

  const configuracao = await getAiSettings(session.organizationId);
  if (!configuracao.available) {
    return { transcribed: 0, failed: 0, messages: [] };
  }

  const pendentes = await prisma.message.findMany({
    where: {
      conversationId,
      organizationId: session.organizationId,
      contentType: 'AUDIO',
      // NULL é "nunca tentado"; FAILED só volta por pedido explícito, senão
      // um áudio problemático custaria uma chamada por abertura de conversa.
      transcriptionStatus: null,
      mediaUrl: { not: null },
    },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  let transcribed = 0;
  let failed = 0;

  for (const mensagem of pendentes) {
    const resultado = await transcreverUma(mensagem.id, mensagem.mediaUrl!);
    if (resultado) transcribed++;
    else failed++;
  }

  const atualizadas = await prisma.message.findMany({
    where: { id: { in: pendentes.map((m) => m.id) } },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return { transcribed, failed, messages: atualizadas.map(messageToDTO) };
}

/** Repete um áudio que já falhou. Só por pedido do atendente. */
export async function retryTranscription(
  session: SessionPayload,
  messageId: string
): Promise<MessageDTO | null> {
  const mensagem = await prisma.message.findFirst({
    where: {
      id: messageId,
      organizationId: session.organizationId,
      contentType: 'AUDIO',
      transcriptionStatus: 'FAILED',
    },
    select: { id: true, mediaUrl: true },
  });
  if (!mensagem?.mediaUrl) return null;

  await transcreverUma(mensagem.id, mensagem.mediaUrl);

  const atualizada = await prisma.message.findUnique({
    where: { id: messageId },
    include: { user: { select: { name: true } } },
  });

  return atualizada ? messageToDTO(atualizada) : null;
}

async function transcreverUma(messageId: string, mediaUrl: string): Promise<boolean> {
  const midia = await baixarMidia(mediaUrl);

  if (!midia.ok) {
    // UNSUPPORTED, e não FAILED: repetir não vai adiantar, e a interface
    // precisa explicar isso em vez de oferecer um botão inútil.
    await prisma.message.update({
      where: { id: messageId },
      data: { transcriptionStatus: 'UNSUPPORTED', transcription: midia.motivo },
    });
    return false;
  }

  const resposta = await generate({
    model: TRANSCRIBE_MODEL,
    parts: [
      { text: TRANSCRIBE_PROMPT },
      { inlineData: { mimeType: midia.mimeType, data: midia.base64 } },
    ],
    temperature: 0,
    maxOutputTokens: 4000,
    timeoutMs: 60_000,
  });

  if (!resposta.ok) {
    await prisma.message.update({
      where: { id: messageId },
      data: { transcriptionStatus: 'FAILED', transcription: null },
    });
    return false;
  }

  await prisma.message.update({
    where: { id: messageId },
    data: { transcriptionStatus: 'DONE', transcription: resposta.text },
  });

  return true;
}
