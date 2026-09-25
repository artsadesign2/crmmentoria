'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Search,
  Plus,
  Building,
  Clock,
  Sparkles,
  Youtube,
  ArrowRight,
  Video,
  FileText,
  CheckCircle2,
  Tag,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { INITIAL_WIKI_ARTICLES, WikiArticleItem, getArticleCover } from '@/lib/wiki/wiki-service';
import { useTheme } from '@/lib/theme-context';
import { toast } from '@/lib/toast-context';
import { extractYouTubeVideoId, YouTubePreviewData } from '@/lib/wiki/youtube-importer';

const DEPARTMENTS = ['Todos', 'Operacional', 'Comercial', 'Financeiro', 'Jurídico', 'Academy'];
const CATEGORIES = ['Processos', 'SOPs', 'Treinamento', 'Atendimento', 'Vendas', 'Geral'];

export default function WikiPage() {
  const router = useRouter();
  const { isLightMode, activePalette } = useTheme();

  const [articles, setArticles] = useState<WikiArticleItem[]>(INITIAL_WIKI_ARTICLES);
  const [selectedDept, setSelectedDept] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Manual
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newDept, setNewDept] = useState('Operacional');
  const [newCategory, setNewCategory] = useState('Processos');
  const [newCoverImage, setNewCoverImage] = useState('');

  // Modal YouTube AI Importer
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [ytDept, setYtDept] = useState('Operacional');
  const [ytCategory, setYtCategory] = useState('Treinamento');
  const [loadingYouTube, setLoadingYouTube] = useState(false);

  // Pré-processamento e Auto-Classificação em Tempo Real
  const [previewData, setPreviewData] = useState<YouTubePreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Carrega artigos salvos localmente
  useEffect(() => {
    try {
      const stored = localStorage.getItem('rocket_custom_wiki_articles');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setArticles([...parsed, ...INITIAL_WIKI_ARTICLES]);
        }
      }
    } catch {}
  }, []);

  // Monitora digitação da URL do YouTube para pré-processamento inteligente
  useEffect(() => {
    if (!youtubeUrl.trim()) {
      setPreviewData(null);
      setLoadingPreview(false);
      return;
    }

    const videoId = extractYouTubeVideoId(youtubeUrl.trim());
    if (!videoId) {
      setPreviewData(null);
      setLoadingPreview(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingPreview(true);
      try {
        const res = await fetch('/api/wiki/preview-youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: youtubeUrl.trim() }),
        });

        const json = await res.json();
        if (json.ok && json.preview) {
          const prev: YouTubePreviewData = json.preview;
          setPreviewData(prev);
          setYtDept(prev.suggestedDepartment);
          setYtCategory(prev.suggestedCategory);
        }
      } catch (err) {
        console.warn('Erro ao pré-processar vídeo:', err);
      } finally {
        setLoadingPreview(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [youtubeUrl]);

  const saveCustomArticle = (newArt: WikiArticleItem) => {
    try {
      const currentStored = localStorage.getItem('rocket_custom_wiki_articles');
      const list = currentStored ? JSON.parse(currentStored) : [];
      const updated = [newArt, ...list];
      localStorage.setItem('rocket_custom_wiki_articles', JSON.stringify(updated));
    } catch {}
    setArticles((prev) => [newArt, ...prev]);
  };

  const filteredArticles = articles.filter((art) => {
    const matchesDept = selectedDept === 'Todos' || art.department === selectedDept;
    const matchesSearch =
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (art.category && art.category.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDept && matchesSearch;
  });

  const handleCreateArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const assignedCover =
      newCoverImage.trim() ||
      getArticleCover({ department: newDept, category: newCategory });

    const newArt: WikiArticleItem = {
      id: `a-${Date.now()}`,
      title: newTitle.trim(),
      summary: newSummary.trim() || 'Documento oficial de processos e diretrizes operacionais da equipe.',
      content: newContent.trim() || `# ${newTitle.trim()}\n\nConteúdo cadastrado pela equipe.`,
      category: newCategory,
      department: newDept,
      viewsCount: 1,
      createdAt: new Date().toLocaleDateString('pt-BR'),
      author: 'Comandante Master',
      readingTimeMinutes: 4,
      coverImage: assignedCover,
    };

    saveCustomArticle(newArt);
    setNewTitle('');
    setNewSummary('');
    setNewContent('');
    setNewCoverImage('');
    setIsAddModalOpen(false);
    toast.success('Artigo Publicado!', `O documento "${newArt.title}" já está disponível com capa.`);
    router.push(`/wiki/${newArt.id}`);
  };

  const handleImportYouTube = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim() || loadingYouTube) return;

    setLoadingYouTube(true);
    try {
      const res = await fetch('/api/wiki/import-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: youtubeUrl.trim(),
          department: ytDept,
          category: ytCategory,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error('Erro na importação', json.error || 'Não foi possível processar o vídeo.');
        return;
      }

      const { data } = json;

      const coverImg =
        data.thumbnailUrl ||
        (data.videoId ? `https://img.youtube.com/vi/${data.videoId}/hqdefault.jpg` : undefined);

      const newArt: WikiArticleItem = {
        id: `yt-${Date.now()}`,
        title: data.title,
        summary: data.generatedSummary,
        content: data.structuredArticleMarkdown,
        category: ytCategory,
        department: ytDept,
        viewsCount: 1,
        createdAt: new Date().toLocaleDateString('pt-BR'),
        author: data.author || 'YouTube Treinamento',
        videoUrl: data.videoUrl,
        coverImage: coverImg,
        readingTimeMinutes: data.readingTimeMinutes || 7,
        tags: data.tags,
      };

      saveCustomArticle(newArt);
      setYoutubeUrl('');
      setPreviewData(null);
      setIsYouTubeModalOpen(false);
      toast.success(
        'Base de Conhecimento Criada!',
        `O vídeo "${data.title}" foi transformado em um SOP completo com capa e vídeo incorporado.`
      );
      router.push(`/wiki/${newArt.id}`);
    } catch (err) {
      toast.error('Falha de Conexão', 'Erro ao conectar com o serviço de extração.');
    } finally {
      setLoadingYouTube(false);
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#0F172A]/90 border border-slate-800/90 rounded-3xl p-8 backdrop-blur-xl shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/25">
            <BookOpen size={14} /> Wiki & Base de Conhecimento
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Central de Processos & Documentação
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            Consulte manuais, SOPs, diretrizes operacionais e treinamentos em vídeo convertidos em artigos estruturados para a equipe.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Botão Importar YouTube com IA */}
          <button
            onClick={() => {
              setPreviewData(null);
              setYoutubeUrl('');
              setIsYouTubeModalOpen(true);
            }}
            className="px-5 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-2xl text-xs font-bold flex items-center space-x-2.5 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm"
          >
            <Youtube size={17} className="text-red-400" />
            <span>Importar Vídeo do YouTube com IA</span>
          </button>

          {/* Botão Novo Artigo Manual */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center space-x-2 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md hover:shadow-amber-500/20"
          >
            <Plus size={16} />
            <span>Publicar Artigo</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros & Busca */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Filtro por Departamento */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 custom-scrollbar">
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                selectedDept === dept
                  ? 'bg-slate-800 text-amber-400 border border-amber-500/40 shadow-sm font-bold'
                  : 'bg-[#131B2E]/70 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Input de Busca */}
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por título, SOP ou assunto..."
            className="w-full bg-[#131B2E]/90 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 transition-colors shadow-sm"
          />
        </div>
      </div>

      {/* Grid de Artigos com Capa Visual */}
      {filteredArticles.length === 0 ? (
        <div className="py-24 text-center text-slate-500 space-y-4 bg-[#131B2E]/40 border border-slate-800 rounded-3xl p-8">
          <BookOpen size={42} className="mx-auto text-slate-600" />
          <h3 className="text-base font-bold text-slate-300">Nenhum documento encontrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Não foram encontrados artigos para o filtro selecionado. Experimente buscar outro termo ou publicar um novo documento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => {
            const hasVideo = Boolean(article.videoUrl);
            const coverSrc = getArticleCover(article);

            return (
              <Link
                key={article.id}
                href={`/wiki/${article.id}`}
                className="group bg-[#0F172A]/80 hover:bg-[#131B2E] border border-slate-800/90 hover:border-amber-500/40 rounded-3xl p-5 transition-all duration-200 hover:shadow-2xl flex flex-col justify-between overflow-hidden"
              >
                {/* Imagem de Capa do Artigo */}
                <div className="space-y-4">
                  <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/80 group-hover:border-amber-500/30 transition-all">
                    <img
                      src={coverSrc}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent opacity-80" />

                    {/* Badges Flutuantes sobre a Capa */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-950/80 backdrop-blur-md text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                        {article.category}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      {hasVideo ? (
                        <span className="text-[10px] text-red-400 bg-slate-950/80 backdrop-blur-md border border-red-500/30 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 shadow-sm">
                          <Video size={12} />
                          Vídeo
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-200 bg-slate-950/80 backdrop-blur-md border border-slate-700/60 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 shadow-sm">
                          <Building size={11} className="text-slate-400" />
                          {article.department}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Informações do Texto */}
                  <div className="space-y-2 px-1">
                    <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                      {article.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {article.summary}
                    </p>
                  </div>
                </div>

                {/* Footer do Card */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80 text-xs text-slate-500 px-1">
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-slate-500" />
                    <span>{article.readingTimeMinutes || 4} min de leitura</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-amber-400 font-bold group-hover:translate-x-1 transition-transform">
                    <span>Acessar</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Modal Importar YouTube com IA & Auto-Classificação */}
      <Modal
        isOpen={isYouTubeModalOpen}
        onClose={() => !loadingYouTube && setIsYouTubeModalOpen(false)}
        title="Importar Vídeo do YouTube com IA"
      >
        <form onSubmit={handleImportYouTube} className="space-y-4">
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
              <Youtube size={17} />
              <span>Auto-Detecção Inteligente & Gerador de Manual SOP</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Cole o link do YouTube. O sistema analisará o vídeo em tempo real, extrairá a <strong>capa oficial</strong>, sugerirá automaticamente o <strong>Departamento</strong> e <strong>Categoria</strong> ideais, e gerará uma documentação completa e aprofundada.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-400">
                Link do Vídeo do YouTube *
              </label>
              {loadingPreview && (
                <span className="text-[11px] text-amber-400 flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Extraindo capa e contexto...</span>
                </span>
              )}
            </div>

            <input
              type="url"
              required
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Pré-visualização do Vídeo, Capa & Auto-Classificação */}
          {previewData && (
            <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Sparkles size={14} /> Capa Extraída & Classificação Automática
                </span>
                <span className="text-[11px] text-slate-400">
                  {previewData.confidenceScore}% de assertividade
                </span>
              </div>

              <div className="flex items-center gap-3">
                <img
                  src={previewData.thumbnailUrl}
                  alt={previewData.title}
                  className="w-28 h-16 rounded-xl object-cover border border-slate-700 shrink-0 shadow-md"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <h4 className="text-xs font-bold text-white truncate">{previewData.title}</h4>
                  <p className="text-[11px] text-slate-400 truncate">Canal / Autor: {previewData.author}</p>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={11} /> Capa do vídeo vinculada com sucesso
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-amber-400 shrink-0" />
                <span>
                  Sugerido: <strong>{previewData.suggestedDepartment}</strong> &bull; <strong>{previewData.suggestedCategory}</strong>. Você pode confirmar ou ajustar abaixo:
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Departamento de Destino
              </label>
              <select
                value={ytDept}
                onChange={(e) => setYtDept(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
              >
                {DEPARTMENTS.filter((d) => d !== 'Todos').map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Categoria
              </label>
              <select
                value={ytCategory}
                onChange={(e) => setYtCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={loadingYouTube}
              onClick={() => setIsYouTubeModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loadingYouTube || !youtubeUrl.trim()}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 transition-all disabled:opacity-50 shadow-md"
            >
              {loadingYouTube ? (
                <>
                  <Loader2 size={14} className="animate-spin text-slate-950" />
                  <span>Gerando Documentação Completa...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Gerar Manual de Conhecimento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Criar Artigo Manual */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Publicar Artigo na Wiki"
      >
        <form onSubmit={handleCreateArticle} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Título do Documento *
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Guia de Onboarding de Novos Mentorados..."
              className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Departamento
              </label>
              <select
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
              >
                {DEPARTMENTS.filter((d) => d !== 'Todos').map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Categoria
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              URL da Imagem de Capa (Opcional)
            </label>
            <div className="relative">
              <input
                type="url"
                value={newCoverImage}
                onChange={(e) => setNewCoverImage(e.target.value)}
                placeholder="https://... (deixe em branco para capa automática de alta qualidade)"
                className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Resumo / Sinopse
            </label>
            <input
              type="text"
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              placeholder="Breve descrição do objetivo deste material..."
              className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Conteúdo do Documento (Markdown)
            </label>
            <textarea
              rows={6}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Escreva as diretrizes, checklist e orientações da equipe..."
              className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all disabled:opacity-50 shadow-md"
            >
              Publicar Artigo
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
