export interface FeatureFlags {
  crm?: boolean;
  mentorados?: boolean;
  kanban?: boolean;
  academy: boolean;
  wiki: boolean;
  financial: boolean;
  events: boolean;
  whatsapp_automation?: boolean;
  ai_copilot?: boolean;
}

export interface AccessLevel {
  id: string;
  name: string;
  badge: string;
  description: string;
  isCustom?: boolean;
  modules: {
    dashboard: boolean;
    crm: boolean;
    mentorados: boolean;
    academy: boolean;
    wiki: boolean;
    financial: boolean;
    events: boolean;
    settings: boolean;
  };
}

export interface CompanyData {
  companyName: string; // Razão Social
  tradeName: string; // Nome Fantasia / Marca
  cnpj: string;
  stateRegistration?: string;
  email: string;
  phone: string;
  website: string;
  segment: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  logoUrl?: string; // Logo Completo (Menu Aberto / Topbar / PDF)
  iconUrl?: string; // Ícone Reduzido (Menu Fechado / Favicon)
  primaryColor: string;
}

export interface OrganizationContext {
  id: string;
  name: string;
  slug: string;
  plan: 'STARTER' | 'PRO' | 'ENTERPRISE';
  logoUrl?: string;
  iconUrl?: string;
  primaryColor: string;
  features: FeatureFlags;
  company: CompanyData;
  accessLevels: AccessLevel[];
}

export const DEFAULT_ACCESS_LEVELS: AccessLevel[] = [
  {
    id: 'lvl-master',
    name: 'Comandante Master (Acesso Total)',
    badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    description: 'Acesso irrestrito a todos os módulos, financeiro, configurações e banco de dados.',
    modules: {
      dashboard: true,
      crm: true,
      mentorados: true,
      academy: true,
      wiki: true,
      financial: true,
      events: true,
      settings: true,
    },
  },
  {
    id: 'lvl-enterprise',
    name: 'Plano Enterprise / Diamante',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    description: 'Acesso completo ao CRM, mentorados, academy, eventos e financeiro executivo.',
    modules: {
      dashboard: true,
      crm: true,
      mentorados: true,
      academy: true,
      wiki: true,
      financial: true,
      events: true,
      settings: false,
    },
  },
  {
    id: 'lvl-pro',
    name: 'Plano Pro / Ouro',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: 'Acesso à gestão de mentorados, salas de aula da Academy, wiki e eventos.',
    modules: {
      dashboard: true,
      crm: false,
      mentorados: true,
      academy: true,
      wiki: true,
      financial: false,
      events: true,
      settings: false,
    },
  },
  {
    id: 'lvl-starter',
    name: 'Plano Starter / Prata',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    description: 'Acesso essencial à sala de aula Academy e base de conhecimento Wiki.',
    modules: {
      dashboard: true,
      crm: false,
      mentorados: false,
      academy: true,
      wiki: true,
      financial: false,
      events: false,
      settings: false,
    },
  },
];

export const DEFAULT_TENANT: OrganizationContext = {
  id: 'org-mentoria-master',
  name: 'Mentoria & CRM Hub',
  slug: 'mentoria-hub',
  plan: 'ENTERPRISE',
  primaryColor: '#EAB308',
  logoUrl: '',
  iconUrl: '',
  features: {
    crm: true,
    mentorados: true,
    kanban: true,
    academy: true,
    wiki: true,
    financial: true,
    events: true,
    whatsapp_automation: true,
    ai_copilot: true,
  },
  company: {
    companyName: 'Plataforma de Gestão de Mentorias & CRM LTDA',
    tradeName: 'Mentoria & CRM Hub',
    cnpj: '45.123.890/0001-99',
    stateRegistration: '112.334.556.789',
    email: 'contato@mentorias.com.br',
    phone: '(11) 99530-2672',
    website: 'https://mentorias.com.br',
    segment: 'Aceleração de Negócios, Gestão & Mentoria Executiva',
    address: {
      street: 'Av. Paulista',
      number: '1800 - Conjunto 142',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-200',
    },
    primaryColor: '#EAB308',
  },
  accessLevels: DEFAULT_ACCESS_LEVELS,
};

export function hasFeature(tenant: OrganizationContext, feature: keyof FeatureFlags): boolean {
  return Boolean(tenant.features[feature]);
}
