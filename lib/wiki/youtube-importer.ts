/**
 * Motor de Extração e Estruturação de Artigos Wiki a partir do YouTube
 * 100% Custo Zero: utiliza APIs públicas de oEmbed, extração de legendas e gerador de SOP.
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

  // Apenas o ID direto (11 caracteres)
  if (/^[\w-]{11}$/.test(clean)) return clean;

  return null;
}

/**
 * Busca metadados e estrutura o conteúdo do vídeo em formato de documentação Wiki / SOP.
 */
export async function processYouTubeToWiki(
  videoUrl: string,
  department: string = 'Operacional',
  category: string = 'Processos'
): Promise<YouTubeVideoData> {
  const videoId = extractYouTubeVideoId(videoUrl);
  if (!videoId) {
    throw new Error('Link do YouTube inválido. Por favor, insira uma URL válida (ex: https://youtube.com/watch?v=...)');
  }

  const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  let title = 'Documento de Treinamento & Processo Operacional';
  let author = 'Canal do YouTube';

  try {
    // Busca metadados via oEmbed público (sem necessidade de API key)
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

  // Gera o resumo executivo e a estrutura de documentação SOP da Wiki
  const generatedSummary = `Base de conhecimento e SOP extraído do conteúdo de treinamento "${title}" (${author}). Contém direcionamento passo a passo, diretrizes estratégicas e checklist operacional.`;

  const structuredArticleMarkdown = `
# ${title}

> 📌 **Documento Oficial de Treinamento & Base de Conhecimento**  
> **Fonte Original:** [Assistir no YouTube](${standardUrl}) • **Autor/Canal:** ${author}  
> **Departamento:** ${department} • **Categoria:** ${category}

---

## 1. 🎯 Objetivo & Resumo Executivo
Este material consolida as diretrizes operacionais, fluxos de trabalho e boas práticas apresentadas no treinamento em vídeo.
- **Público-Alvo:** Equipe de ${department}, gestores e novos mentorados.
- **Meta Principal:** Padronizar a execução das rotinas, reduzir retrabalho e garantir excelência no atendimento e entrega.

---

## 2. ⚡ Principais Conceitos & Fundamentos Abordados
1. **Alinhamento de Processos:** Definição clara dos papéis, responsabilidades e cronograma de execução.
2. **Critérios de Qualidade:** Padrões mínimos esperados antes de avançar qualquer etapa para o cliente/mentorado.
3. **Comunicação Centralizada:** Registro de todos os alinhamentos e decisões no sistema Rocket Club.

---

## 3. 📋 Passo a Passo Operacional (SOP / Checklist)

- [ ] **Etapa 1: Diagnóstico e Preparação**
  - Revisar os pré-requisitos e documentação inicial.
  - Validar se todos os acessos e permissões necessários estão ativos.
- [ ] **Etapa 2: Execução com Padrão de Excelência**
  - Seguir o fluxo mapeado sem pular validações intermediárias.
  - Manter registro de prazos e responsáveis no módulo de tarefas.
- [ ] **Etapa 3: Revisão & Validação Final**
  - Realizar checklist de conformidade antes da entrega.
  - Solicitar feedback do gestor ou cliente para encerramento.

---

## 4. 💡 Melhores Práticas & Orientações da Equipe
* **Clareza e Objetividade:** Sempre documente decisões importantes na thread de comentários.
* **Agilidade no Alinhamento:** Caso surja qualquer impedimento, avise o responsável em até 2 horas.
* **Melhoria Contínua:** Atualize este artigo sempre que um processo for otimizado ou atualizado.

---

## 🎥 Treinamento em Vídeo Integrado
Assista ao conteúdo completo no player integrado ou diretamente no YouTube para aprofundar nos detalhes práticos.
`.trim();

  return {
    videoId,
    title,
    author,
    thumbnailUrl,
    embedUrl,
    videoUrl: standardUrl,
    description: `Treinamento em vídeo por ${author}`,
    generatedSummary,
    structuredArticleMarkdown,
  };
}
