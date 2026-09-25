export interface WikiArticleItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  department: string;
  viewsCount: number;
  createdAt: string;
  author: string;
  videoUrl?: string;
  coverImage?: string;
  readingTimeMinutes?: number;
  tags?: string[];
}

export function getArticleCover(article: Partial<WikiArticleItem>): string {
  if (article.coverImage && article.coverImage.trim()) return article.coverImage.trim();
  
  if (article.videoUrl) {
    const matchWatch = article.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
    const matchShort = article.videoUrl.match(/youtu\.be\/([\w-]{11})/);
    const vId = matchWatch ? matchWatch[1] : matchShort ? matchShort[1] : null;
    if (vId) return `https://img.youtube.com/vi/${vId}/hqdefault.jpg`;
  }

  const dept = (article.department || '').toLowerCase();
  if (dept.includes('comercial') || dept.includes('venda')) {
    return 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1200&auto=format&fit=crop';
  }
  if (dept.includes('financeiro') || dept.includes('finan')) {
    return 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=1200&auto=format&fit=crop';
  }
  if (dept.includes('academy') || dept.includes('treina') || dept.includes('aula')) {
    return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop';
  }
  if (dept.includes('juríd') || dept.includes('jurid')) {
    return 'https://images.unsplash.com/photo-1450133064473-71024230f91b?q=80&w=1200&auto=format&fit=crop';
  }

  // Operacional default
  return 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=1200&auto=format&fit=crop';
}

export const INITIAL_WIKI_ARTICLES: WikiArticleItem[] = [
  {
    id: 'a1',
    title: 'Manual de Boas-Vindas & Cultura do Rocket Club',
    summary: 'Guia completo sobre os princípios, rituais semanais, código de conduta e métricas da mentoria.',
    category: 'Processos',
    department: 'Operacional',
    viewsCount: 340,
    createdAt: '2026-08-01',
    author: 'Diretoria Executiva',
    readingTimeMinutes: 4,
    coverImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200&auto=format&fit=crop',
    tags: ['Cultura', 'Onboarding', 'Princípios'],
    content: `
# Manual de Boas-Vindas & Cultura do Rocket Club

Bem-vindo à documentação oficial do ecossistema Rocket Club. Este manual consolida nossos valores, diretrizes de conduta e padrões de excelência operacional para todos os membros e colaboradores.

---

### 1. Nossos Pilares Inegociáveis

A excelência do Rocket Club é sustentada por três pilares fundamentais:

* **Foco Obsessivo no Resultado do Mentorado:** Cada iniciativa, resposta ou direcionamento deve gerar tração e clareza para o negócio do mentorado.
* **Velocidade com Precisão:** Respondemos dúvidas operacionais em tempo recorde sem abrir mão do rigor técnico e da qualidade.
* **Transparência Radical:** Problemas e gargalos devem ser expostos e tratados imediatamente, sem ruídos ou procrastinação.

---

### 2. Rituais e Cadência Semanal

Para manter toda a equipe e os mentorados em sincronia, seguimos uma cadência estruturada:

1. **Segunda-feira (09:00):** Reunião de alinhamento tático de início de semana e definição de metas.
2. **Quarta-feira (15:00):** Hotseat ao vivo e sessão de diagnóstico de gargalos com mentorados VIP.
3. **Sexta-feira (17:00):** Fechamento de sprints, revisão de métricas do CRM e celebração de vitórias.

---

### 3. Diretrizes de Comunicação e Suporte

* Todas as interações devem ser conduzidas em tom consultivo, empático e resolutivo.
* Utilize o módulo **Inbox** para centralizar os atendimentos do WhatsApp e evitar conversas paralelas.
* Documente novas soluções encontradas nesta Wiki para que toda a equipe possa se beneficiar do aprendizado.
    `.trim(),
  },
  {
    id: 'a2',
    title: 'Procedimento Operacional Padrão (SOP): Onboarding de Novo Mentorado',
    summary: 'Roteiro passo a passo para configuração de acessos, diagnóstico inicial e primeira sessão de mentoria.',
    category: 'SOPs',
    department: 'Operacional',
    viewsCount: 290,
    createdAt: '2026-08-05',
    author: 'Sucesso do Cliente',
    readingTimeMinutes: 5,
    coverImage: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1200&auto=format&fit=crop',
    tags: ['SOP', 'Onboarding', 'CS'],
    content: `
# SOP: Onboarding de Novo Mentorado

Este documento descreve o fluxo obrigatório a ser executado assim que um novo contrato de mentoria é confirmado no CRM.

---

### 1. Preparação e Liberação de Acessos

Assim que a oportunidade é movida para a etapa de fechamento:

* **Cadastro no Sistema:** Cadastrar o mentorado no módulo **Mentorados**, preenchendo todos os dados cadastrais e de faturamento.
* **Disparo Automático:** Enviar mensagem de boas-vindas pelo WhatsApp com o link de acesso ao Portal do Mentorado e formulário de diagnóstico.
* **Criação de Tarefa:** Adicionar no módulo de tarefas a checagem da entrega do kit físico de boas-vindas.

---

### 2. Agendamento do Diagnóstico Individual

* Entrar em contato em até 4 horas úteis após a confirmação do pagamento para agendar a primeira sessão estratégica com o mentor.
* Garantir que o formulário de diagnóstico prévio seja respondido com pelo menos 24 horas de antecedência da reunião.
* Revisar os principais desafios apontados pelo mentorado para preparar uma pauta assertiva.

---

### 3. Acompanhamento dos Primeiros 30 Dias

A retenção e o sucesso do mentorado dependem da sua ativação inicial:
* **Dia 7:** Checagem de primeiro marco atingido e acesso aos cursos da Academy.
* **Dia 15:** Contato proativo da equipe de suporte para tirar dúvidas operacionais.
* **Dia 30:** Avaliação de satisfação inicial e revisão do plano de ação para o próximo trimestre.
    `.trim(),
  },
  {
    id: 'a3',
    title: 'Regulamento Financeiro & Emissão de Notas Fiscais',
    summary: 'Critérios contábeis para cobrança de mensalidades, contratos e emissão de NF-e.',
    category: 'Financeiro',
    department: 'Financeiro',
    viewsCount: 180,
    createdAt: '2026-08-08',
    author: 'Controladoria & Finanças',
    readingTimeMinutes: 3,
    coverImage: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=1200&auto=format&fit=crop',
    tags: ['Financeiro', 'Notas Fiscais', 'Cobrança'],
    content: `
# Regulamento Financeiro & Emissão de Notas Fiscais

Diretrizes para a gestão financeira dos contratos de mentoria, conciliação bancária e faturamento.

---

### 1. Emissão de Notas Fiscais

* Todas as notas fiscais de serviço devem ser emitidas em até 48 horas após a confirmação do recebimento bancário.
* Para mentorias com pagamento recorrente, as notas devem ser programadas para o quinto dia útil de cada mês.
* Certifique-se de que a Razão Social e CNPJ estejam devidamente validados no cadastro do cliente.

---

### 2. Política de Inadimplência e Renegociação

* **Atraso de 3 dias:** Notificação automática e discreta via WhatsApp lembrando da pendência.
* **Atraso de 7 dias:** Contato telefônico direto do setor financeiro para entender a situação e propor novo link de pagamento.
* **Atraso superior a 15 dias:** Suspensão temporária do acesso aos encontros ao vivo até a regularização do contrato.
    `.trim(),
  },
];
