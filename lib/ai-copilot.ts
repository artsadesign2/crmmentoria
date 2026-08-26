/**
 * Rocket AI Co-Pilot & Diagnosticador Estratégico 360°
 * Analisa os 5 Pilares Rocket, faturamento e gargalos para gerar planos de aceleração de alta precisão.
 */

export interface PillarScore {
  pillar: string;
  score: number; // 1 to 10
  status: 'critical' | 'attention' | 'good' | 'master';
}

export interface ActionItem {
  id: string;
  title: string;
  category: 'Oferta' | 'Tráfego' | 'Comercial' | 'CS/LTV' | 'Gestão';
  priority: 'alta' | 'média' | 'baixa';
  xpReward: number;
  timeframe: string;
  description: string;
  recommendedLesson?: {
    id: string;
    title: string;
    course: string;
  };
}

export interface DiagnosisReport {
  menteeId: string;
  menteeName: string;
  companyName: string;
  maturityScore: number; // 0 to 100%
  level: string;
  executiveSummary: string;
  primaryBottleneck: string;
  strengths: string[];
  vulnerabilities: string[];
  pillarsAssessment: PillarScore[];
  actionPlan30Days: ActionItem[];
  generatedAt: string;
}

export function generateRocketAiDiagnosis(params: {
  menteeId: string;
  menteeName: string;
  companyName: string;
  monthlyRevenue?: string;
  mainGoal?: string;
  biggestChallenge?: string;
  specialty?: string;
  pillarScores?: Record<string, number>;
}): DiagnosisReport {
  const {
    menteeId,
    menteeName,
    companyName,
    monthlyRevenue = 'R$ 50k - R$ 100k',
    mainGoal = 'Escalar operação e formar equipe comercial de alta performance',
    biggestChallenge = 'Gargalo no fechamento de vendas e consistência na geração de leads qualificados',
    specialty = 'Negócios Digitais & Serviços',
    pillarScores = {},
  } = params;

  // Compute pillar scores
  const p1 = pillarScores['oferta'] ?? 8.0;
  const p2 = pillarScores['trafego'] ?? 6.5;
  const p3 = pillarScores['comercial'] ?? 7.0;
  const p4 = pillarScores['cs'] ?? 8.5;
  const p5 = pillarScores['gestao'] ?? 6.0;

  const avg = (p1 + p2 + p3 + p4 + p5) / 5;
  const maturityScore = Math.round(avg * 10);

  let level = 'Comandante Rocket (Nível 2 - Tração)';
  if (maturityScore >= 85) level = 'Almirante de Frota (Nível 4 - Escala High Ticket)';
  else if (maturityScore >= 70) level = 'Comandante Rocket (Nível 3 - Consolidação)';
  else if (maturityScore < 50) level = 'Cadete Espacial (Nível 1 - Fundação)';

  const pillarsAssessment: PillarScore[] = [
    {
      pillar: '1. Oferta & Posicionamento High Ticket',
      score: p1,
      status: p1 >= 8 ? 'master' : p1 >= 7 ? 'good' : p1 >= 5 ? 'attention' : 'critical',
    },
    {
      pillar: '2. Tráfego, Funis & Aquisição de Leads',
      score: p2,
      status: p2 >= 8 ? 'master' : p2 >= 7 ? 'good' : p2 >= 5 ? 'attention' : 'critical',
    },
    {
      pillar: '3. Comercial, SDR & Taxa de Fechamento',
      score: p3,
      status: p3 >= 8 ? 'master' : p3 >= 7 ? 'good' : p3 >= 5 ? 'attention' : 'critical',
    },
    {
      pillar: '4. Entrega, CS & LTV do Cliente',
      score: p4,
      status: p4 >= 8 ? 'master' : p4 >= 7 ? 'good' : p4 >= 5 ? 'attention' : 'critical',
    },
    {
      pillar: '5. Gestão, Processos & Governança',
      score: p5,
      status: p5 >= 8 ? 'master' : p5 >= 7 ? 'good' : p5 >= 5 ? 'attention' : 'critical',
    },
  ];

  const actionPlan30Days: ActionItem[] = [
    {
      id: 'act-1',
      title: 'Estruturação do Script de Diagnóstico e Qualificação (SDR)',
      category: 'Comercial',
      priority: 'alta',
      xpReward: 350,
      timeframe: 'Semana 1',
      description:
        'Criar matriz de qualificação BANT para filtrar curiosos antes da reunião de fechamento, elevando a taxa de conversão.',
      recommendedLesson: {
        id: 'ls-sales-101',
        title: 'Construção de Máquinas de Vendas High Ticket',
        course: 'Rocket Academy - Módulo Comercial',
      },
    },
    {
      id: 'act-2',
      title: 'Validação de 4 Criativos com Ângulo de Quebra de Objeção',
      category: 'Tráfego',
      priority: 'alta',
      xpReward: 250,
      timeframe: 'Semana 2',
      description:
        'Gravar e colocar para rodar vídeos diretos focados nos principais gargalos do avatar, reduzindo o CPL.',
      recommendedLesson: {
        id: 'ls-ads-202',
        title: 'Tráfego Perpétuo para Escala Previsível',
        course: 'Rocket Academy - Tráfego & Funis',
      },
    },
    {
      id: 'act-3',
      title: 'Implementação de DRE Gerencial & Metas Semanais da Equipe',
      category: 'Gestão',
      priority: 'média',
      xpReward: 300,
      timeframe: 'Semana 3 e 4',
      description:
        'Documentar custos fixos, CAC e LTV para liberar orçamento seguro de reinvestimento em novos canais.',
      recommendedLesson: {
        id: 'ls-mgmt-303',
        title: 'Governança e Finanças para Escala de 7 Dígitos',
        course: 'Rocket Academy - Gestão & Escala',
      },
    },
  ];

  return {
    menteeId,
    menteeName,
    companyName,
    maturityScore,
    level,
    executiveSummary: `A operação da ${companyName} sob a liderança de ${menteeName} apresenta excelente consistência de entrega e oferta validada. O principal acelerador de curto prazo está na separação dos papéis de Prospecção (SDR) e Fechamento (Closer) para desbloquear a meta de ${mainGoal}.`,
    primaryBottleneck: biggestChallenge,
    strengths: [
      'Proposta de valor diferenciada e forte autoridade técnica no nicho.',
      'Excelente satisfação de entrega e retenção de clientes atuais.',
      'Engajamento ativo nas imersões e direcionamentos do Rocket Club.',
    ],
    vulnerabilities: [
      'Centralização excessiva das negociações comerciais no próprio fundador.',
      'Dependência de indicações orgânicas ou canais únicos de tráfego.',
      'Necessidade de acompanhamento contínuo de métricas financeiras (CAC e LTV).',
    ],
    pillarsAssessment,
    actionPlan30Days,
    generatedAt: new Date().toISOString(),
  };
}
