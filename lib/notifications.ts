export type NotificationSector = 'crm' | 'mentorados' | 'financial' | 'academy' | 'events' | 'wiki';
export type NotificationType = 'info' | 'success' | 'warning' | 'urgent';

export interface NotificationItem {
  id: string;
  sector: NotificationSector;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  actionText?: string;
  createdAt: string;
  read: boolean;
  metadata?: Record<string, any>;
}

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    sector: 'crm',
    type: 'success',
    title: 'Novo Lead High-Ticket Qualificado',
    message: 'Dr. Roberto Vasconcelos (Clínica Dermato Prime) solicitou diagnóstico comercial para o Grupo Diamante (R$ 25.000).',
    link: '/crm',
    actionText: 'Ver no Funil CRM',
    createdAt: 'Há 5 minutos',
    read: false,
  },
  {
    id: 'notif-2',
    sector: 'mentorados',
    type: 'urgent',
    title: 'Alerta de Engajamento: Tripulante em Risco',
    message: 'Fernanda Costa (Costa & Associados) está sem contato há 30 dias na coluna Atenção Urgente. Risco de churn.',
    link: '/mentorados',
    actionText: 'Abrir Ficha do Mentorado',
    createdAt: 'Há 25 minutos',
    read: false,
  },
  {
    id: 'notif-3',
    sector: 'financial',
    type: 'success',
    title: 'Mensalidade Recebida (R$ 15.000,00)',
    message: 'Assinatura anual de Rafael Albuquerque (AI Flow Platform) liquidada com sucesso via transferência.',
    link: '/financial',
    actionText: 'Ver Transação',
    createdAt: 'Há 2 horas',
    read: false,
  },
  {
    id: 'notif-4',
    sector: 'academy',
    type: 'info',
    title: 'Nova Dúvida de Mentorado na Academy',
    message: 'Dra. Patricia comentou na aula "2.1 Script da Reunião de Diagnóstico": Excelente modelo, aguardando feedback.',
    link: '/academy',
    actionText: 'Responder Aula',
    createdAt: 'Há 4 horas',
    read: true,
  },
  {
    id: 'notif-5',
    sector: 'events',
    type: 'warning',
    title: 'Imersão Presencial Mastermind 2026',
    message: 'Atingiu 70% da capacidade total (42/60 vagas confirmadas). Restam apenas 18 convites.',
    link: '/events',
    actionText: 'Gerenciar Vagas',
    createdAt: 'Há 1 dia',
    read: true,
  },
  {
    id: 'notif-6',
    sector: 'mentorados',
    type: 'success',
    title: 'Meta Batida: Mentorado em Escala',
    message: 'Carlos Eduardo Silva atingiu R$ 150.000,00/mês e solicitou mentoria 1-on-1 para estruturação de franquia.',
    link: '/mentorados',
    actionText: 'Ver Mentorado',
    createdAt: 'Há 2 dias',
    read: true,
  },
];
