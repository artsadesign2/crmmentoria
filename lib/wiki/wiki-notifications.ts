/**
 * Motor de Disparo de E-mails para Compartilhamento de Artigos da Wiki & Treinamentos
 * 100% Custo Zero: Integração direta com Resend (Free Tier 3.000 emails/mês) ou fallback seguro.
 */

export interface WikiShareEmailPayload {
  to: string;
  recipientName: string;
  senderName: string;
  articleId: string;
  articleTitle: string;
  articleSummary: string;
  department: string;
  category: string;
  readingTimeMinutes?: number;
  note?: string;
  hasVideo?: boolean;
}

export async function sendWikiShareEmail(payload: WikiShareEmailPayload): Promise<{ success: boolean; message: string }> {
  const {
    to,
    recipientName,
    senderName,
    articleId,
    articleTitle,
    articleSummary,
    department,
    category,
    readingTimeMinutes = 5,
    note,
    hasVideo = false,
  } = payload;

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const articleUrl = `${appBaseUrl}/wiki/${articleId}`;

  const subject = `📚 ${senderName} recomendou o treinamento: "${articleTitle}"`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recomendação de Treinamento - Rocket Club</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B0F19; color: #F8FAFC; margin: 0; padding: 24px; }
    .card { max-width: 580px; margin: 0 auto; background-color: #111827; border-radius: 16px; border: 1px solid #1F2937; padding: 36px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .badge { display: inline-block; padding: 6px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #F59E0B; background-color: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); }
    .header-title { font-size: 22px; font-weight: 800; margin-top: 18px; margin-bottom: 8px; color: #FFFFFF; line-height: 1.3; }
    .subhead { font-size: 14px; color: #9CA3AF; margin-bottom: 24px; line-height: 1.5; }
    .note-box { background-color: rgba(245, 158, 11, 0.06); border-left: 4px solid #F59E0B; padding: 14px 18px; border-radius: 0 12px 12px 0; margin-bottom: 24px; }
    .note-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #F59E0B; margin-bottom: 4px; }
    .note-text { font-size: 14px; color: #E5E7EB; font-style: italic; margin: 0; line-height: 1.5; }
    .article-box { background-color: #1F2937; border-radius: 12px; padding: 20px; border: 1px solid #374151; margin-bottom: 28px; }
    .article-title { font-size: 16px; font-weight: 700; color: #F3F4F6; margin-bottom: 8px; }
    .article-meta { font-size: 12px; color: #9CA3AF; margin-bottom: 12px; }
    .article-desc { font-size: 13px; color: #D1D5DB; line-height: 1.6; margin: 0; }
    .btn-container { text-align: center; margin: 32px 0 16px 0; }
    .btn { display: inline-block; padding: 14px 32px; background-color: #F59E0B; color: #0B0F19; font-weight: 800; text-decoration: none; border-radius: 10px; font-size: 14px; transition: all 0.2s ease; box-shadow: 0 4px 14px 0 rgba(245, 158, 11, 0.35); }
    .footer { font-size: 12px; color: #6B7280; margin-top: 36px; border-top: 1px solid #1F2937; padding-top: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div>
      <span class="badge">📚 Recomendação de Treinamento</span>
    </div>
    
    <div class="header-title">Olá, ${recipientName}!</div>
    <div class="subhead">
      <strong>${senderName}</strong> indicou um novo documento na base de conhecimento oficial do Rocket Club para você estudar.
    </div>

    ${
      note
        ? `
    <div class="note-box">
      <div class="note-label">Mensagem de ${senderName}:</div>
      <p class="note-text">"${note}"</p>
    </div>
    `
        : ''
    }

    <div class="article-box">
      <div class="article-title">${articleTitle}</div>
      <div class="article-meta">
        <strong>Departamento:</strong> ${department} &nbsp;•&nbsp; 
        <strong>Categoria:</strong> ${category} &nbsp;•&nbsp; 
        <strong>Tempo:</strong> ~${readingTimeMinutes} min ${hasVideo ? '&nbsp;•&nbsp; 🎥 Inclui Vídeo' : ''}
      </div>
      <p class="article-desc">${articleSummary}</p>
    </div>

    <div class="btn-container">
      <a href="${articleUrl}" class="btn">Acessar Documento & Treinamento</a>
    </div>

    <div class="footer">
      Rocket Club SaaS • Central de Conhecimento & Procedimentos Operacionais<br>
      Este é um e-mail de notificação interna automática.
    </div>
  </div>
</body>
</html>
  `.trim();

  // 1. Envio via Resend API
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'Rocket Club <notificacoes@rocketclub.com>',
          to: [to],
          subject,
          html: htmlContent,
        }),
      });

      if (response.ok) {
        return { success: true, message: 'E-mail enviado via Resend com sucesso' };
      } else {
        const errorText = await response.text();
        console.warn(`[Resend Error for ${to}]:`, errorText);
      }
    } catch (err) {
      console.error('[Wiki Notification] Erro ao disparar Resend:', err);
    }
  }

  // 2. Fallback em Log
  console.log(`\n📨 [SIMULAÇÃO DE EMAIL - WIKI SHARE]`);
  console.log(`Para: ${to} (${recipientName})`);
  console.log(`De: ${senderName}`);
  console.log(`Assunto: ${subject}`);
  console.log(`Artigo: ${articleTitle} (ID: ${articleId})\n`);

  return { success: true, message: 'Notificação processada com sucesso (modo dev/log)' };
}
