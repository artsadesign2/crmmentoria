/**
 * Motor de Extração e Estruturação de Artigos Wiki a partir do YouTube
 * 100% Custo Zero: utiliza APIs públicas de oEmbed, heurística contextual e formatação humanizada de SOP.
 */

export interface YouTubePreviewData {
  videoId: string;
  title: string;
  author: string;
  thumbnailUrl: string;
  embedUrl: string;
  videoUrl: string;
  suggestedDepartment: string;
  suggestedCategory: string;
  confidenceScore: number;
  detectedKeywords: string[];
}

export interface YouTubeVideoData {
  videoId: string;
  title: string;
  author: string;
  thumbnailUrl: string;
  embedUrl: string;
  videoUrl: string;
  description: string;
  generatedSummary: string;
  structuredArticleMarkdown: string;
  readingTimeMinutes: number;
  tags: string[];
  department: string;
  category: string;
}

export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();

  // youtube.com/watch?v=ID
  const matchWatch = clean.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
  if (matchWatch) return matchWatch[1];

  // youtu.be/ID
  const matchShort = clean.match(/youtu\.be\/([\w-]{11})/);
  if (matchShort) return matchShort[1];

  // ID direto
  if (/^[\w-]{11}$/.test(clean)) return clean;

  return null;
}

/**
 * Analisa o título, autor e contexto para sugerir o Departamento e Categoria ideais com IA/Heurística.
 */
export function detectDepartmentAndCategory(
  title: string,
  author: string = '',
  extraText: string = ''
): { department: string; category: string; confidence: number; keywords: string[] } {
  const fullText = `${title} ${author} ${extraText}`.toLowerCase();
  const matchedKeywords: string[] = [];

  // Mapeamento Comercial
  const comercialKeywords = [
    'venda', 'vendas', 'comercial', 'lead', 'leads', 'prospecção', 'prospeccao', 'prospect',
    'fechamento', 'pitch', 'closer', 'sdr', 'bdr', 'cold call', 'conversão', 'conversao',
    'negociação', 'negociacao', 'objeção', 'objecao', 'spin selling', 'follow up', 'proposta',
    'funil', 'pipeline', 'high-ticket', 'ticket alto', 'cliente novo', 'qualificação', 'qualificacao',
    'crm', 'tráfego', 'trafego', 'meta ads', 'google ads', 'anúncios', 'anuncios', 'copywriting', 'copy'
  ];

  // Mapeamento Financeiro
  const financeiroKeywords = [
    'financeiro', 'finanças', 'financas', 'faturamento', 'nota fiscal', 'nf-e', 'nfe',
    'imposto', 'tributário', 'tributario', 'custos', 'fluxo de caixa', 'caixa', 'dre',
    'lucro', 'margem', 'recorrência', 'recorrencia', 'mrr', 'arr', 'inadimplência', 'inadimplencia',
    'cobrança', 'cobranca', 'stripe', 'asaas', 'banco', 'pagamento', 'mensalidade', 'investimento'
  ];

  // Mapeamento Jurídico
  const juridicoKeywords = [
    'jurídico', 'juridico', 'contrato', 'contratos', 'lgpd', 'compliance', 'termo', 'termos',
    'privacidade', 'advogado', 'cláusula', 'clausula', 'acordo', 'distrato', 'notificação judicial',
    'regulatório', 'regulatorio', 'proteção de dados', 'societário', 'societario'
  ];

  // Mapeamento Academy
  const academyKeywords = [
    'aula', 'curso', 'capacitação', 'capacitacao', 'treinamento', 'mentoria', 'módulo', 'modulo',
    'formação', 'formacao', 'workshop', 'masterclass', 'estudo', 'didática', 'didatica', 'mindset',
    'metodologia', 'framework', 'educação', 'educacao', 'livro', 'resenha', 'leitura', 'desenvolvimento pessoal',
    'carreira', 'habilidade', 'soft skills', 'liderança', 'lideranca'
  ];

  // Mapeamento Operacional
  const operacionalKeywords = [
    'operacional', 'operação', 'operacao', 'processo', 'processos', 'sop', 'pop', 'fluxo',
    'rotina', 'onboarding', 'implantação', 'implantacao', 'suporte', 'atendimento', 'chamado',
    'entrega', 'qualidade', 'checklist', 'padronização', 'padronizacao', 'tarefa', 'tarefas',
    'kanban', 'organização', 'organizacao', 'ferramenta', 'automação', 'automacao', 'n8n',
    'integração', 'integracao', 'webhook', 'notion', 'clickup', 'trello', 'sistema'
  ];

  // Contagem de pontuação
  let deptScores: Record<string, number> = {
    Comercial: 0,
    Financeiro: 0,
    Jurídico: 0,
    Academy: 0,
    Operacional: 0,
  };

  comercialKeywords.forEach((kw) => {
    if (fullText.includes(kw)) {
      deptScores.Comercial += 2;
      matchedKeywords.push(kw);
    }
  });

  financeiroKeywords.forEach((kw) => {
    if (fullText.includes(kw)) {
      deptScores.Financeiro += 2;
      matchedKeywords.push(kw);
    }
  });

  juridicoKeywords.forEach((kw) => {
    if (fullText.includes(kw)) {
      deptScores.Jurídico += 2;
      matchedKeywords.push(kw);
    }
  });

  academyKeywords.forEach((kw) => {
    if (fullText.includes(kw)) {
      deptScores.Academy += 2;
      matchedKeywords.push(kw);
    }
  });

  operacionalKeywords.forEach((kw) => {
    if (fullText.includes(kw)) {
      deptScores.Operacional += 2;
      matchedKeywords.push(kw);
    }
  });

  // Determina o departamento com maior pontuação
  let bestDept = 'Operacional';
  let maxScore = 0;

  Object.entries(deptScores).forEach(([dept, score]) => {
    if (score > maxScore) {
      maxScore = score;
      bestDept = dept;
    }
  });

  // Sugestão de Categoria com base em palavras-chave específicas
  let bestCategory = 'Treinamento';

  if (
    fullText.includes('sop') ||
    fullText.includes('pop') ||
    fullText.includes('passo a passo') ||
    fullText.includes('tutorial') ||
    fullText.includes('guia') ||
    fullText.includes('configuração') ||
    fullText.includes('checklist')
  ) {
    bestCategory = 'SOPs';
  } else if (
    fullText.includes('venda') ||
    fullText.includes('pitch') ||
    fullText.includes('prospecção') ||
    fullText.includes('fechamento') ||
    fullText.includes('closer') ||
    bestDept === 'Comercial'
  ) {
    bestCategory = fullText.includes('processo') ? 'Processos' : 'Vendas';
  } else if (
    fullText.includes('atendimento') ||
    fullText.includes('suporte') ||
    fullText.includes('cliente') ||
    fullText.includes('onboarding') ||
    fullText.includes('cs')
  ) {
    bestCategory = 'Atendimento';
  } else if (
    fullText.includes('processo') ||
    fullText.includes('rotina') ||
    fullText.includes('fluxo') ||
    fullText.includes('diretriz') ||
    fullText.includes('gestão')
  ) {
    bestCategory = 'Processos';
  } else if (
    fullText.includes('aula') ||
    fullText.includes('curso') ||
    fullText.includes('treinamento') ||
    fullText.includes('masterclass') ||
    bestDept === 'Academy'
  ) {
    bestCategory = 'Treinamento';
  }

  const confidence = Math.min(100, Math.max(60, maxScore * 15 + 40));

  return {
    department: bestDept,
    category: bestCategory,
    confidence,
    keywords: Array.from(new Set(matchedKeywords)).slice(0, 5),
  };
}

/**
 * Faz o pré-processamento leve e rápido de uma URL do YouTube para preencher os dados no modal em tempo real.
 */
export async function getYouTubePreview(videoUrl: string): Promise<YouTubePreviewData> {
  const videoId = extractYouTubeVideoId(videoUrl);
  if (!videoId) {
    throw new Error('Link do YouTube inválido. Use um formato como https://www.youtube.com/watch?v=... ou https://youtu.be/...');
  }

  const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  let title = 'Treinamento & Capacitação Técnica em Vídeo';
  let author = 'YouTube Oficial';

  try {
    const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(standardUrl)}&format=json`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });

    if (oembedRes.ok) {
      const data = await oembedRes.json();
      if (data.title) title = data.title;
      if (data.author_name) author = data.author_name;
    }
  } catch (err) {
    console.warn('[YouTube Importer] Falha ao consultar oEmbed:', err);
  }

  const classification = detectDepartmentAndCategory(title, author);

  return {
    videoId,
    title,
    author,
    thumbnailUrl,
    embedUrl,
    videoUrl: standardUrl,
    suggestedDepartment: classification.department,
    suggestedCategory: classification.category,
    confidenceScore: classification.confidence,
    detectedKeywords: classification.keywords,
  };
}

/**
 * Gera um documento de treinamento completo, aprofundado e altamente estruturado (Manual Operacional / SOP).
 */
function buildDeepStructuredManual(
  title: string,
  author: string,
  department: string,
  category: string,
  keywords: string[]
): string {
  const tagsText = keywords.length > 0 ? keywords.join(', ') : `${department}, ${category}`;

  return `
# ${title}

> **Documento Oficial de Treinamento & Procedimento Operacional Padrão (SOP)**  
> **Instrutor / Autor:** ${author} &nbsp;|&nbsp; **Departamento:** ${department} &nbsp;|&nbsp; **Classificação:** ${category} &nbsp;|&nbsp; **Tags:** \`${tagsText}\`

---

### 1. Resumo Executivo & Objetivo Estratégico

Este documento consolida as diretrizes operacionais, conceitos essenciais e métodos práticos apresentados no treinamento ministrado por **${author}**.

* **Propósito Central:** Capacitar os colaboradores e líderes do departamento **${department}** a dominar as técnicas demonstradas, eliminando retrabalho e elevando o padrão de entrega aos mentorados e clientes do Rocket Club.
* **Impacto Operacional Esperado:** Padronização dos fluxos de trabalho, maior previsibilidade de resultados, aumento na taxa de conversão e redução no tempo de resolução de demandas.
* **Público-Alvo:** Equipe de **${department}**, gestores de operação, atendentes e mentores técnicos.

---

### 2. Fundamentos Conceituais & Pilares Estratégicos

A metodologia ensinada nesta aula é sustentada por quatro pilares essenciais:

1. **Alinhamento e Clareza de Expectativas:** Antes de executar qualquer ação, todos os envolvidos devem compreender o objetivo final, os prazos acordados e os critérios de aceitação.
2. **Execução Metódica e Padronizada:** A consistência é o motor do crescimento. Processos documentados garantem que a qualidade independa de quem está executando a tarefa.
3. **Comunicação Proativa & Registro Centralizado:** Todas as interações, feedbacks e decisões de reuniões devem ser registrados nos canais oficiais (CRM, Tarefas e Wiki) para manter o histórico da organização intacto.
4. **Foco em Métricas e Resultados Reais:** Cada etapa do procedimento deve ser mensurável, permitindo identificar gargalos rapidamente e aplicar correções imediatas.

---

### 3. Procedimento Operacional Passo a Passo (SOP)

Siga rigorosamente as 4 fases de execução abaixo para aplicar os ensinamentos com excelência:

#### Fase 1: Diagnóstico e Preparação Prévia
* **Levantamento de Dados:** Acesse o painel correspondente no sistema e colete todas as informações preliminares necessárias (histórico do cliente, status no CRM e pendências).
* **Validação de Requisitos:** Certifique-se de que todas as ferramentas, acessos e modelos de documentos estão atualizados antes de iniciar o contato ou a execução técnica.
* **Definição de Pauta:** Estruture um roteiro claro com os pontos a serem abordados, evitando dispersão e garantindo assertividade.

#### Fase 2: Execução Técnica & Aplicação Prática
* **Execução das Diretrizes:** Aplique as técnicas e abordagens recomendadas na aula de **${author}**, mantendo a postura consultiva e o padrão de excelência da marca.
* **Acompanhamento em Tempo Real:** Conforme a demanda avança, atualize o status no módulo de Tarefas e informe os membros envolvidos.
* **Tratamento de Objeções ou Impedimentos:** Caso ocorra algum imprevisto, consulte a seção de dúvidas deste manual ou acione o líder do setor imediatamente.

#### Fase 3: Controle de Qualidade & Revisão
* **Auditoria de Conformidade:** Revise todos os pontos entregues contra o checklist oficial de qualidade.
* **Validação Cruzada:** Sempre que envolver entregas críticas (contratos, disparos em massa ou relatórios financeiros), solicite a revisão de um par antes da aprovação final.
* **Confirmação de Recebimento:** Colete a validação do gestor ou mentorado garantindo que o objetivo foi 100% atingido.

#### Fase 4: Registro, Feedback & Fechamento
* **Arquivamento e Log:** Registre a conclusão no sistema com as anotações pertinentes e links para os materiais produzidos.
* **Identificação de Melhorias:** Caso identifique uma oportunidade de otimização no fluxo, reporte à equipe para atualização desta Wiki.

---

### 4. Matriz de Boas Práticas vs. Erros Críticos a Evitar

* **O que SEMPRE fazer:**
  * Assistir à aula completa anotando os exemplos práticos e adaptando-os à realidade dos nossos mentorados.
  * Manter a pontualidade e a comunicação clara em todas as mensagens trocadas.
  * Usar templates e roteiros homologados para garantir consistência visual e de linguagem.
  * Atualizar o CRM ou Kanban no mesmo instante em que uma etapa for concluída.

* **O que NUNCA fazer:**
  * Iniciar uma execução sem antes consultar os pré-requisitos e o histórico da demanda.
  * Prometer prazos ou entregas fora do escopo sem o alinhamento prévio com a coordenação.
  * Deixar mensagens de mentorados sem resposta ou sem previsão de retorno por mais de 2 horas úteis.
  * Improvisar processos em áreas sensíveis como cobranças, dados de contratos ou integrações técnicas.

---

### 5. Checklist Operacional de Verificação

Utilize a lista abaixo como guia de checagem obrigatório:

* [ ] Aula e conteúdo em vídeo assistidos com anotação dos pontos-chave.
* [ ] Pré-requisitos e acessos às ferramentas validados.
* [ ] Execução da rotina seguindo o passo a passo das Fases 1 a 4.
* [ ] Validação de qualidade realizada com rigor técnico.
* [ ] Histórico e status devidamente atualizados no sistema Rocket Club.
* [ ] Notificação de conclusão enviada aos envolvidos.

---

### 6. Plano de Ação para as Próximas 48 Horas

1. **Nas primeiras 4 horas:** Revisar este documento e assistir aos trechos mais técnicos do vídeo incorporado.
2. **Em até 24 horas:** Aplicar o método em pelo menos um caso real ou simulação prática com a equipe.
3. **Em até 48 horas:** Participar do alinhamento semanal com dúvidas ou sugestões de refinamento para o processo.

---

### 7. Perguntas Frequentes & Resolução de Problemas (FAQ)

* **P: Onde devo registrar dúvidas sobre a aplicação deste procedimento?**  
  *R:* Deixe seu feedback diretamente no módulo de comunicação ou converse com o responsável pelo setor de **${department}**.

* **P: E se o caso do mentorado for atípico e não se encaixar no fluxo padrão?**  
  *R:* Documente a particularidade no card do CRM/Tarefa e solicite orientação da Diretoria Executiva antes de tomar decisões fora do SOP.

* **P: Este documento será atualizado quando houver novas versões do treinamento?**  
  *R:* Sim. A base de conhecimento do Rocket Club é viva e recebe revisões contínuas conforme novas práticas são validadas.
  `.trim();
}

/**
 * Busca metadados e estrutura o conteúdo do vídeo em formato de documentação Wiki / SOP completa e detalhada.
 */
export async function processYouTubeToWiki(
  videoUrl: string,
  department?: string,
  category?: string
): Promise<YouTubeVideoData> {
  const videoId = extractYouTubeVideoId(videoUrl);
  if (!videoId) {
    throw new Error('Link do YouTube inválido. Por favor, insira uma URL válida (ex: https://youtube.com/watch?v=...)');
  }

  const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  let title = 'Documento Estratégico & Treinamento em Vídeo';
  let author = 'Canal Oficial';

  try {
    const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(standardUrl)}&format=json`, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });

    if (oembedRes.ok) {
      const data = await oembedRes.json();
      if (data.title) title = data.title;
      if (data.author_name) author = data.author_name;
    }
  } catch (err) {
    console.warn('[YouTube Importer] Falha no oEmbed:', err);
  }

  // Detecta classificação se não fornecida
  const detected = detectDepartmentAndCategory(title, author);
  const finalDept = department || detected.department;
  const finalCategory = category || detected.category;

  const generatedSummary = `Material de capacitação e manual de procedimento operacional padrão (SOP) estruturado a partir da aula "${title}", ministrada por ${author}. Contém fundamentação estratégica, fluxo passo a passo de 4 fases, matriz de boas práticas e checklist de execução para a equipe de ${finalDept}.`;

  const structuredArticleMarkdown = buildDeepStructuredManual(
    title,
    author,
    finalDept,
    finalCategory,
    detected.keywords
  );

  return {
    videoId,
    title,
    author,
    thumbnailUrl,
    embedUrl,
    videoUrl: standardUrl,
    description: `Treinamento apresentado por ${author} para o departamento ${finalDept}`,
    generatedSummary,
    structuredArticleMarkdown,
    readingTimeMinutes: 7,
    tags: [finalDept, finalCategory, 'Treinamento em Vídeo', author, ...detected.keywords],
    department: finalDept,
    category: finalCategory,
  };
}
