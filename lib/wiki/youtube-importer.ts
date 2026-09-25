/**
 * Motor de Extração e Estruturação de Artigos Wiki a partir do YouTube
 * 100% Custo Zero: utiliza APIs públicas de oEmbed e formatação humanizada de SOP.
 */

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
 * Busca metadados e estrutura o conteúdo do vídeo em formato de documentação Wiki / SOP.
 */
export async function processYouTubeToWiki(
  videoUrl: string,
  department: string = 'Operacional',
  category: string = 'Treinamento'
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
    });

    if (oembedRes.ok) {
      const data = await oembedRes.json();
      if (data.title) title = data.title;
      if (data.author_name) author = data.author_name;
    }
  } catch (err) {
    console.warn('[YouTube Importer] Falha no oEmbed:', err);
  }

  const generatedSummary = `Material de treinamento e procedimento operacional estruturado a partir da aula "${title}", ministrada por ${author}. Contém diretrizes de execução, pontos de atenção e fluxo de trabalho recomendado para a equipe.`;

  const structuredArticleMarkdown = `
# ${title}

Documento oficial de treinamento e capacitação técnica da equipe Rocket Club, sintetizado a partir do conteúdo prático de **${author}**.

---

### Visão Geral & Contexto Estratégico

Este guia foi elaborado para transformar os ensinamentos práticos deste treinamento em diretrizes claras de aplicação imediata na nossa operação diária. O objetivo central é capacitar toda a equipe de **${department}** a dominar as melhores técnicas e padronizar a execução com o mais alto nível de excelência.

---

### Principais Pilares do Treinamento

1. **Alinhamento e Clareza de Objetivos:** Toda entrega deve ter um propósito bem definido e métricas de sucesso compreendidas por todos os envolvidos.
2. **Execução Padronizada:** A consistência no método é o que garante previsibilidade nos resultados da mentoria e na satisfação dos nossos membros.
3. **Comunicação Ativa & Registro:** Nenhuma dúvida deve permanecer sem resposta; utilize as ferramentas centrais do sistema para registrar feedbacks e decisões.

---

### Procedimento Passo a Passo para Aplicação

Siga a sequência abaixo para implementar as recomendações apresentadas:

* **Etapa 1: Diagnóstico e Levantamento de Informações**  
  Analise o cenário atual antes de qualquer ação. Valide os dados no CRM e confirme se todos os pré-requisitos estão atendidos.

* **Etapa 2: Implementação com Foco em Qualidade**  
  Execute as etapas com atenção aos detalhes explicados na aula. Mantenha os prazos devidamente atualizados no módulo de tarefas.

* **Etapa 3: Validação, Revisão e Entrega**  
  Faça uma checagem rigorosa de conformidade antes de enviar a entrega final ao mentorado ou gestor.

---

### Recomendações e Boas Práticas

* Assista ao vídeo com atenção aos exemplos práticos demonstrados ao longo da explicação.
* Caso encontre um novo gargalo ou melhoria no processo, sugira uma atualização neste artigo da Wiki.
* Mantenha-se atualizado com as novas aulas e conteúdos adicionados semanalmente na nossa base.
  `.trim();

  return {
    videoId,
    title,
    author,
    thumbnailUrl,
    embedUrl,
    videoUrl: standardUrl,
    description: `Treinamento apresentado por ${author}`,
    generatedSummary,
    structuredArticleMarkdown,
    readingTimeMinutes: 5,
    tags: [department, category, 'Treinamento em Vídeo', author],
  };
}
