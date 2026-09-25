/**
 * Motor de Automações CRM ⇄ WhatsApp & Hostinger / n8n Webhooks (100% Custo Zero)
 * Dispara mensagens automatizadas e eventos quando um lead/deal avança de etapa no funil.
 */

import { sendEvolutionWhatsAppMessage, formatWhatsAppNumber } from '@/lib/evolution-api';
import { broadcastNotificationToOrg } from '@/lib/notifications-stream';

export interface DealStageChangeEvent {
  organizationId: string;
  dealId: string;
  dealTitle: string;
  dealValue: number;
  contactName: string;
  contactPhone?: string | null;
  stageName: string;
  previousStageName?: string;
  userEmail?: string;
}

export async function handleDealStageAutomation(event: DealStageChangeEvent): Promise<{
  whatsappSent: boolean;
  webhookSent: boolean;
}> {
  const { organizationId, dealId, dealTitle, dealValue, contactName, contactPhone, stageName } = event;

  let whatsappSent = false;
  let webhookSent = false;

  // 1. Mensagem Automática pelo WhatsApp via Evolution API (Se houver telefone do lead)
  if (contactPhone) {
    const cleanPhone = formatWhatsAppNumber(contactPhone);
    const firstName = contactName.split(' ')[0];

    let messageText = '';

    // Templates contextuais por etapa padrão do funil
    const normalizedStage = stageName.toLowerCase();
    if (normalizedStage.includes('qualificad') || normalizedStage.includes('contato')) {
      messageText = `Olá, *${firstName}*! 🚀 Tudo bem?\n\nRecebemos seu interesse na mentoria do *Rocket Club*. Seu diagnóstico inicial foi aprovado e nossa equipe entrará em contato em breve para os próximos passos.`;
    } else if (normalizedStage.includes('reuni') || normalizedStage.includes('agendad')) {
      messageText = `Olá, *${firstName}*! ⏰\n\nSua sessão estratégica de diagnóstico com o mentor do *Rocket Club* está confirmada na etapa *${stageName}*. Prepare seus principais indicadores e dúvidas!`;
    } else if (normalizedStage.includes('proposta') || normalizedStage.includes('negocia')) {
      messageText = `Olá, *${firstName}*! 📋\n\nA proposta personalizada para acelerar o seu negócio no *Rocket Club* foi gerada com sucesso. Qualquer dúvida nas condições, estamos à disposição!`;
    } else if (normalizedStage.includes('fechad') || normalizedStage.includes('ganho') || normalizedStage.includes('matriculad')) {
      messageText = `Parabéns, *${firstName}*! 🛸🎉\n\nSeja muito bem-vindo à tropa de elite do *Rocket Club*! Sua vaga na mentoria está 100% confirmada. Nos vemos na sessão de onboarding!`;
    }

    if (messageText) {
      try {
        const res = await sendEvolutionWhatsAppMessage(cleanPhone, messageText);
        whatsappSent = res.success;
      } catch (err) {
        console.warn('[CRM Automation] Falha no WhatsApp:', err);
      }
    }
  }

  // 2. Disparo de Webhook para Hostinger Cloud / n8n / Servidor Próprio (100% Gratuito)
  const webhookUrl =
    process.env.HOSTINGER_WEBHOOK_URL ||
    process.env.N8N_WEBHOOK_URL ||
    process.env.CRM_WEBHOOK_URL;

  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Rocket-Event': 'deal.stage_changed',
        },
        body: JSON.stringify({
          event: 'deal.stage_changed',
          organizationId,
          dealId,
          dealTitle,
          dealValue,
          contact: {
            name: contactName,
            phone: contactPhone,
          },
          stage: stageName,
          timestamp: new Date().toISOString(),
        }),
      });
      webhookSent = response.ok;
    } catch (err) {
      console.warn('[CRM Automation] Falha no Webhook Hostinger/n8n:', err);
    }
  }

  // 3. Notificação In-App em Tempo Real via SSE para a Equipe
  try {
    broadcastNotificationToOrg(organizationId, {
      id: `notif-${Date.now()}`,
      sector: 'crm',
      type: 'success',
      title: `🎯 Oportunidade Avançou: ${stageName}`,
      message: `${contactName} (${dealTitle}) avançou para a etapa "${stageName}" (R$ ${dealValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`,
      link: '/crm',
      actionText: 'Ver Funil CRM',
      createdAt: 'Agora mesmo',
      read: false,
    });
  } catch (err) {
    console.warn('[CRM SSE Broadcast Error]:', err);
  }

  return { whatsappSent, webhookSent };
}
