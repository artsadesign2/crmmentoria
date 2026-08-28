import type { EmailMessage, EmailResult } from './index';

/**
 * Driver de e-mail sobre a API HTTP do Resend.
 *
 * `fetch` direto, sem SDK: é uma requisição POST com JSON. O SDK traria uma
 * dependência, uma cadeia de atualizações e nenhuma capacidade que não esteja
 * aqui — e este arquivo é o único lugar que precisaria mudar para trocar de
 * provedor.
 */

const ENDPOINT = 'https://api.resend.com/emails';
const TIMEOUT_MS = 15_000;

/** Nunca lança: o chamador decide o que fazer com a falha. */
export async function sendViaResend(
  apiKey: string,
  from: string,
  msg: EmailMessage
): Promise<EmailResult> {
  // Sem timeout, uma indisponibilidade do provedor prenderia a rota até o teto
  // da função serverless — o usuário fica olhando um botão girando.
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TIMEOUT_MS);

  try {
    const resposta = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
      signal: controle.signal,
    });

    if (!resposta.ok) {
      // O corpo do erro do Resend diz o que houve (domínio não verificado,
      // chave inválida). Sem ele, o log vira "falhou" e não ajuda ninguém.
      const detalhe = await resposta.text().catch(() => '');
      return {
        ok: false,
        error: `Resend respondeu ${resposta.status}: ${detalhe.slice(0, 300)}`,
      };
    }

    return { ok: true };
  } catch (error) {
    const motivo = controle.signal.aborted
      ? `sem resposta em ${TIMEOUT_MS / 1000}s`
      : error instanceof Error
        ? error.message
        : String(error);

    return { ok: false, error: `Falha de rede ao falar com o Resend: ${motivo}` };
  } finally {
    clearTimeout(relogio);
  }
}
