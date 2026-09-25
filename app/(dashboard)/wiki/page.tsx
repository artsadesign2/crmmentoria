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
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { INITIAL_WIKI_ARTICLES, WikiArticleItem } from '@/lib/wiki/wiki-service';
import { useTheme } from '@/lib/theme-context';
import { toast } from '@/lib/toast-context';

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

  // Modal YouTube AI Importer
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [ytDept, setYtDept] = useState('Operacional');
  const [ytCategory, setYtCategory] = useState('Treinamento');
  const [loadingYouTube, setLoadingYouTube] = useState(false);

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
    };

    saveCustomArticle(newArt);
    setNewTitle('');
    setNewSummary('');
    setNewContent('');
    setIsAddModalOpen(false);
    toast.success('Artigo Publicado!', `O documento "${newArt.title}" já está disponível.`);
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
        coverImage: data.thumbnailUrl,
        readingTimeMinutes: data.readingTimeMinutes || 5,
        tags: data.tags,
      };

      saveCustomArticle(newArt);
      setYoutubeUrl('');
      setIsYouTubeModalOpen(false);
      toast.success(
        'Base de Conhecimento Criada!',
        `O vídeo "${data.title}" foi transformado em um SOP completo com sucesso.`
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
            onClick={() => setIsYouTubeModalOpen(true)}
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

      {/* Grid de Artigos */}
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

            return (
              <Link
                key={article.id}
                href={`/wiki/${article.id}`}
                className="group bg-[#0F172A]/80 hover:bg-[#131B2E] border border-slate-800/90 hover:border-amber-500/40 rounded-3xl p-7 transition-all duration-200 hover:shadow-2xl flex flex-col justify-between space-y-5"
              >
                {/* Top Info */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-lg">
                      {article.category}
                    </span>

                    {hasVideo ? (
                      <span className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-lg font-semibold flex items-center gap-1">
                        <Video size={12} />
                        Vídeo
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Building size={12} className="text-slate-500" />
                        {article.department}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                    {article.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-400 line-clamp-3 leading-relaxed">
                    {article.summary}
                  </p>
                </div>

                {/* Footer do Card */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 text-xs text-slate-500">
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

      {/* Modal Importar YouTube com IA */}
      <Modal
        isOpen={isYouTubeModalOpen}
        onClose={() => !loadingYouTube && setIsYouTubeModalOpen(false)}
        title="Importar Vídeo do YouTube com IA"
      >
        <form onSubmit={handleImportYouTube} className="space-y-4">
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
              <Youtube size={17} />
              <span>Transformador de Vídeo em SOP & Base de Conhecimento</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Cole o link de uma aula ou treinamento do YouTube. A IA analisará o conteúdo e criará uma página completa com o vídeo embutido, resumo executivo, tópicos e checklist operacional.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Link do Vídeo do YouTube *
            </label>
            <input
              type="url"
              required
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

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
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent" />
                  <span>Processando Vídeo com IA...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Gerar Página de Conhecimento</span>
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
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all disabled:opacity-50"
            >
              Publicar Artigo
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
