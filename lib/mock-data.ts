export interface Member {
  id: string;
  name: string;
  specialty: string;
  status: 'cinza' | 'azul' | 'verde' | 'amarelo' | 'vermelha' | 'ouro' | 'diamante';
  lastContact: string;
  notes: string;
  email: string;
  phone: string;
  companyName: string;
  monthlyRevenue: string;
  mainGoal: string;
  avatar?: string;
  coverImage?: string;
  position: number;

  // Restored Personal & Identification Fields
  age?: string;
  birthdate?: string;
  birthplace?: string;
  residence?: string;
  nationality?: string;
  maritalStatus?: string;
  cpf?: string;
  rg?: string;

  // Restored Social Media & Contacts
  instagram?: string;
  linkedin?: string;
  website?: string;
  emergencyContact?: string;

  // Restored Professional & Corporate Fields
  tradeName?: string; // Nome Fantasia
  cnpj?: string;
  professionalRegister?: string; // CRM, CRO, OAB, CREA etc.
  registerPj?: string; // Inscrição Estadual
  municipalRegister?: string;
  commercialAddress?: string;
  professionalExperience?: string;
  workLocations?: string;
  workDescriptionHours?: string;

  // Restored Mentorship Diagnosis & Goals
  biggestChallenge?: string;
  mentorshipInterest?: string;
  weeklyAvailability?: string;
  contentConsumption?: string;
  howDidYouFindUs?: string;

  // Restored Family, Lifestyle & Hobbies
  sportsInfo?: string;
  hobbies?: string;
  interests?: string;
  spouseInfo?: string;
  childrenInfo?: string;
  petsInfo?: string;
}

export interface KanbanColumn {
  id: 'cinza' | 'azul' | 'verde' | 'amarelo' | 'vermelha';
  title: string;
  color: string;
  badge: string;
  members: Member[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  lessonsCount: number;
  durationMinutes: number;
  coverImage: string;
  progressPercent: number;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  department: string;
  viewsCount: number;
  createdAt: string;
  author: string;
}

export interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  category: string;
  description: string;
  date: string;
  status: 'PAID' | 'PENDING';
  memberName?: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  attendeesCount: number;
  maxAttendees: number;
  price: number;
  status: 'UPCOMING' | 'LIVE' | 'FINISHED';
  coverImage?: string;
}

export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'm1',
    name: 'Carlos Eduardo Silva',
    specialty: 'E-commerce & High Ticket Sales',
    status: 'verde',
    lastContact: '2026-08-10',
    notes: 'Bateu meta mensal de R$ 150k. Foco em estruturar equipe de vendas e esteira de produtos.',
    email: 'carlos@silvagroup.com.br',
    phone: '(11) 98765-4321',
    companyName: 'Silva Group Comércio & Serviços LTDA',
    tradeName: 'Silva Group E-com',
    cnpj: '34.567.890/0001-12',
    professionalRegister: 'CRA-SP 142.990',
    monthlyRevenue: 'R$ 150.000,00',
    mainGoal: 'Escalar operação para R$ 500k/mês e automatizar processos comerciais',
    biggestChallenge: 'Contratação e treinamento de closers de alta performance',
    mentorshipInterest: 'Gestão de tráfego de escala, funis perpétuos e liderança',
    weeklyAvailability: '6 a 8 horas por semana',
    howDidYouFindUs: 'Indicação de mentorado do Rocket Club',
    coverImage: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80',
    position: 0,
    age: '38 anos',
    birthdate: '1988-04-15',
    birthplace: 'São Paulo - SP',
    residence: 'São Paulo - SP',
    nationality: 'Brasileiro',
    maritalStatus: 'Casado',
    cpf: '123.456.789-00',
    rg: '28.990.112-X',
    instagram: '@carlossilva.scale',
    linkedin: 'linkedin.com/in/carloseduardosilva',
    website: 'https://silvagroup.com.br',
    commercialAddress: 'Av. Brigadeiro Faria Lima, 3477 - Itaim Bibi, SP',
    professionalExperience: '14 anos no mercado digital e varejo de luxo',
    workLocations: 'São Paulo e Miami',
    workDescriptionHours: 'CEO e Estrategista Chefe (45h semanais)',
    sportsInfo: 'Beach Tennis e Corrida de Rua (5km)',
    hobbies: 'Vinhos artesanais, viagens e leitura sobre biografias de líderes',
    interests: 'Inteligência Artificial, Real Estate e Investimentos Globais',
    spouseInfo: 'Camila Silva (Arquiteta)',
    childrenInfo: '2 filhos (Lucas, 8 anos e Beatriz, 5 anos)',
    petsInfo: '1 Golden Retriever (Thor)',
    emergencyContact: 'Camila Silva - (11) 98888-1234',
  },
  {
    id: 'm2',
    name: 'Dra. Patricia Medeiros',
    specialty: 'Clínicas Odontológicas de Alto Padrão',
    status: 'amarelo',
    lastContact: '2026-08-08',
    notes: 'Reestruturando modelo de vendas de implantes e harmonização. Aguardando feedback da aula 4.',
    email: 'patricia@medeirosodonto.com.br',
    phone: '(21) 99887-1122',
    companyName: 'Medeiros Odontologia Integrada LTDA',
    tradeName: 'Medeiros Prime Clinic',
    cnpj: '45.890.123/0001-99',
    professionalRegister: 'CRO-RJ 48.910',
    monthlyRevenue: 'R$ 80.000,00',
    mainGoal: 'Dobrar faturamento da clínica em 6 meses alcançando R$ 200k/mês',
    biggestChallenge: 'Captação de pacientes particulares para tratamentos de alto valor',
    mentorshipInterest: 'Posicionamento de marca pessoal e atendimento VIP',
    weeklyAvailability: '5 horas por semana',
    howDidYouFindUs: 'Instagram do Comandante',
    coverImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
    position: 1,
    age: '42 anos',
    birthdate: '1984-09-22',
    birthplace: 'Niterói - RJ',
    residence: 'Rio de Janeiro - RJ',
    nationality: 'Brasileira',
    maritalStatus: 'Casada',
    cpf: '234.567.890-11',
    rg: '19.450.887-2',
    instagram: '@dra.patriciamedeiros',
    linkedin: 'linkedin.com/in/dra-patricia-medeiros',
    website: 'https://medeirosodonto.com.br',
    commercialAddress: 'Av. das Américas, 4200 - Barra da Tijuca, RJ',
    professionalExperience: '18 anos de atuação clínica e gestão de consultórios',
    workLocations: 'Barra da Tijuca e Ipanema',
    workDescriptionHours: 'Diretora Clínica e Cirurgiã (35h semanais)',
    sportsInfo: 'Pilates e Natação',
    hobbies: 'Gastronomia, fotografia e violino',
    interests: 'Estética avançada, Neurociência aplicada ao atendimento',
    spouseInfo: 'Dr. Rodrigo Medeiros (Médico)',
    childrenInfo: '1 filha (Helena, 10 anos)',
    petsInfo: 'Nenhum',
    emergencyContact: 'Rodrigo Medeiros - (21) 99111-2233',
  },
  {
    id: 'm3',
    name: 'Roberto Alcantara',
    specialty: 'Infoprodutos & Lançamentos Milionários',
    status: 'azul',
    lastContact: '2026-08-12',
    notes: 'Iniciou mentoria neste mês. Já completou o módulo 1 e agendou diagnóstico de funil.',
    email: 'roberto@scaleagency.com',
    phone: '(31) 98765-0011',
    companyName: 'Alcantara Digital Growth LTDA',
    tradeName: 'Scale Agency',
    cnpj: '28.112.334/0001-45',
    monthlyRevenue: 'R$ 95.000,00',
    mainGoal: 'Construir esteira perpétua de produtos de R$ 997 a R$ 15.000',
    biggestChallenge: 'Estabilizar receita recorrente e diminuir dependência de lançamentos pontuais',
    mentorshipInterest: 'Copywriting para High Ticket e Gestão de Comunidades',
    weeklyAvailability: '10 horas por semana',
    howDidYouFindUs: 'Imersão Presencial Rocket Club 2025',
    coverImage: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80',
    position: 2,
    age: '31 anos',
    birthdate: '1995-11-03',
    birthplace: 'Belo Horizonte - MG',
    residence: 'Belo Horizonte - MG',
    nationality: 'Brasileiro',
    maritalStatus: 'Solteiro',
    cpf: '345.678.901-22',
    instagram: '@roberto.alcantara',
    linkedin: 'linkedin.com/in/robertoalcantara',
    website: 'https://scaleagency.com',
    commercialAddress: 'Rua Paraíba, 1000 - Savassi, Belo Horizonte - MG',
    professionalExperience: '8 anos no mercado de infoprodutos',
    sportsInfo: 'Musculação e Futebol',
    hobbies: 'Games, viagens e podcasts de tecnologia',
    interests: 'SaaS, Growth Hacking e Web3',
  },
  {
    id: 'm4',
    name: 'Juliana Fagundes',
    specialty: 'Educação Executiva & Treinamentos Corporativos',
    status: 'cinza',
    lastContact: '2026-08-01',
    notes: 'Aguardando envio do formulário de diagnóstico aprofundado.',
    email: 'juliana@fagundesconsultoria.com.br',
    phone: '(41) 99776-5544',
    companyName: 'Fagundes Consultoria & Liderança LTDA',
    tradeName: 'Fagundes Executive',
    cnpj: '19.887.654/0001-80',
    monthlyRevenue: 'R$ 60.000,00',
    mainGoal: 'Transicionar do modelo de consultoria horária para mentorias em grupo',
    biggestChallenge: 'Precificação e posicionamento institucional',
    mentorshipInterest: 'Formatos de entrega escaláveis',
    coverImage: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80',
    position: 3,
    age: '45 anos',
    birthdate: '1981-06-18',
    birthplace: 'Curitiba - PR',
    residence: 'Curitiba - PR',
    nationality: 'Brasileira',
    maritalStatus: 'Divorciada',
    instagram: '@julianafagundes.oficial',
    linkedin: 'linkedin.com/in/julianafagundes',
    sportsInfo: 'Yoga e Caminhada',
    hobbies: 'Jardinagem, literatura clássica e teatro',
    interests: 'Liderança Humanizada e Psicologia Organizacional',
  },
  {
    id: 'm5',
    name: 'Marcos Vinicius Rezende',
    specialty: 'Franquias & Expansão de Negócios Físicos',
    status: 'vermelha',
    lastContact: '2026-07-25',
    notes: 'Falta de engajamento nas últimas 2 semanas. Alerta de risco acionado pelo time de suporte.',
    email: 'marcos@rezendefranquias.com.br',
    phone: '(19) 98112-9988',
    companyName: 'Rezende Franchising & Expansão S/A',
    tradeName: 'Rezende Franquias',
    cnpj: '11.223.344/0001-55',
    monthlyRevenue: 'R$ 280.000,00',
    mainGoal: 'Estruturar conselho consultivo e abrir 15 novas unidades franqueadas',
    biggestChallenge: 'Gestão de tempo e delegação de tarefas operacionais',
    coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    position: 4,
    age: '50 anos',
    birthdate: '1976-02-28',
    birthplace: 'Campinas - SP',
    residence: 'Campinas - SP',
    maritalStatus: 'Casado',
    instagram: '@marcosrezende.expansao',
    sportsInfo: 'Tênis e Ciclismo',
    hobbies: 'Carros clássicos e charutos',
  },
];

export const KANBAN_STAGES: { id: Member['status']; title: string; color: string; badge: string }[] = [
  { id: 'cinza', title: '1. Não Alocado', color: 'slate', badge: 'bg-slate-500' },
  { id: 'azul', title: '2. Iniciante / Onboarding', color: 'blue', badge: 'bg-blue-500' },
  { id: 'verde', title: '3. Engajado / Na Meta', color: 'emerald', badge: 'bg-emerald-500' },
  { id: 'amarelo', title: '4. Morno / Atenção', color: 'amber', badge: 'bg-amber-500' },
  { id: 'vermelha', title: '5. Risco / Urgente', color: 'red', badge: 'bg-red-500' },
];

export const MOCK_COURSES: Course[] = [
  {
    id: 'c1',
    title: 'Mentoria & Negócios High-Ticket',
    description: 'Aprenda a estruturar, precificar e vender produtos de R$ 5.000 a R$ 50.000 com funis de conversão.',
    category: 'Vendas & Negócios',
    level: 'Avançado',
    lessonsCount: 14,
    durationMinutes: 280,
    coverImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
    progressPercent: 75,
  },
  {
    id: 'c2',
    title: 'Comercial & Fechamento em Reuniões',
    description: 'Roteiros práticos de diagnóstico, contorno de objeções complexas e scripts de fechamento ao vivo.',
    category: 'Comercial',
    level: 'Intermediário',
    lessonsCount: 10,
    durationMinutes: 180,
    coverImage: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80',
    progressPercent: 40,
  },
  {
    id: 'c3',
    title: 'Liderança & Gestão de Equipes Autogerenciáveis',
    description: 'Como contratar profissionais de alta performance, delegar com eficiência e criar cultura de resultados.',
    category: 'Gestão',
    level: 'Master',
    lessonsCount: 12,
    durationMinutes: 220,
    coverImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
    progressPercent: 10,
  },
  {
    id: 'c4',
    title: 'Posicionamento & Branding Executivo de Alto Padrão',
    description: 'Transforme sua autoridade em ímã de clientes premium e construa uma marca pessoal inconfundível.',
    category: 'Marketing',
    level: 'Avançado',
    lessonsCount: 8,
    durationMinutes: 150,
    coverImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    progressPercent: 0,
  },
];

export const MOCK_ARTICLES: Article[] = [
  {
    id: 'a1',
    title: 'SOP — Script Padrão de Reunião de Fechamento High Ticket',
    summary: 'Roteiro validado passo a passo de 45 minutos para qualificação e conversão.',
    content: 'O processo se divide em 4 etapas: Conexão, Diagnóstico da Dor, Apresentação da Solução e Fechamento.',
    category: 'Comercial',
    department: 'Comercial',
    viewsCount: 420,
    createdAt: '2026-08-01',
    author: 'Comandante Master',
  },
  {
    id: 'a2',
    title: 'Diretriz de Atendimento ao Mentorado e Onboarding',
    summary: 'Procedimentos de acolhimento e parametrização nos primeiros 7 dias.',
    content: 'Todo novo mentorado deve receber o kit de boas-vindas e acesso ao portal em até 2 horas úteis.',
    category: 'Operacional',
    department: 'Operacional',
    viewsCount: 290,
    createdAt: '2026-08-05',
    author: 'Equipe Sucesso do Cliente',
  },
  {
    id: 'a3',
    title: 'Regulamento Financeiro & Emissão de Notas Fiscais',
    summary: 'Critérios contábeis para cobrança de mensalidades e emissão de NF-e.',
    content: 'As notas fiscais de serviço devem ser geradas no dia 05 de cada mês correspondente.',
    category: 'Financeiro',
    department: 'Financeiro',
    viewsCount: 180,
    createdAt: '2026-08-08',
    author: 'Controladoria',
  },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', type: 'INCOME', amount: 15000, category: 'Mentoria Anual', description: 'Mensalidade Mentorado Carlos Silva', date: '2026-08-15', status: 'PAID', memberName: 'Carlos Eduardo Silva' },
  { id: 't2', type: 'INCOME', amount: 20000, category: 'Mentoria Anual', description: 'Contrato Novo Dra. Patricia', date: '2026-08-14', status: 'PAID', memberName: 'Dra. Patricia Medeiros' },
  { id: 't3', type: 'EXPENSE', amount: 4500, category: 'Tecnologia & Servidores', description: 'Infraestrutura Cloud & Neon DB', date: '2026-08-10', status: 'PAID' },
  { id: 't4', type: 'INCOME', amount: 18000, category: 'Imersão Presencial', description: 'Ingresso VIP Roberto Alcantara', date: '2026-08-09', status: 'PAID', memberName: 'Roberto Alcantara' },
  { id: 't5', type: 'EXPENSE', amount: 3200, category: 'Marketing & Tráfego', description: 'Campanha de Novos Leads Instagram', date: '2026-08-08', status: 'PAID' },
];

export const MOCK_EVENTS: EventItem[] = [
  {
    id: 'e1',
    title: 'Imersão Presencial Rocket Mastermind 2026',
    description: '2 dias de imersão presencial intensiva com hotseats, networking executivo e palestras internacionais.',
    location: 'Hotel Unique — São Paulo, SP',
    date: '2026-10-24',
    attendeesCount: 42,
    maxAttendees: 50,
    price: 5000,
    status: 'UPCOMING',
    coverImage: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'e2',
    title: 'Hotseat Estratégico Online de Alinhamento',
    description: 'Sessão ao vivo de resolução de gargalos operacionais e análise de propostas comerciais de mentorados.',
    location: 'Sala Virtual Exclusiva (Zoom)',
    date: '2026-09-05',
    attendeesCount: 38,
    maxAttendees: 60,
    price: 0,
    status: 'UPCOMING',
    coverImage: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80',
  },
];

export interface LeadLog {
  id: string;
  type: 'call' | 'whatsapp' | 'meeting' | 'email' | 'note';
  title: string;
  description: string;
  createdAt: string;
  author: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  specialty: string;
  email: string;
  phone: string;
  source: 'Instagram' | 'Indicação' | 'Tráfego Pago' | 'Evento Presencial' | 'WhatsApp Direct' | 'Outros';
  estimatedValue: number;
  stage: 'novo' | 'qualificacao' | 'proposta' | 'negociacao' | 'ganho' | 'perdido';
  priority: 'alta' | 'media' | 'baixa';
  notes: string;
  lastContact: string;
  createdAt: string;
  assignedTo?: string;
  // Qualification & Diagnostic Fields
  currentRevenue?: string;
  teamSize?: string;
  mainBottleneck?: string;
  targetGoal?: string;
  hasPartners?: string;
  urgencyLevel?: 'imediato' | '30_dias' | 'pesquisando';
  cityState?: string;
  role?: string;
  lossReason?: string;
  timelineLogs?: LeadLog[];
}

export const LEAD_STAGES: { id: Lead['stage']; title: string; badge: string; color: string }[] = [
  { id: 'novo', title: '1. Novos Leads', badge: 'bg-blue-500', color: '#3B82F6' },
  { id: 'qualificacao', title: '2. Em Qualificação', badge: 'bg-amber-500', color: '#F59E0B' },
  { id: 'proposta', title: '3. Proposta Enviada', badge: 'bg-purple-500', color: '#A855F7' },
  { id: 'negociacao', title: '4. Negociação / Fechamento', badge: 'bg-orange-500', color: '#F97316' },
  { id: 'ganho', title: '5. Ganhos (Convertidos)', badge: 'bg-emerald-500', color: '#10B981' },
];

export const MOCK_LEADS: Lead[] = [
  {
    id: 'lead-1',
    name: 'Dr. Fernando Albuquerque',
    company: 'Clínica Albuquerque Dermatologia',
    specialty: 'Dermatologia & Procedimentos High-End',
    email: 'fernando@albuquerquedermo.com.br',
    phone: '(11) 98711-2233',
    source: 'Instagram',
    estimatedValue: 25000,
    stage: 'proposta',
    priority: 'alta',
    notes: 'Tem 2 unidades em SP, faturando R$ 180k/mês. Quer mentoria para abrir franquia de estética e estruturar funil perpétuo de captação.',
    lastContact: '2026-08-22',
    createdAt: '2026-08-15',
    assignedTo: 'Comandante Master',
    currentRevenue: 'R$ 180.000,00/mês',
    teamSize: '12 colaboradores',
    mainBottleneck: 'Falta de processos comerciais estruturados e dependência da presença médica para fechamentos',
    targetGoal: 'Atingir R$ 500k/mês e expandir para 4 unidades no modelo de licenciamento',
    hasPartners: 'Sim (1 sócia administradora que participará da decisão final)',
    urgencyLevel: 'imediato',
    cityState: 'São Paulo - SP',
    role: 'Médico Proprietário & Diretor Clínico',
    timelineLogs: [
      {
        id: 'log-1',
        type: 'meeting',
        title: 'Sessão Estratégica de Diagnóstico',
        description: 'Reunião de 45 minutos no Zoom. Apresentada esteira de mentoria anual com imersões presenciais.',
        createdAt: '2026-08-22 15:30',
        author: 'Comandante Master',
      },
      {
        id: 'log-2',
        type: 'whatsapp',
        title: 'Envio do Book Executivo e Proposta',
        description: 'Enviada apresentação personalizada e link de pagamento da entrada.',
        createdAt: '2026-08-21 11:00',
        author: 'Agente IA WhatsApp',
      },
      {
        id: 'log-3',
        type: 'call',
        title: 'Primeiro Contato de Qualificação SDR',
        description: 'Lead atendeu prontamente. Confirmou faturamento e alinhou expectativas de investimento.',
        createdAt: '2026-08-16 10:15',
        author: 'Equipe Comercial',
      },
    ],
  },
  {
    id: 'lead-2',
    name: 'Mariana Duarte',
    company: 'Duarte Joias Contemporâneas',
    specialty: 'E-commerce D2C Joalheria',
    email: 'mariana@duartejoias.com',
    phone: '(21) 99122-3344',
    source: 'Indicação',
    estimatedValue: 18000,
    stage: 'qualificacao',
    priority: 'alta',
    notes: 'Indicada pelo mentorado Carlos Silva. Faturamento R$ 90k/mês. Quer ajuda em tráfego de escala, esteira de produtos e branding de luxo.',
    lastContact: '2026-08-23',
    createdAt: '2026-08-16',
    assignedTo: 'Comandante Master',
    currentRevenue: 'R$ 90.000,00/mês',
    teamSize: '6 colaboradores',
    mainBottleneck: 'ROAS oscilando no Meta Ads e retenção baixa de clientes recorrentes',
    targetGoal: 'Bater R$ 250k/mês com foco em clientes de alto poder aquisitivo',
    hasPartners: 'Não (100% proprietária)',
    urgencyLevel: 'imediato',
    cityState: 'Rio de Janeiro - RJ',
    role: 'CEO & Diretora Criativa',
    timelineLogs: [
      {
        id: 'log-201',
        type: 'whatsapp',
        title: 'Agendamento de Call Confirmado',
        description: 'Call de qualificação marcada para amanhã às 14h.',
        createdAt: '2026-08-23 16:45',
        author: 'Agente IA WhatsApp',
      },
      {
        id: 'log-202',
        type: 'note',
        title: 'Indicação de Alto Valor',
        description: 'Carlos Silva enviou o contato pessoalmente elogiando a determinação da fundadora.',
        createdAt: '2026-08-16 14:00',
        author: 'Comandante Master',
      },
    ],
  },
  {
    id: 'lead-3',
    name: 'Lucas Barreto',
    company: 'Barreto Advogados Associados',
    specialty: 'Direito Tributário Empresarial',
    email: 'lucas@barretoadv.com.br',
    phone: '(31) 99888-7766',
    source: 'Tráfego Pago',
    estimatedValue: 30000,
    stage: 'novo',
    priority: 'media',
    notes: 'Escritório com 15 advogados. Quer posicionamento institucional para atrair empresas de médio porte e contratos recorrentes.',
    lastContact: '2026-08-24',
    createdAt: '2026-08-24',
    assignedTo: 'Comandante Master',
    currentRevenue: 'R$ 140.000,00/mês',
    teamSize: '15 colaboradores',
    mainBottleneck: 'Dificuldade em vender honorários consultivos fixos mensais',
    targetGoal: 'Dobrar carteira de clientes PJ de médio/grande porte',
    hasPartners: 'Sim (3 sócios nominais)',
    urgencyLevel: '30_dias',
    cityState: 'Belo Horizonte - MG',
    role: 'Sócio Fundador',
    timelineLogs: [
      {
        id: 'log-301',
        type: 'whatsapp',
        title: 'Boas-vindas Automáticas Disparadas',
        description: 'Mensagem de boas-vindas e formulário de diagnóstico enviados via WhatsApp.',
        createdAt: '2026-08-24 09:30',
        author: 'Agente IA WhatsApp',
      },
    ],
  },
  {
    id: 'lead-4',
    name: 'Guilherme Siqueira',
    company: 'Nexus Software B2B',
    specialty: 'SaaS para Logística & Frotas',
    email: 'guilherme@nexuslog.io',
    phone: '(41) 98455-6677',
    source: 'Evento Presencial',
    estimatedValue: 40000,
    stage: 'negociacao',
    priority: 'alta',
    notes: 'Conheceu o Rocket Club no evento presencial. Contrato de aceleração em revisão jurídica, fechamento esperado para esta semana.',
    lastContact: '2026-08-23',
    createdAt: '2026-08-10',
    assignedTo: 'Comandante Master',
    currentRevenue: 'R$ 280.000,00/mês (MRR)',
    teamSize: '24 colaboradores',
    mainBottleneck: 'Estruturação de time de Outbound SDRs e expansão Enterprise',
    targetGoal: 'Alcançar R$ 10M ARR e captar rodada Series A',
    hasPartners: 'Sim (2 co-founders)',
    urgencyLevel: 'imediato',
    cityState: 'Curitiba - PR',
    role: 'Co-founder & CEO',
    timelineLogs: [
      {
        id: 'log-401',
        type: 'meeting',
        title: 'Alinhamento Jurídico e Cláusulas Contratuais',
        description: 'Reunião de fechamento com os 3 sócios. Acordo sobre imersões presenciais e mentorias quinzenais.',
        createdAt: '2026-08-23 10:00',
        author: 'Comandante Master',
      },
      {
        id: 'log-402',
        type: 'call',
        title: 'Follow-up de Condições de Pagamento',
        description: 'Definido parcelamento em 12x no cartão corporativo semestral.',
        createdAt: '2026-08-20 17:15',
        author: 'Equipe Comercial',
      },
    ],
  },
  {
    id: 'lead-5',
    name: 'Renata Vasconcellos',
    company: 'RV Odontologia Estética & Harmonização',
    specialty: 'Odontologia de Alto Padrão',
    email: 'contato@renatavasconcellos.odo.br',
    phone: '(19) 99766-5544',
    source: 'Instagram',
    estimatedValue: 22000,
    stage: 'ganho',
    priority: 'alta',
    notes: 'Contrato assinado! Já realizou o pagamento e foi liberada para o Onboarding da Mentoria Rocket Club.',
    lastContact: '2026-08-24',
    createdAt: '2026-08-05',
    assignedTo: 'Comandante Master',
    currentRevenue: 'R$ 120.000,00/mês',
    teamSize: '8 colaboradores',
    mainBottleneck: 'Previsibilidade de vendas de tratamentos de ticket acima de R$ 15k',
    targetGoal: 'Faturar R$ 300k/mês e contratar equipe clínica para liberar tempo',
    hasPartners: 'Não',
    urgencyLevel: 'imediato',
    cityState: 'Campinas - SP',
    role: 'Cirurgiã Dentista & Proprietária',
    timelineLogs: [
      {
        id: 'log-501',
        type: 'meeting',
        title: 'Contrato Assinado & Boas-Vindas 🎉',
        description: 'Mentorada convertida com sucesso. Ficha cadastral aberta para acompanhamento de evolução.',
        createdAt: '2026-08-24 14:00',
        author: 'Comandante Master',
      },
    ],
  },
];
