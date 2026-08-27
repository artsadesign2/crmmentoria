import crypto from 'crypto';

/**
 * Cliente da Evolution API do lado do servidor.
 *
 * Existe separado de `lib/evolution-api.ts` porque aquele é `'use client'` e
 * fala com `/api/evolution/proxy`. O servidor não deve dar a volta pelo próprio
 * proxy para alcançar a Evolution — além do salto desnecessário, o proxy exige
 * cookie de sessão, que o webhook não tem.
 *
 * As credenciais vivem só no ambiente do servidor (sem `NEXT_PUBLIC_`, que as
 * embutiria no bundle entregue ao navegador).
 */

export interface EvolutionServerEnv {
  serverUrl: string;
  apiKey: string;
  instanceName: string;
}

export function readEvolutionEnv(): EvolutionServerEnv | null {
  const serverUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  if (!serverUrl || !apiKey) return null;

  return {
    serverUrl: serverUrl.replace(/\/+$/, ''),
    apiKey,
    instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'rocket-club-crm',
  };
}

export type SendResult =
  | { ok: true; externalId: string | null }
  | { ok: false; error: string };

/** Envia texto pelo número central da empresa. */
export async function sendText(phone: string, text: string): Promise<SendResult> {
  const env = readEvolutionEnv();
  if (!env) {
    return {
      ok: false,
      error: 'Evolution API não configurada no servidor (EVOLUTION_API_URL e EVOLUTION_API_KEY).',
    };
  }

  const url = `${env.serverUrl}/message/sendText/${encodeURIComponent(env.instanceName)}`;

  try {
    const resposta = await fetch(url, {
      method: 'POST',
      headers: { apikey: env.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: phone, text }),
      cache: 'no-store',
    });

    const corpo = (await resposta.json().catch(() => ({}))) as {
      key?: { id?: string };
      message?: string;
      error?: string;
    };

    if (!resposta.ok) {
      // A URL de destino não vai para o cliente: ela expõe topologia interna.
      console.error('[evolution] envio recusado', resposta.status, corpo);
      return { ok: false, error: `A Evolution recusou o envio (HTTP ${resposta.status}).` };
    }

    return { ok: true, externalId: corpo.key?.id ?? null };
  } catch (error) {
    console.error('[evolution] falha ao contatar', url, error);
    return { ok: false, error: 'Não foi possível contatar a Evolution API.' };
  }
}

/**
 * Autenticação do webhook.
 *
 * A Evolution não tem cookie de sessão, então o webhook é isento da sessão no
 * middleware — e precisa do próprio segredo. Até a F3 a rota não gravava nada e
 * a ausência era inofensiva; a partir do momento em que ela escreve no banco,
 * um endpoint de escrita aberto na internet é como se envenena uma caixa de
 * entrada.
 *
 * Falha fechada: sem `EVOLUTION_WEBHOOK_TOKEN` no ambiente, nada é aceito. Não
 * existe modo permissivo, porque um webhook de escrita sem segredo é o mesmo
 * que não ter segredo.
 */
export function verifyWebhookToken(request: Request): boolean {
  const esperado = process.env.EVOLUTION_WEBHOOK_TOKEN;
  if (!esperado) return false;

  const url = new URL(request.url);
  const recebido = request.headers.get('x-webhook-token') ?? url.searchParams.get('token') ?? '';

  return compararEmTempoConstante(recebido, esperado);
}

/**
 * Comparar com `===` interrompe no primeiro byte diferente, e o tempo de
 * resposta revela quantos caracteres do prefixo estavam certos — o suficiente
 * para descobrir o token um byte por vez.
 *
 * `timingSafeEqual` exige buffers do mesmo tamanho, então os dois lados passam
 * por um hash antes: o digest tem tamanho fixo e o comprimento do segredo deixa
 * de vazar junto.
 */
function compararEmTempoConstante(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();

  return crypto.timingSafeEqual(ha, hb);
}
