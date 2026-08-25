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
import { Article, MOCK_ARTICLES } from '@/lib/mock-data';

const DEPARTMENTS = ['Todos', 'Operacional', 'Comercial', 'Financeiro', 'Jurídico'];

export default function WikiPage() {
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
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-xs font-bold uppercase tracking-wider mb-2">
            <BookOpen size={14} /> Wiki & Base de Conhecimento
          </div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
            Central de <span className="gold-gradient-text">Processos & Documentos</span>
          </h1>
          <p className="text-sm text-slate-400">
            Artigos, SOPs e materiais de referência compartilhados em formato panorâmico com shadcn UI.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar artigos ou SOPs..."
              className="w-full bg-[#131926] border border-[#1F293D] rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-yellow-500/40"
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
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-yellow-500/20 hover:scale-105 transition-all flex items-center gap-2 shrink-0"
          >
            <Plus size={16} />
            <span>Novo Artigo</span>
          </button>
        </div>
      </div>

      {/* Department Tabs Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#1F293D]">
        {DEPARTMENTS.map((dept) => (
          <button
            key={dept}
            onClick={() => setSelectedDept(dept)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedDept === dept
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 shadow'
                : 'bg-[#131926]/60 text-slate-400 border border-[#1F293D] hover:bg-[#1F293D]'
            }`}
          >
            {dept}
          </button>
        ))}
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

      {/* Article Reader Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-[#131926] border border-[#1F293D] rounded-3xl p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-[#1F293D]">
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-xl text-[10px] font-bold uppercase bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
                  {selectedArticle.department} • {selectedArticle.category}
                </span>
                <h2 className="text-2xl font-bold text-slate-100">{selectedArticle.title}</h2>
                <p className="text-xs text-slate-400">Escrito por {selectedArticle.author} em {selectedArticle.createdAt}</p>
              </div>
              <button onClick={() => setSelectedArticle(null)} className="text-slate-400 hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            <div className="prose prose-invert max-w-none text-xs text-slate-300 leading-relaxed space-y-4">
              <p className="font-semibold text-slate-200 text-sm">{selectedArticle.summary}</p>
              <div className="p-5 rounded-2xl bg-[#0B0F17]/60 border border-[#1F293D] space-y-4">
                <p>{selectedArticle.content}</p>
                <p>
                  Para dúvidas adicionais ou sugestões de alteração neste procedimento operacional padrão (SOP), entre em contato com o responsável pelo departamento de {selectedArticle.department}.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#1F293D]">
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-5 py-2.5 rounded-xl bg-yellow-500 text-slate-950 font-bold text-xs hover:bg-yellow-400 transition-colors"
              >
                Fechar Artigo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Article Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateArticle}
            className="w-full max-w-xl bg-[#131926] border border-[#1F293D] rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#1F293D]">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <FileText size={18} className="text-yellow-400" />
                <span>Novo Artigo ou SOP</span>
              </h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Título do Documento</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: SOP de Qualificação Comercial"
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Departamento</label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
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
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
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
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Conteúdo Completo</label>
                <textarea
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Escreva as instruções passo a passo..."
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#1F293D]">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-[#0B0F17] text-slate-300 text-xs font-semibold hover:bg-[#1F293D] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-yellow-500/20 hover:scale-105 transition-all"
              >
                Publicar Artigo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
