'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Building,
  User,
  Share2,
  Printer,
  Copy,
  Check,
  Youtube,
  ExternalLink,
  ChevronRight,
  Sparkles,
  FileText,
  Bookmark,
  CheckCircle2,
} from 'lucide-react';
import { INITIAL_WIKI_ARTICLES, WikiArticleItem } from '@/lib/wiki/wiki-service';
import { useTheme } from '@/lib/theme-context';
import { toast } from '@/lib/toast-context';
import { extractYouTubeVideoId } from '@/lib/wiki/youtube-importer';

export default function WikiArticlePage() {
  const params = useParams();
  const router = useRouter();
  const { isLightMode, activePalette } = useTheme();

  const articleId = params?.id as string;
  const [article, setArticle] = useState<WikiArticleItem | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Busca dos artigos mock + localStorage se houver artigos adicionados dinamicamente
    let allArticles = [...INITIAL_WIKI_ARTICLES];
    try {
      const stored = localStorage.getItem('rocket_custom_wiki_articles');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          allArticles = [...parsed, ...allArticles];
        }
      }
    } catch {}

    const found = allArticles.find((a) => a.id === articleId);
    if (found) {
      setArticle(found);
    }
  }, [articleId]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Link Copiado!', 'O endereço deste documento foi copiado para sua área de transferência.');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (!article) {
    return (
      <div className="w-full py-24 text-center space-y-4">
        <BookOpen size={48} className="mx-auto text-slate-600 animate-pulse" />
        <h2 className="text-xl font-bold text-white">Artigo não encontrado</h2>
        <p className="text-sm text-slate-400">
          O documento solicitado pode ter sido movido ou excluído.
        </p>
        <Link
          href="/wiki"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Voltar para a Wiki</span>
        </Link>
      </div>
    );
  }

  const youtubeId = article.videoUrl ? extractYouTubeVideoId(article.videoUrl) : null;
  const relatedArticles = INITIAL_WIKI_ARTICLES.filter((a) => a.id !== article.id).slice(0, 3);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Back Action */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <Link
          href="/wiki"
          className="inline-flex items-center space-x-2 px-3.5 py-2 bg-[#131B2E] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm"
        >
          <ArrowLeft size={14} />
          <span>Voltar para a Base de Conhecimento</span>
        </Link>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyLink}
            className="p-2 bg-[#131B2E] hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            title="Copiar link"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar Link'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="p-2 bg-[#131B2E] hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            title="Imprimir documento"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* Main Container Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna Principal: Conteúdo do Artigo (8 colunas) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Header do Artigo */}
          <div className="bg-[#0F172A]/90 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl space-y-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-bold uppercase tracking-wider">
                {article.category}
              </span>
              <span className="px-3 py-1 bg-slate-800/80 text-slate-300 border border-slate-700/60 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <Building size={12} className="text-slate-400" />
                {article.department}
              </span>
              {youtubeId && (
                <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <Youtube size={13} />
                  Treinamento em Vídeo
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {article.title}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal bg-[#131B2E]/70 p-5 rounded-2xl border border-slate-800/80">
              {article.summary}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold flex items-center justify-center text-xs">
                  {article.author?.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <span className="font-semibold text-slate-200 block">{article.author}</span>
                  <span className="text-[11px] text-slate-500">Autor do Documento</span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1.5">
                  <Clock size={14} className="text-slate-500" />
                  <span>{article.readingTimeMinutes || 4} min de leitura</span>
                </span>
                <span>•</span>
                <span>Publicado em {article.createdAt}</span>
              </div>
            </div>
          </div>

          {/* Player de Vídeo Incorporado (Se houver) */}
          {youtubeId && (
            <div className="bg-[#0F172A]/90 border border-slate-800 rounded-3xl overflow-hidden p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm font-bold text-white">
                  <Youtube size={18} className="text-red-500" />
                  <span>Vídeo Aula & Treinamento Gravado</span>
                </div>
                <a
                  href={`https://www.youtube.com/watch?v=${youtubeId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1 font-semibold"
                >
                  <span>Abrir no YouTube</span>
                  <ExternalLink size={12} />
                </a>
              </div>

              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
                  title={article.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          )}

          {/* Corpo do Artigo com Tipografia Confortável */}
          <div className="bg-[#0F172A]/90 border border-slate-800 rounded-3xl p-8 sm:p-10 backdrop-blur-xl shadow-xl">
            <article className="space-y-6 text-sm sm:text-base text-slate-200 leading-relaxed">
              {article.content.split('\n\n').map((paragraph, index) => {
                const trimmed = paragraph.trim();

                // Título H1
                if (trimmed.startsWith('# ')) {
                  return (
                    <h2 key={index} className="text-2xl sm:text-3xl font-bold text-white pt-4 pb-2 border-b border-slate-800">
                      {trimmed.replace(/^#\s+/, '')}
                    </h2>
                  );
                }

                // Título H2 / H3
                if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
                  return (
                    <h3 key={index} className="text-lg sm:text-xl font-bold text-amber-400 pt-6 pb-1">
                      {trimmed.replace(/^#{2,3}\s+/, '')}
                    </h3>
                  );
                }

                // Divisória
                if (trimmed === '---') {
                  return <hr key={index} className="border-slate-800 my-6" />;
                }

                // Citação / Quote
                if (trimmed.startsWith('> ')) {
                  return (
                    <blockquote
                      key={index}
                      className="border-l-4 border-amber-500 bg-amber-500/5 px-5 py-4 rounded-r-2xl text-slate-300 text-sm italic my-4"
                    >
                      {trimmed.replace(/^>\s+/, '')}
                    </blockquote>
                  );
                }

                // Lista de Itens (com asterisco ou número)
                if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || /^\d+\.\s/.test(trimmed)) {
                  const lines = trimmed.split('\n');
                  return (
                    <div key={index} className="space-y-2.5 my-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80">
                      {lines.map((line, liIdx) => {
                        const cleanLine = line.replace(/^[\*\-]\s+/, '').replace(/^\d+\.\s+/, '');
                        return (
                          <div key={liIdx} className="flex items-start space-x-3 text-sm text-slate-300">
                            <CheckCircle2 size={16} className="text-amber-500 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">
                              {cleanLine.split('**').map((chunk, cIdx) =>
                                cIdx % 2 === 1 ? (
                                  <strong key={cIdx} className="text-white font-semibold">
                                    {chunk}
                                  </strong>
                                ) : (
                                  chunk
                                )
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                // Parágrafo Normal com Suporte a Negrito
                return (
                  <p key={index} className="text-slate-300 leading-relaxed">
                    {trimmed.split('**').map((chunk, cIdx) =>
                      cIdx % 2 === 1 ? (
                        <strong key={cIdx} className="text-white font-semibold">
                          {chunk}
                        </strong>
                      ) : (
                        chunk
                      )
                    )}
                  </p>
                );
              })}
            </article>
          </div>
        </div>

        {/* Coluna Lateral Direita: Informações & Artigos Relacionados (4 colunas) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card de Informações Rápidas */}
          <div className="bg-[#0F172A]/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
              <Sparkles size={14} className="text-amber-400" />
              <span>Resumo do Documento</span>
            </h3>

            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
                <span className="text-slate-500">Departamento</span>
                <span className="font-semibold text-slate-200">{article.department}</span>
              </div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
                <span className="text-slate-500">Categoria</span>
                <span className="font-semibold text-slate-200">{article.category}</span>
              </div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
                <span className="text-slate-500">Tempo de Leitura</span>
                <span className="font-semibold text-slate-200">{article.readingTimeMinutes || 4} minutos</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Autor</span>
                <span className="font-semibold text-slate-200">{article.author}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleCopyLink}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md"
              >
                <Share2 size={14} />
                <span>Compartilhar com a Equipe</span>
              </button>
            </div>
          </div>

          {/* Artigos Relacionados */}
          <div className="bg-[#0F172A]/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
              <BookOpen size={14} className="text-amber-400" />
              <span>Outros Artigos da Wiki</span>
            </h3>

            <div className="space-y-3">
              {relatedArticles.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/wiki/${rel.id}`}
                  className="group block p-3.5 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/30 rounded-2xl transition-all"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold text-amber-400 uppercase">
                      {rel.category}
                    </span>
                    <span className="text-[10px] text-slate-500">{rel.createdAt}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                    {rel.title}
                  </h4>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
