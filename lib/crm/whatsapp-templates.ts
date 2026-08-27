/**
 * Modelos de mensagem do disparo rápido de WhatsApp.
 *
 * É texto de negócio, escrito para a operação comercial do Rocket Club, e foi
 * preservado palavra por palavra do que já existia na tela do CRM.
 */
export const WHATSAPP_TEMPLATES = [
  {
    id: 'diag',
    title: '1. Diagnóstico & Convite de Sessão',
    text: (name: string, company: string) =>
      `Olá ${name}! Aqui é da equipe executiva do Rocket Club. Analisamos o perfil da ${company} e identificamos um grande potencial de escala. Quando você tem 20 minutos para uma sessão de alinhamento com nosso Comandante? 🚀`,
  },
  {
    id: 'pitch',
    title: '2. Envio do Book Executivo',
    text: (name: string, company: string) =>
      `Olá ${name}! Segue o material executivo e a esteira de aceleração do Rocket Club preparada para a ${company}. Fique à vontade para conferir os cases de sucesso e o formato das imersões: https://rocketclub.com.br/apresentacao`,
  },
  {
    id: 'followup',
    title: '3. Follow-up de Proposta',
    text: (name: string, company: string) =>
      `Olá ${name}, tudo bem? Passando para saber se você conseguiu avaliar a proposta de mentoria para a ${company} e se deseja tirar alguma dúvida antes de fecharmos as vagas do lote atual.`,
  },
  {
    id: 'closing',
    title: '4. Boas-Vindas & Onboarding',
    text: (name: string, company: string) =>
      `Parabéns ${name}! 🎉 É uma honra ter a ${company} na tripulação Rocket Club! Seu acesso à plataforma e à Academy foi liberado. Vamos dar início ao seu onboarding. 🚀✨`,
  },
];
