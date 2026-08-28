import { sendViaResend } from './resend';

/**
 * Envio de e-mail transacional.
 *
 * Um driver hoje (Resend), escolhido por variável de ambiente. A troca de
 * provedor é um arquivo novo ao lado de `resend.ts` e uma linha aqui — nenhuma
 * rota precisa saber quem entrega.
 *
 * Sem `RESEND_API_KEY`, cai no log **com aviso alto**. O silêncio seria o pior
 * comportamento possível: a rota de recuperação de senha responde a mesma coisa
 * de sempre, e ninguém descobriria que nenhum e-mail saiu do servidor.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type EmailResult = { ok: true } | { ok: false; error: string };

interface EmailEnv {
  apiKey: string;
  from: string;
}

/** Remetente padrão só para não quebrar o envio quando EMAIL_FROM falta. */
const REMETENTE_PADRAO = 'Rocket Club <onboarding@resend.dev>';

function readEmailEnv(): EmailEnv | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;

  return { apiKey, from: process.env.EMAIL_FROM?.trim() || REMETENTE_PADRAO };
}

/** Verdadeiro quando existe provedor de verdade configurado. */
export function isEmailConfigured(): boolean {
  return readEmailEnv() !== null;
}

/**
 * Envia — ou registra no log, se não houver provedor.
 *
 * Nunca lança. Quem chama é uma rota que tem uma resposta a preservar, e uma
 * exceção aqui viraria 500 numa operação que já deu certo do ponto de vista do
 * usuário (o código foi gerado e gravado).
 */
export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const env = readEmailEnv();

  if (!env) {
    console.warn(
      '[email] RESEND_API_KEY ausente: NENHUM e-mail foi enviado. ' +
        `Destinatário: ${msg.to} — Assunto: ${msg.subject}`
    );
    console.warn(`[email] conteúdo que teria sido enviado:\n${msg.text}`);

    return { ok: false, error: 'Provedor de e-mail não configurado.' };
  }

  return sendViaResend(env.apiKey, env.from, msg);
}
