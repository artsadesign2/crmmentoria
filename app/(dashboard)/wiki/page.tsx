'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Eye,
  FileText,
  Building,
  Clock,
  Sparkles,
  X,
  Youtube,
  ExternalLink,
  Play,
  CheckCircle2,
  Folder,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { ArticleCard } from '@/components/ui/blog-post-card';
import { Modal } from '@/components/ui/modal';
import { Article, MOCK_ARTICLES } from '@/lib/mock-data';
import { useTheme } from '@/lib/theme-context';
import { toast } from '@/lib/toast-context';

const DEPARTMENTS = ['Todos', 'Operacional', 'Comercial', 'Financeiro', 'Jurídico', 'Academy'];
const CATEGORIES = ['Processos', 'SOPs', 'Treinamento', 'Atendimento', 'Vendas', 'Geral'];

export default function WikiPage() {
  const { isLightMode, activePalette } = useTheme();
  const [articles, setArticles] = useState<Article[]>(MOCK_ARTICLES);
  const [selectedDept, setSelectedDept] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Modal Manual
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newDept, setNewDept] = useState('Operacional');
  const [newCategory, setNewCategory] = useState('Processos');
  const [newCoverImage, setNewCoverImage] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');

  // Modal YouTube AI Importer
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [ytDept, setYtDept] = useState('Operacional');
  const [ytCategory, setYtCategory] = useState('Treinamento');
  const [loadingYouTube, setLoadingYouTube] = useState(false);

  const filteredArticles = articles.filter((art) => {
    const matchesDept = selectedDept === 'Todos' || art.department === selectedDept;
    const matchesSearch =
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const handleCreateArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const article: Article = {
      id: `a-${Date.now()}`,
      title: newTitle,
      summary: newSummary || 'Sem resumo cadastrado.',
      content: newContent || 'Conteúdo do artigo...',
      category: newCategory,
      department: newDept,
      viewsCount: 1,
      createdAt: new Date().toISOString().split('T')[0],
      author: 'Comandante Master',
    };

    setArticles([article, ...articles]);
    setNewTitle('');
    setNewSummary('');
    setNewContent('');
    setNewCoverImage('');
    setNewVideoUrl('');
    setIsAddModalOpen(false);
    toast.success('Artigo publicado na Wiki!', `O documento "${article.title}" já está disponível para consulta.`);
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

      const newArt: Article = {
        id: `yt-${Date.now()}`,
        title: data.title,
        summary: data.generatedSummary,
        content: data.structuredArticleMarkdown,
        category: ytCategory,
        department: ytDept,
        viewsCount: 1,
        createdAt: new Date().toISOString().split('T')[0],
        author: data.author || 'YouTube AI Extractor',
      };

      setArticles([newArt, ...articles]);
      setYoutubeUrl('');
      setIsYouTubeModalOpen(false);
      setSelectedArticle(newArt);
      toast.success(
        'Base de Conhecimento Criada!',
        `O vídeo "${data.title}" foi transformado em um SOP completo com sucesso.`
      );
    } catch (err) {
      toast.error('Falha de Conexão', 'Erro ao conectar com o serviço de extração.');
    } finally {
      setLoadingYouTube(false);
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A]/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <BookOpen size={14} /> Wiki & Base de Conhecimento
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Central de Processos & Documentação
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Artigos, SOPs, diretrizes da equipe e treinamentos importados do YouTube com IA.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Botão Importar YouTube com IA */}
          <button
            onClick={() => setIsYouTubeModalOpen(true)}
            className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm"
          >
            <Youtube size={16} className="text-red-400" />
            <span>Importar YouTube com IA</span>
          </button>

          {/* Botão Novo Artigo Manual */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md hover:shadow-amber-500/20"
          >
            <Plus size={15} />
            <span>Novo Artigo</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Filtros de Departamentos */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 custom-scrollbar">
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                selectedDept === dept
                  ? 'bg-slate-800 text-amber-400 border border-amber-500/30 shadow-sm'
                  : 'bg-[#131B2E]/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Input de Busca */}
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar na Wiki..."
            className="w-full bg-[#131B2E]/80 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
      </div>

      {/* Grid de Artigos */}
      {filteredArticles.length === 0 ? (
        <div className="py-20 text-center text-slate-500 space-y-3 bg-[#131B2E]/40 border border-slate-800 rounded-2xl">
          <BookOpen size={36} className="mx-auto text-slate-600" />
          <p className="text-sm font-medium">Nenhum artigo encontrado nesta categoria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <div
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              className="group cursor-pointer bg-[#131B2E]/70 hover:bg-[#1E293B]/80 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-6 transition-all duration-200 hover:shadow-xl flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-800/80 text-amber-400 px-2.5 py-1 rounded-md border border-slate-700/60">
                    {article.category}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    <Building size={11} /> {article.department}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                  {article.title}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {article.summary}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Clock size={12} />
                  <span>{article.createdAt}</span>
                </div>
                <div className="flex items-center gap-1 text-amber-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                  <span>Ler artigo</span>
                  <ArrowRight size={12} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Leitor do Artigo */}
      <Modal
        isOpen={Boolean(selectedArticle)}
        onClose={() => setSelectedArticle(null)}
        title={selectedArticle?.title || 'Detalhes do Artigo'}
      >
        {selectedArticle && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center gap-3 text-xs text-slate-400 pb-3 border-b border-slate-800">
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-md font-semibold">
                {selectedArticle.category}
              </span>
              <span>•</span>
              <span>Departamento: <strong className="text-slate-200">{selectedArticle.department}</strong></span>
              <span>•</span>
              <span>Autor: <strong className="text-slate-200">{selectedArticle.author}</strong></span>
            </div>

            <div className="prose prose-invert max-w-none text-xs text-slate-300 leading-relaxed whitespace-pre-line space-y-4">
              {selectedArticle.content}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Importar YouTube com IA */}
      <Modal
        isOpen={isYouTubeModalOpen}
        onClose={() => !loadingYouTube && setIsYouTubeModalOpen(false)}
        title="Importar Vídeo do YouTube com IA"
      >
        <form onSubmit={handleImportYouTube} className="space-y-4">
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
              <Youtube size={16} />
              <span>Transformador de Vídeo em SOP & Base de Conhecimento</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Cole o link de um vídeo do YouTube. Nossa IA extrairá o conteúdo, resumirá os pontos-chave e criará uma documentação completa e estruturada pronta para consulta da equipe.
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
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all disabled:opacity-50"
            >
              {loadingYouTube ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent" />
                  <span>Processando Vídeo com IA...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Gerar Base de Conhecimento</span>
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
              className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Conteúdo em Markdown
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
