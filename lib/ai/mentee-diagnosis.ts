import { Member } from '@/lib/mock-data';

export interface MenteeDiagnosisReport {
  healthScore: number;
  churnRisk: 'BAIXO' | 'MÉDIO' | 'ALTO';
  revenueGap: string;
  currentRevenueFormatted: string;
  targetRevenueFormatted: string;
  keyBottlenecks: string[];
  meetingScriptQuestions: string[];
  recommendedDeliverables: string[];
  summaryExecutive: string;
  executionCapacity: string;
}

export function generateMenteeDiagnosis(member: Partial<Member>): MenteeDiagnosisReport {
  // Parse faturamento atual com robustez
  let currentRev = 0;
  if (typeof member.monthlyRevenue === 'string') {
    const digitsOnly = member.monthlyRevenue.replace(/[^\d]/g, '');
    if (digitsOnly) {
      const num = parseInt(digitsOnly, 10);
      currentRev = member.monthlyRevenue.includes(',') ? num / 100 : num;
    }
  }

  // Define target baseado no objetivo ou estágio
  let targetRev = currentRev > 0 ? (currentRev < 50000 ? currentRev * 2.5 : currentRev * 1.8) : 100000;
  if (targetRev < 50000) targetRev = 50000;

  const gap = Math.max(0, targetRev - currentRev);

  // Calcula Score de Saúde do Mentorado baseado no status
  let healthScore = 75;
  let churnRisk: 'BAIXO' | 'MÉDIO' | 'ALTO' = 'BAIXO';

  switch (member.status) {
    case 'vermelha':
      healthScore = 40;
      churnRisk = 'ALTO';
      break;
    case 'amarelo':
      healthScore = 65;
      churnRisk = 'MÉDIO';
      break;
    case 'cinza':
      healthScore = 80;
      churnRisk = 'BAIXO'; // Onboarding / Integração
      break;
    case 'azul':
      healthScore = 85;
      churnRisk = 'BAIXO';
      break;
    case 'verde':
      healthScore = 90;
      churnRisk = 'BAIXO';
      break;
    case 'ouro':
      healthScore = 95;
      churnRisk = 'BAIXO';
      break;
    case 'diamante':
      healthScore = 98;
      churnRisk = 'BAIXO';
      break;
    default:
      healthScore = 75;
      churnRisk = 'BAIXO';
  }

  const gapFormatted = gap.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const currentFormatted = currentRev > 0 
    ? currentRev.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'Não declarado (estimado < R$ 30k)';
  const targetFormatted = targetRev.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const bottlenecks: string[] = [];
  const scriptQuestions: string[] = [];
  const deliverables: string[] = [];

  // Análise dos Desafios Reais
  if (member.biggestChallenge && member.biggestChallenge.trim().length > 5) {
    bottlenecks.push(`Gargalo Prioritário Declarado: "${member.biggestChallenge.trim()}"`);
  }

  if (member.mainGoal && member.mainGoal.trim().length > 5) {
    scriptQuestions.push(`1. Sobre seu objetivo "${member.mainGoal.trim()}": Quais os 2 maiores obstáculos práticos que surgiram nesta semana?`);
  } else {
    scriptQuestions.push(`1. Qual é o principal indicador de resultado (faturamento ou novos clientes) que você precisa destravar esta semana?`);
  }

  if (currentRev < 30000) {
    bottlenecks.push('Volume insuficiente de reuniões comerciais agendadas por semana.');
    bottlenecks.push('Necessidade de estruturar script de fechamento e contorno de objeções.');
    if (!member.biggestChallenge) {
      bottlenecks.push('Dependência de indicações sem canal previsível de tráfego pago ou prospecção ativa.');
    }

    scriptQuestions.push(`2. Como está seu funil de prospecção diário e quantas pessoas demonstraram interesse nos últimos 7 dias?`);
    scriptQuestions.push(`3. O que falta para você acelerar as vendas e alcançar a meta intermediária de ${targetFormatted}?`);

    deliverables.push('Executar o SOP de Prospecção Ativa da Wiki do Rocket Club.');
    deliverables.push('Padronizar o roteiro de qualificação rápida no WhatsApp.');
    deliverables.push('Alinhar oferta principal para ticket mínimo viável de alto impacto.');
  } else if (currentRev < 100000) {
    bottlenecks.push('Sobrecarga operacional do fundador na execução direta dos serviços.');
    bottlenecks.push('Potencial inexplorado para empacotamento de oferta High-Ticket (R$ 10k+).');
    if (!member.biggestChallenge) {
      bottlenecks.push('Oscilação de taxa de conversão por falta de playbook comercial padronizado.');
    }

    scriptQuestions.push(`2. Quais tarefas operacionais poderiam ser delegadas imediatamente para liberar 8h semanais de foco estratégico?`);
    scriptQuestions.push(`3. Qual a possibilidade de criarmos um programa de mentoria ou acompanhamento avançado para seus melhores clientes?`);

    deliverables.push('Construir matriz de delegação operacional e definição de prioridades.');
    deliverables.push('Desenhar a nova oferta High-Ticket com margem de contribuição superior a 80%.');
    deliverables.push('Implementar funil de qualificação automática de leads no WhatsApp.');
  } else {
    bottlenecks.push('Formação e alinhamento de lideranças intermediárias (vendas, operações, tráfego).');
    bottlenecks.push('Otimização da retenção, LTV e ecossistema de esteira de produtos.');
    if (!member.biggestChallenge) {
      bottlenecks.push('Estruturação de processos e governança para expansão acelerada sem perda de qualidade.');
    }

    scriptQuestions.push(`2. Como estão os indicadores de CAC, LTV e margem líquida dos últimos 3 meses?`);
    scriptQuestions.push(`3. Quem na sua equipe hoje está pronto para assumir maior autonomia operacional?`);

    deliverables.push('Estruturar o programa interno de capacitação e metas da liderança.');
    deliverables.push('Implantar rotina semanal de DRE gerencial e métricas de conversão.');
    deliverables.push('Planejar evento presencial ou formato de mentoria em grupo exclusiva.');
  }

  // Se tiver frentes de interesse declaradas
  if (member.mentorshipInterest && member.mentorshipInterest.trim().length > 3) {
    deliverables.push(`Aprofundar diretrizes em "${member.mentorshipInterest.trim()}".`);
  }

  const company = member.companyName || member.tradeName || 'Operação Individual';
  const niche = member.specialty || 'Geral';
  const availability = member.weeklyAvailability || '10 horas semanais';
  
  const summaryExecutive = `Mentorado ${member.name || 'Membro'} (${company} - Nicho: ${niche}). Faturamento atual de ${currentFormatted} com meta projetada de ${targetFormatted} (gap de ${gapFormatted}). Score de Saúde em ${healthScore}% com risco de churn ${churnRisk}. Capacidade de execução informada: ${availability}.`;

  return {
    healthScore,
    churnRisk,
    revenueGap: gapFormatted,
    currentRevenueFormatted: currentFormatted,
    targetRevenueFormatted: targetFormatted,
    keyBottlenecks: bottlenecks,
    meetingScriptQuestions: scriptQuestions,
    recommendedDeliverables: deliverables,
    summaryExecutive,
    executionCapacity: availability,
  };
}
