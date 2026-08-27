/**
 * Cliente da Gemini, só de servidor.
 *
 * A chave nunca chega ao navegador: `GEMINI_API_KEY`, sem prefixo
 * `NEXT_PUBLIC_`, lida apenas aqui.
 *
 * Este arquivo é mais sobre resiliência do que sobre recurso, e isso vem de
 * medição, não de precaução genérica. Ao levantar a fase, recebi 503
 * intermitente em vários modelos diferentes, e o modelo mais novo respondeu
 * uma vez em 166 segundos. Sem cadeia de reserva, retentativa e timeout, o
 * copiloto seria uma funcionalidade que falha em horário comercial.
 */

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Ordem por latência medida em 2026-08-27:
 *
 *   gemini-3.5-flash   1,2 s   ← padrão
 *   gemini-3.6-flash   1,9 s   ← reserva
 *   gemini-3.7-flash   166 s / 503   ← fora, por medição
 *
 * Refazer a medição quando a Google mexer na linha 3.x.
 */
export const MODEL_CHAIN = ['gemini-3.5-flash', 'gemini-3.6-flash'] as const;

/**
 * Transcrição usa generalista de propósito.
 *
 * `gemini-3.5-transcribe` existe, é dedicado, e devolve parte vazia em todas
 * as formas de invocação testadas — contabilizando os tokens do áudio, ou
 * seja, lendo o arquivo e não respondendo. O mesmo arquivo, mandado a este
 * modelo, transcreveu corretamente em 3,8 s.
 */
export const TRANSCRIBE_MODEL = 'gemini-3.6-flash';

/** Medido: uma resposta de duas letras consumiu 118 tokens em raciocínio. */
const MAX_OUTPUT_PADRAO = 4000;
const TEMPERATURA_PADRAO = 0.4;
const TIMEOUT_PADRAO_MS = 45_000;
const ESPERAS_MS = [1_000, 2_000, 4_000];

export interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export interface GeminiRequest {
  system?: string;
  parts: GeminiPart[];
  /** Liga `responseMimeType` e `responseSchema` juntos; um sem o outro não vale. */
  json?: { schema: unknown };
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  /** Fixa um modelo, ignorando a cadeia. Usado pela transcrição. */
  model?: string;
}

export type GeminiResult =
  | { ok: true; text: string; model: string; tokens: number }
  | { ok: false; error: string; retryable: boolean };

interface RequestBody {
  contents: Array<{ role: 'user'; parts: GeminiPart[] }>;
  systemInstruction?: { parts: Array<{ text: string }> };
  generationConfig: {
    maxOutputTokens: number;
    temperature: number;
    responseMimeType?: string;
    responseSchema?: unknown;
  };
}

/** Sem chave, os botões de IA nem aparecem — e nenhuma chamada é feita. */
export function isAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Repetir um 400 ou um 401 não muda o resultado: só queima cota contra um erro
 * que é nosso, não da Google.
 */
export function isRetryable(status: number): boolean {
  return status === 429 || status === 500 || status === 503;
}

/** Separado da chamada para poder ser verificado sem rede. */
export function buildRequestBody(req: GeminiRequest): RequestBody {
  const body: RequestBody = {
    contents: [{ role: 'user', parts: req.parts }],
    generationConfig: {
      maxOutputTokens: req.maxOutputTokens ?? MAX_OUTPUT_PADRAO,
      temperature: req.temperature ?? TEMPERATURA_PADRAO,
    },
  };

  if (req.system) {
    body.systemInstruction = { parts: [{ text: req.system }] };
  }

  if (req.json) {
    body.generationConfig.responseMimeType = 'application/json';
    body.generationConfig.responseSchema = req.json.schema;
  }

  return body;
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Extrai o texto de todas as partes; a Gemini pode devolver mais de uma. */
function extrairTexto(resposta: unknown): string {
  const partes =
    (resposta as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
      ?.candidates?.[0]?.content?.parts ?? [];

  return partes
    .map((p) => p.text)
    .filter((t): t is string => typeof t === 'string')
    .join('')
    .trim();
}

/**
 * Chama a Gemini. **Nunca lança.**
 *
 * Uma falha da IA não pode derrubar o atendimento: o atendente perde a
 * sugestão, não a conversa. Por isso o retorno é um resultado, e não uma
 * exceção que cada chamador teria que lembrar de capturar.
 */
export async function generate(req: GeminiRequest): Promise<GeminiResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return { ok: false, error: 'IA não configurada no servidor.', retryable: false };
  }

  const modelos = req.model ? [req.model] : [...MODEL_CHAIN];
  const corpo = JSON.stringify(buildRequestBody(req));
  let ultimoErro = 'Não foi possível falar com a IA.';

  for (const modelo of modelos) {
    for (let tentativa = 0; tentativa <= ESPERAS_MS.length; tentativa++) {
      try {
        const resposta = await fetch(`${ENDPOINT}/${modelo}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: corpo,
          signal: AbortSignal.timeout(req.timeoutMs ?? TIMEOUT_PADRAO_MS),
          cache: 'no-store',
        });

        if (resposta.ok) {
          const dados = (await resposta.json()) as { usageMetadata?: { totalTokenCount?: number } };
          const texto = extrairTexto(dados);

          if (!texto) {
            // Aconteceu de verdade com o modelo dedicado de transcrição: HTTP
            // 200, finishReason STOP, parte vazia. Tratar como sucesso
            // devolveria string vazia para a interface sem explicação.
            ultimoErro = 'A IA respondeu sem conteúdo.';
            break;
          }

          return {
            ok: true,
            text: texto,
            model: modelo,
            tokens: dados.usageMetadata?.totalTokenCount ?? 0,
          };
        }

        if (!isRetryable(resposta.status)) {
          // A chave aparece na URL; o corpo do erro pode ecoá-la. Nada do que
          // a Google devolve vai para o cliente.
          console.error(`[gemini] ${modelo} HTTP ${resposta.status}`);
          return {
            ok: false,
            error:
              resposta.status === 401 || resposta.status === 403
                ? 'A chave da IA foi recusada. Verifique GEMINI_API_KEY.'
                : 'A IA recusou a requisição.',
            retryable: false,
          };
        }

        ultimoErro = 'A IA está sobrecarregada no momento.';
        if (tentativa < ESPERAS_MS.length) await dormir(ESPERAS_MS[tentativa]);
      } catch (erro) {
        const abortou = erro instanceof Error && erro.name === 'TimeoutError';
        ultimoErro = abortou
          ? 'A IA demorou demais para responder.'
          : 'Não foi possível falar com a IA.';

        console.error(`[gemini] ${modelo} falhou:`, erro);
        if (tentativa < ESPERAS_MS.length) await dormir(ESPERAS_MS[tentativa]);
      }
    }
    // Esgotado este modelo, o próximo da cadeia tem a chance.
  }

  return { ok: false, error: ultimoErro, retryable: true };
}
