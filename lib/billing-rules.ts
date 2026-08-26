/**
 * Motor de Régua de Cobrança Inteligente & WhatsApp Scheduler
 * Dispara mensagens amigáveis com Pix Copia e Cola nos prazos: D-3 (Lembrete), D-0 (Vencimento) e D+3 (Follow-up)
 * Totalmente seguro com interceptação para 5511995302672 em modo de teste.
 */

import { sendEvolutionWhatsAppMessage } from '@/lib/evolution-api';

export interface BillingRuleSchedule {
  id: string;
  triggerType: 'BEFORE_DUE_3' | 'DUE_DAY' | 'AFTER_DUE_3';
  title: string;
  template: string;
  enabled: boolean;
  time: string; // Ex: '09:00'
}

export const DEFAULT_BILLING_RULES: BillingRuleSchedule[] = [
  {
    id: 'rule-d3',
    triggerType: 'BEFORE_DUE_3',
    title: 'Lembrete Amigável (3 dias antes)',
    template:
      'Olá, {{nome}}! Tudo bem? Passando para lembrar que a mensalidade do Rocket Club vence em 3 dias ({{data_vencimento}}). Para facilitar o seu planejamento, segue o Pix Copia e Cola: {{pix_code}} 🚀',
    enabled: true,
    time: '09:30',
  },
  {
    id: 'rule-d0',
    triggerType: 'DUE_DAY',
    title: 'Dia do Vencimento (D-0)',
    template:
      'Fala, {{nome}}! Hoje é o dia de renovação do seu ciclo no Rocket Club ({{data_vencimento}}). Segue o código Pix para quitação instantânea: {{pix_code}}. Qualquer dúvida estamos à disposição!',
    enabled: true,
    time: '10:00',
  },
  {
    id: 'rule-d3-after',
    triggerType: 'AFTER_DUE_3',
    title: 'Aviso Cordial de Suporte (3 dias após)',
    template:
      'Olá, {{nome}}! Notamos que a sua mensalidade com vencimento em {{data_vencimento}} ainda consta em aberto no sistema. Houve algum problema operacional com o pagamento? Segue a 2ª via do Pix: {{pix_code}}',
    enabled: true,
    time: '14:00',
  },
];

export async function executeBillingRuleDispatch(params: {
  ruleId: string;
  recipientPhone: string;
  menteeName: string;
  amount: number;
  dueDate: string;
  pixCode: string;
}) {
  const rule = DEFAULT_BILLING_RULES.find((r) => r.id === params.ruleId) || DEFAULT_BILLING_RULES[0];
  
  let formattedMessage = rule.template
    .replace(/\{\{nome\}\}/g, params.menteeName)
    .replace(/\{\{data_vencimento\}\}/g, params.dueDate)
    .replace(/\{\{valor\}\}/g, `R$ ${params.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
    .replace(/\{\{pix_code\}\}/g, params.pixCode || '00020126580014BR.GOV.BCB.PIX0136rocketclub-pix-demo');

  const result = await sendEvolutionWhatsAppMessage(params.recipientPhone, formattedMessage);
  return {
    success: result.success,
    message: formattedMessage,
    isTestRedirected: result.isTestRedirected,
    error: result.error,
  };
}
