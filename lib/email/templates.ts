/**
 * Conteúdo dos e-mails transacionais.
 *
 * Separado do envio de propósito: montar texto é puro e testável, falar com o
 * provedor não é.
 *
 * Todo e-mail sai com `html` e `text`. O texto não é enfeite — é o que aparece
 * em cliente que bloqueia HTML e na pré-visualização da caixa de entrada, e é
 * onde o código precisa estar legível.
 */

/** O nome vem do cadastro, e cadastro é campo livre. */
function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/** Minutos de validade — precisa bater com CODE_TTL_MS da rota. */
const VALIDADE_MINUTOS = 15;

export function passwordResetEmail(code: string, nome: string): EmailContent {
  const primeiroNome = escaparHtml(nome.trim().split(/\s+/)[0] || 'você');

  // O assunto carrega o código porque muita gente lê o código na notificação e
  // nem abre a mensagem.
  const subject = `${code} é o seu código de acesso — Rocket Club`;

  const text = [
    `Olá, ${nome.trim() || 'tudo bem'}!`,
    '',
    `Seu código para redefinir a senha do Rocket Club é: ${code}`,
    '',
    `O código vale por ${VALIDADE_MINUTOS} minutos e só pode ser usado uma vez.`,
    '',
    'Se não foi você que pediu, ignore este e-mail — sua senha continua a mesma.',
  ].join('\n');

  const html = `
<div style="margin:0;padding:32px 16px;background:#0d0d0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#17171b;border:1px solid #2a2a30;border-radius:12px;padding:32px;">
    <p style="margin:0 0 24px;color:#c9a227;font-size:13px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;">Rocket Club</p>

    <p style="margin:0 0 16px;color:#f2f2f4;font-size:16px;">Olá, ${primeiroNome}.</p>

    <p style="margin:0 0 24px;color:#a8a8b0;font-size:15px;line-height:1.6;">
      Use o código abaixo para redefinir sua senha.
    </p>

    <div style="margin:0 0 24px;padding:20px;background:#0d0d0f;border:1px solid #2a2a30;border-radius:8px;text-align:center;">
      <span style="color:#f2f2f4;font-size:32px;font-weight:700;letter-spacing:.24em;font-family:'SF Mono',Consolas,monospace;">${escaparHtml(code)}</span>
    </div>

    <p style="margin:0 0 24px;color:#a8a8b0;font-size:14px;line-height:1.6;">
      Ele vale por ${VALIDADE_MINUTOS} minutos e só pode ser usado uma vez.
    </p>

    <p style="margin:0;padding-top:24px;border-top:1px solid #2a2a30;color:#6f6f78;font-size:13px;line-height:1.6;">
      Se não foi você que pediu, ignore este e-mail — sua senha continua a mesma.
    </p>
  </div>
</div>`.trim();

  return { subject, html, text };
}

/** Horas em texto curto: "26 horas", "3 dias". */
function esperaLegivel(horas: number): string {
  const inteiras = Math.max(1, Math.round(horas));
  if (inteiras < 48) return `${inteiras} horas`;

  return `${Math.floor(inteiras / 24)} dias`;
}

export interface LeadParadoParams {
  /** Quem estava com a conversa. */
  atendente: string;
  contato: string;
  telefone: string | null;
  horasParado: number;
  /** Link direto para a conversa no Inbox. */
  url: string;
}

/**
 * Aviso de lead sem resposta.
 *
 * O tom não é de cobrança. Quem esqueceu uma conversa raramente esqueceu por
 * descaso — esqueceu porque o Inbox tem trinta conversas e essa desceu. O
 * e-mail existe para trazer a conversa de volta ao topo, e diz de saída que o
 * cliente já foi respondido, para ninguém entrar em pânico.
 */
export function leadParadoEmail(p: LeadParadoParams): EmailContent {
  const espera = esperaLegivel(p.horasParado);
  const primeiroNome = p.atendente.trim().split(/\s+/)[0] || 'você';
  const telefone = p.telefone ? ` (${p.telefone})` : '';

  const subject = `${p.contato} está esperando há ${espera}`;

  const text = [
    `Olá, ${primeiroNome}.`,
    '',
    `${p.contato}${telefone} enviou uma mensagem e está sem resposta há ${espera}.`,
    '',
    'O robô assumiu o atendimento para o cliente não ficar no vácuo, e a conversa',
    'voltou para a fila do setor — qualquer pessoa da equipe pode assumir.',
    '',
    `Abrir o Inbox: ${p.url}`,
  ].join('\n');

  const html = `
<div style="margin:0;padding:32px 16px;background:#0d0d0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#17171b;border:1px solid #2a2a30;border-radius:12px;padding:32px;">
    <p style="margin:0 0 24px;color:#c9a227;font-size:13px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;">Rocket Club</p>

    <p style="margin:0 0 16px;color:#f2f2f4;font-size:16px;">Olá, ${escaparHtml(primeiroNome)}.</p>

    <p style="margin:0 0 24px;color:#a8a8b0;font-size:15px;line-height:1.6;">
      <strong style="color:#f2f2f4;">${escaparHtml(p.contato)}</strong>${escaparHtml(telefone)}
      enviou uma mensagem e está sem resposta há <strong style="color:#f2f2f4;">${escaparHtml(espera)}</strong>.
    </p>

    <p style="margin:0 0 24px;color:#a8a8b0;font-size:15px;line-height:1.6;">
      O robô assumiu para o cliente não ficar no vácuo, e a conversa voltou para
      a fila do setor — qualquer pessoa da equipe pode assumir.
    </p>

    <a href="${escaparHtml(p.url)}" style="display:inline-block;padding:12px 24px;background:#c9a227;color:#0d0d0f;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">Abrir o Inbox</a>
  </div>
</div>`.trim();

  return { subject, html, text };
}
