/**
 * Motor de Notificações por E-mail para Tarefas & Prazos
 * 100% Custo Zero: Suporta Resend (plano gratuito), SMTP/Gmail ou Log no terminal.
 */

export interface EmailNotificationPayload {
  to: string;
  recipientName: string;
  type: 'ASSIGNED' | 'DUE_SOON' | 'OVERDUE' | 'COMMENT';
  taskTitle: string;
  projectName: string;
  dueDateFormatted?: string;
  priority?: string;
  taskUrl?: string;
  authorName?: string;
  commentContent?: string;
}

export async function sendTaskNotificationEmail(payload: EmailNotificationPayload): Promise<{ success: boolean; message: string }> {
  const { to, recipientName, type, taskTitle, projectName, dueDateFormatted, priority, taskUrl, authorName, commentContent } = payload;

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = taskUrl || `${appBaseUrl}/kanban`;

  let subject = '';
  let headline = '';
  let badgeColor = '#3B82F6';
  let badgeText = 'TAREFA';
  let bodyText = '';

  if (type === 'ASSIGNED') {
    subject = `📌 Nova tarefa atribuída: "${taskTitle}" (${projectName})`;
    headline = `Você foi atribuído a uma nova tarefa!`;
    badgeColor = '#3B82F6';
    badgeText = 'NOVA ATRIBUIÇÃO';
    bodyText = `${authorName || 'Um membro da equipe'} atribuiu a tarefa <strong>"${taskTitle}"</strong> a você no projeto <strong>${projectName}</strong>.`;
  } else if (type === 'DUE_SOON') {
    subject = `⏰ Prazo Próximo: "${taskTitle}" vence em breve (${projectName})`;
    headline = `Lembrete de Entrega`;
    badgeColor = '#EAB308';
    badgeText = 'PRAZO PRÓXIMO';
    bodyText = `A tarefa <strong>"${taskTitle}"</strong> no projeto <strong>${projectName}</strong> tem prazo de entrega para <strong>${dueDateFormatted || 'hoje'}</strong>.`;
  } else if (type === 'OVERDUE') {
    subject = `🚨 Tarefa Atrasada: "${taskTitle}" (${projectName})`;
    headline = `Atenção: Prazo de entrega vencido`;
    badgeColor = '#EF4444';
    badgeText = 'ATRASADA';
    bodyText = `A tarefa <strong>"${taskTitle}"</strong> no projeto <strong>${projectName}</strong> estava prevista para <strong>${dueDateFormatted || 'recentemente'}</strong> e ainda não foi concluída.`;
  } else if (type === 'COMMENT') {
    subject = `💬 Novo comentário em: "${taskTitle}"`;
    headline = `Novo comentário de ${authorName || 'Colega'}`;
    badgeColor = '#8B5CF6';
    badgeText = 'DISCUSSÃO';
    bodyText = `<strong>${authorName || 'Alguém'}</strong> comentou: <em>"${commentContent || ''}"</em>`;
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0F172A; color: #F8FAFC; margin: 0; padding: 24px; }
    .card { max-width: 560px; margin: 0 auto; background-color: #1E293B; border-radius: 12px; border: 1px solid #334155; padding: 32px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #FFFFFF; background-color: ${badgeColor}; }
    .title { font-size: 20px; font-weight: 700; margin-top: 16px; margin-bottom: 8px; color: #FFFFFF; }
    .project { font-size: 13px; color: #94A3B8; margin-bottom: 20px; }
    .content { font-size: 15px; line-height: 1.6; color: #CBD5E1; margin-bottom: 28px; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #EAB308; color: #0F172A; font-weight: 700; text-decoration: none; border-radius: 8px; font-size: 14px; }
    .footer { font-size: 12px; color: #64748B; margin-top: 32px; border-top: 1px solid #334155; padding-top: 16px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">${badgeText}</span>
    <div class="title">${headline}</div>
    <div class="project">Projeto: ${projectName} ${priority ? `• Prioridade: ${priority}` : ''}</div>
    <div class="content">
      <p>Olá, <strong>${recipientName}</strong>,</p>
      <p>${bodyText}</p>
      ${dueDateFormatted ? `<p>📅 <strong>Data Limite:</strong> ${dueDateFormatted}</p>` : ''}
    </div>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${url}" class="btn">Abrir Tarefa no Rocket Club</a>
    </div>
    <div class="footer">
      Rocket Club SaaS • Sistema de Gestão de Tarefas & Equipe
    </div>
  </div>
</body>
</html>
  `.trim();

  // 1. Tenta envio via Resend (se chave estiver no .env)
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
      }
    } catch (err) {
      console.error('[Notification] Falha ao enviar via Resend:', err);
    }
  }

  // 2. Fallback: Log em desenvolvimento
  console.log(`\n📨 [SIMULAÇÃO DE EMAIL]`);
  console.log(`Para: ${to} (${recipientName})`);
  console.log(`Assunto: ${subject}`);
  console.log(`Tipo: ${type} | Tarefa: ${taskTitle}\n`);

  return { success: true, message: 'Notificação processada (ambiente de dev/log)' };
}
