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
} from 'lucide-react';
import { ArticleCard } from '@/components/ui/blog-post-card';
import { Modal } from '@/components/ui/modal';
import { Article, MOCK_ARTICLES } from '@/lib/mock-data';
import { useTheme } from '@/lib/theme-context';
import { toast } from '@/lib/toast-context';

const DEPARTMENTS = ['Todos', 'Operacional', 'Comercial', 'Financeiro', 'Jurídico'];

export default function WikiPage() {
  const { isLightMode, activePalette } = useTheme();
  const [articles, setArticles] = useState<Article[]>(MOCK_ARTICLES);
  const [selectedDept, setSelectedDept] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Article State
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newDept, setNewDept] = useState('Operacional');
  const [newCategory, setNewCategory] = useState('Processos');

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
    setIsAddModalOpen(false);
    toast.success('Artigo publicado na Wiki!', `O documento "${article.title}" já está disponível para consulta.`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border"
            style={{
              backgroundColor: activePalette.tokens.badgeBg,
              color: activePalette.tokens.primary,
              borderColor: activePalette.tokens.badgeBorder,
            }}
          >
            <BookOpen size={14} /> Wiki & Base de Conhecimento
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Central de <span className="theme-gradient-text">Processos & Documentos</span>
          </h1>
          <p className={`text-sm ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
            Artigos, SOPs e materiais de referência compartilhados em formato panorâmico com shadcn UI.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-64 sm:w-72">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar artigos ou SOPs..."
              className={`w-full border rounded-xl pl-10 pr-4 py-2 text-xs placeholder-slate-500 focus:outline-none ${
                isLightMode
                  ? 'bg-white border-slate-300 text-slate-900'
                  : 'bg-[#131926] border-[#1F293D] text-slate-200'
              }`}
            />
          </div>

          <a
            href="/api/export-system-guide"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 text-blue-300 font-bold text-xs hover:bg-blue-600/30 transition-all flex items-center gap-2 shrink-0"
            title="Visualizar e Baixar o Guia Executivo Oficial em PDF"
          >
            <FileText size={15} className="text-blue-400" />
            <span>Manual do Sistema (PDF)</span>
          </a>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 rounded-xl font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-2 shrink-0"
            style={{
              backgroundColor: activePalette.tokens.primary,
              color: isLightMode ? '#FFFFFF' : '#0B0F17',
              boxShadow: `0 4px 15px ${activePalette.tokens.glow}`,
            }}
          >
            <Plus size={16} />
            <span>Novo Artigo</span>
          </button>
        </div>
      </div>

      {/* Department Tabs Filter */}
      <div className={`flex items-center gap-2 overflow-x-auto pb-2 border-b ${isLightMode ? 'border-slate-200' : 'border-[#1F293D]'}`}>
        {DEPARTMENTS.map((dept) => {
          const isSel = selectedDept === dept;
          return (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                isSel
                  ? 'shadow-sm'
                  : isLightMode
                  ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  : 'bg-[#131926]/60 text-slate-400 border-[#1F293D] hover:bg-[#1F293D]'
              }`}
              style={
                isSel
                  ? {
                      backgroundColor: activePalette.tokens.badgeBg,
                      color: activePalette.tokens.primary,
                      borderColor: activePalette.tokens.badgeBorder,
                    }
                  : {}
              }
            >
              {dept}
            </button>
          );
        })}
      </div>

      {/* Expanded Modern shadcn Article Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredArticles.map((article) => (
          <ArticleCard
            key={article.id}
            headline={article.title}
            excerpt={article.summary}
            tag={article.department}
            readingTime={180}
            writer={article.author}
            publishedAt={new Date(article.createdAt)}
            cover={
              article.department === 'Operacional'
                ? 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=80'
                : article.department === 'Comercial'
                ? 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&auto=format&fit=crop&q=80'
                : 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80'
            }
            onClick={() => setSelectedArticle(article)}
          />
        ))}
      </div>

      {/* Standardized Premium Article Reader Modal */}
      {selectedArticle && (
        <Modal
          isOpen={Boolean(selectedArticle)}
          onClose={() => setSelectedArticle(null)}
          title={selectedArticle.title}
          subtitle={`Escrito por ${selectedArticle.author} em ${selectedArticle.createdAt}`}
          icon={<BookOpen size={20} />}
          badge={
            <span
              className="px-2.5 py-0.5 rounded-xl text-[10px] font-bold uppercase border"
              style={{
                backgroundColor: activePalette.tokens.badgeBg,
                color: activePalette.tokens.primary,
                borderColor: activePalette.tokens.badgeBorder,
              }}
            >
              {selectedArticle.department} • {selectedArticle.category}
            </span>
          }
          size="2xl"
        >
          <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-4">
            <p className={`font-semibold text-sm ${isLightMode ? 'text-slate-800' : 'text-slate-200'}`}>
              {selectedArticle.summary}
            </p>
            <div
              className={`p-5 rounded-2xl border space-y-4 ${
                isLightMode ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#0B0F17]/60 border-[#1F293D] text-slate-300'
              }`}
            >
              <p>{selectedArticle.content}</p>
              <p>
                Para dúvidas adicionais ou sugestões de alteração neste procedimento operacional padrão (SOP), entre em contato com o responsável pelo departamento de {selectedArticle.department}.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/40 mt-4">
            <button
              onClick={() => setSelectedArticle(null)}
              className="px-5 py-2.5 rounded-xl font-bold text-xs shadow-md"
              style={{
                backgroundColor: activePalette.tokens.primary,
                color: isLightMode ? '#FFFFFF' : '#0B0F17',
              }}
            >
              Fechar Artigo
            </button>
          </div>
        </Modal>
      )}

      {/* Standardized Premium New Article Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Novo Artigo ou SOP de Processo"
        subtitle="Publique um procedimento operacional para a equipe ou mentorados"
        icon={<FileText size={20} />}
        size="lg"
      >
        <form onSubmit={handleCreateArticle} className="space-y-4 text-xs">
          <div className="space-y-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Título do Documento</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: SOP de Qualificação Comercial"
                className={`w-full border rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none ${
                  isLightMode
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Departamento</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className={`w-full border rounded-xl px-3.5 py-2.5 focus:outline-none ${
                    isLightMode
                      ? 'bg-white border-slate-300 text-slate-900'
                      : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                  }`}
                >
                  {DEPARTMENTS.filter((d) => d !== 'Todos').map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Categoria</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Processos, Vendas..."
                  className={`w-full border rounded-xl px-3.5 py-2.5 focus:outline-none ${
                    isLightMode
                      ? 'bg-white border-slate-300 text-slate-900'
                      : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Resumo Executivo</label>
              <input
                type="text"
                value={newSummary}
                onChange={(e) => setNewSummary(e.target.value)}
                placeholder="Resumo em poucas palavras..."
                className={`w-full border rounded-xl px-3.5 py-2.5 focus:outline-none ${
                  isLightMode
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                }`}
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Conteúdo Completo</label>
              <textarea
                rows={4}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Escreva as instruções passo a passo..."
                className={`w-full border rounded-xl px-3.5 py-2.5 focus:outline-none resize-none ${
                  isLightMode
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                }`}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/40">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-[#0B0F17] text-slate-300 text-xs font-semibold hover:bg-[#1F293D] border border-[#1F293D]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-bold text-xs shadow-md hover:scale-105 transition-all"
              style={{
                backgroundColor: activePalette.tokens.primary,
                color: isLightMode ? '#FFFFFF' : '#0B0F17',
              }}
            >
              Publicar Artigo
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
