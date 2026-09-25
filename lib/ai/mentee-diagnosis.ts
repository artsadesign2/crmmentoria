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
}

export function generateMenteeDiagnosis(member: Partial<Member>): MenteeDiagnosisReport {
  // Parse faturamento atual com robustez
  let currentRev = 0;
  if (typeof member.monthlyRevenue === 'string') {
    const digitsOnly = member.monthlyRevenue.replace(/[^\d]/g, '');
    if (digitsOnly) {
      // Se tiver centavos implícitos ou formato normal
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

  if (member.biggestChallenge && member.biggestChallenge.trim().length > 10) {
    bottlenecks.push(`Desafio Central: "${member.biggestChallenge.trim()}"`);
  }

  if (currentRev < 30000) {
    bottlenecks.push('Gargalo na geração e qualificação de leads diários.');
    bottlenecks.push('Falta de script de vendas estruturado para contornar objeções de preço.');
    bottlenecks.push('Dependência de indicações orgânicas sem canal de aquisição previsível.');

    scriptQuestions.push(`1. Qual é o seu CPL (Custo por Lead) atual e quantas reuniões de fechamento seu time realizou nos últimos 7 dias?`);
    scriptQuestions.push(`2. Como você está apresentando sua oferta hoje e qual é a principal objeção que impede o fechamento imediato?`);
    scriptQuestions.push(`3. O que falta para você atingir a meta de curto prazo de ${targetFormatted}?`);

    deliverables.push('Implementar o SOP de Prospecção Ativa da Wiki do Rocket Club.');
    deliverables.push('Ajustar o script de qualificação de SDR para elevar a taxa de comparecimento nas reuniões.');
    deliverables.push('Configurar o CRM para registrar motivos de perda em cada oportunidade.');
  } else if (currentRev < 100000) {
    bottlenecks.push('Centralização operacional no fundador (sobrecarga de entregas diárias).');
    bottlenecks.push('Ausência de uma oferta High-Ticket (ticket acima de R$ 10k) para elevar o LTV.');
    bottlenecks.push('Taxa de conversão oscilante por falta de processos comerciais padronizados.');

    scriptQuestions.push(`1. Quais atividades da sua operação hoje poderiam ser delegadas para liberar 10 horas semanais de estratégia?`);
    scriptQuestions.push(`2. Qual é a estrutura da sua oferta mais cara atualmente e como podemos empacotar um programa de maior valor?`);
    scriptQuestions.push(`3. Como está a retenção e taxa de recompra/renovação dos seus clientes atuais?`);

    deliverables.push('Criar matriz de delegação operacional e contratar/treinar um assistente executivo.');
    deliverables.push('Desenhar a oferta High-Ticket de mentoria/consultoria com margem de 80%+.');
    deliverables.push('Ativar o bot de WhatsApp para qualificação automática no pré-atendimento.');
  } else {
    bottlenecks.push('Estruturação de lideranças e governança para sustentar escala sem perda de qualidade.');
    bottlenecks.push('Otimização tributária e gestão de fluxo de caixa para expansão.');
    bottlenecks.push('Construção de ecossistema de produtos recorrentes (MRR/LTV).');

    scriptQuestions.push(`1. Quais são as métricas de CAC, LTV e Churn do último trimestre?`);
    scriptQuestions.push(`2. Como está o plano de sucessão ou formação de novos líderes nos departamentos?`);
    scriptQuestions.push(`3. Qual canal de aquisição ainda não foi explorado no seu nicho?`);

    deliverables.push('Estruturar programa de formação interna de líderes e gestores de tráfego/vendas.');
    deliverables.push('Implementar painel de DRE mensal e conciliação bancária automatizada.');
    deliverables.push('Modelar novo formato de imersão presencial ou franquia para os próximos 6 meses.');
  }

  const company = member.companyName || member.tradeName || 'Operação Individual';
  const niche = member.specialty || 'Geral';
  const summaryExecutive = `Mentorado ${member.name || 'Membro'} (${company} - Nicho: ${niche}). Faturamento atual de ${currentFormatted} para uma meta de ${targetFormatted} (gap de ${gapFormatted}). Apresenta Score de Saúde de ${healthScore}% com risco de churn ${churnRisk}. Foco prioritário recomendado: resolução de gargalos operacionais e aceleração de conversão no funil comercial.`;

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
  };
}
