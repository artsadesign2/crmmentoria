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
  Mail,
  Send,
  Users,
  Search,
  CheckSquare,
  Square,
  Loader2,
  MessageSquare,
  ShieldCheck,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { INITIAL_WIKI_ARTICLES, WikiArticleItem } from '@/lib/wiki/wiki-service';
import { useTheme } from '@/lib/theme-context';
import { toast } from '@/lib/toast-context';
import { useNotifications } from '@/lib/notification-context';
import { extractYouTubeVideoId } from '@/lib/wiki/youtube-importer';
import { Modal } from '@/components/ui/modal';

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  avatar?: string;
  status: string;
}

export default function WikiArticlePage() {
  const params = useParams();
  const router = useRouter();
  const { isLightMode, activePalette } = useTheme();
  const { addNotification } = useNotifications();

  const articleId = params?.id as string;
  const [article, setArticle] = useState<WikiArticleItem | null>(null);
  const [copied, setCopied] = useState(false);

  // Modal Compartilhar com a Equipe
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [shareNote, setShareNote] = useState('');
  const [sendingShare, setSendingShare] = useState(false);

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

  // Carrega lista de usuários ao abrir o modal de compartilhamento
  useEffect(() => {
    if (isShareModalOpen && teamUsers.length === 0) {
      setLoadingUsers(true);
      fetch('/api/users')
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && Array.isArray(data.users)) {
            setTeamUsers(data.users);
          }
        })
        .catch((err) => console.warn('Falha ao carregar equipe:', err))
        .finally(() => setLoadingUsers(false));
    }
  }, [isShareModalOpen, teamUsers.length]);

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

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    const activeUsers = filteredTeamUsers.filter((u) => u.status === 'ATIVO');
    if (selectedUserIds.length === activeUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(activeUsers.map((u) => u.id));
    }
  };

  const handleSendShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!article || selectedUserIds.length === 0 || sendingShare) return;

    setSendingShare(true);
    try {
      const res = await fetch('/api/wiki/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          articleTitle: article.title,
          articleSummary: article.summary,
          department: article.department,
          category: article.category,
          readingTimeMinutes: article.readingTimeMinutes || 5,
          hasVideo: Boolean(article.videoUrl),
          userIds: selectedUserIds,
          note: shareNote.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error('Erro no envio', json.error || 'Falha ao enviar recomendações.');
        return;
      }

      // Adiciona notificação in-app
      addNotification({
        sector: 'wiki',
        type: 'info',
        title: 'Recomendação de Treinamento',
        message: `Você recomendou o artigo "${article.title}" para ${selectedUserIds.length} membro(s) da equipe.`,
        link: `/wiki/${article.id}`,
        actionText: 'Ver Artigo',
      });

      toast.success(
        'Recomendação Enviada!',
        `E-mails e notificações despachados com sucesso para ${json.sentCount || selectedUserIds.length} membro(s) da equipe.`
      );

      setIsShareModalOpen(false);
      setSelectedUserIds([]);
      setShareNote('');
    } catch (err) {
      toast.error('Erro de Rede', 'Não foi possível conectar ao servidor para envio dos e-mails.');
    } finally {
      setSendingShare(false);
    }
  };

  const filteredTeamUsers = teamUsers.filter((u) => {
    const q = userSearchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.department && u.department.toLowerCase().includes(q)) ||
      u.role.toLowerCase().includes(q)
    );
  });

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
          {/* Botão Compartilhar com Equipe no Topo */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm"
          >
            <Share2 size={14} />
            <span>Compartilhar com a Equipe</span>
          </button>

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
                  <span>{article.readingTimeMinutes || 5} min de leitura</span>
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

          {/* Corpo do Artigo / Manual Completo com Tipografia Confortável */}
          <div className="bg-[#0F172A]/90 border border-slate-800 rounded-3xl p-8 sm:p-10 backdrop-blur-xl shadow-xl">
            <article className="space-y-6 text-sm sm:text-base text-slate-200 leading-relaxed">
              {article.content.split('\n\n').map((paragraph, index) => {
                const trimmed = paragraph.trim();

                // Título H1
                if (trimmed.startsWith('# ')) {
                  return (
                    <h2 key={index} className="text-2xl sm:text-3xl font-extrabold text-white pt-4 pb-2 border-b border-slate-800">
                      {trimmed.replace(/^#\s+/, '')}
                    </h2>
                  );
                }

                // Título H2 / H3
                if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
                  return (
                    <h3 key={index} className="text-lg sm:text-xl font-bold text-amber-400 pt-6 pb-1 flex items-center gap-2">
                      <span>{trimmed.replace(/^#{2,3}\s+/, '')}</span>
                    </h3>
                  );
                }

                // Sub-título H4
                if (trimmed.startsWith('#### ')) {
                  return (
                    <h4 key={index} className="text-base font-bold text-slate-100 pt-4 pb-1">
                      {trimmed.replace(/^####\s+/, '')}
                    </h4>
                  );
                }

                // Divisória
                if (trimmed === '---') {
                  return <hr key={index} className="border-slate-800 my-6" />;
                }

                // Citação / Callout
                if (trimmed.startsWith('> ')) {
                  const quoteLines = trimmed.split('\n').map((l) => l.replace(/^>\s*/, ''));
                  return (
                    <blockquote
                      key={index}
                      className="border-l-4 border-amber-500 bg-amber-500/5 px-5 py-4 rounded-r-2xl text-slate-300 text-sm italic my-4 space-y-1"
                    >
                      {quoteLines.map((line, qIdx) => (
                        <p key={qIdx} className="leading-relaxed">
                          {line.split('**').map((chunk, cIdx) =>
                            cIdx % 2 === 1 ? (
                              <strong key={cIdx} className="text-amber-200 font-semibold not-italic">
                                {chunk}
                              </strong>
                            ) : (
                              chunk
                            )
                          )}
                        </p>
                      ))}
                    </blockquote>
                  );
                }

                // Checklist interativo / itens com checkbox [ ] ou [x]
                if (trimmed.includes('[ ]') || trimmed.includes('[x]')) {
                  const lines = trimmed.split('\n');
                  return (
                    <div key={index} className="space-y-2.5 my-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/90">
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                        <CheckSquare size={14} />
                        <span>Checklist de Verificação Operacional</span>
                      </div>
                      {lines.map((line, liIdx) => {
                        const isChecked = line.includes('[x]');
                        const cleanText = line.replace(/^[\*\-]\s*\[[\sx]\]\s*/, '');
                        return (
                          <div key={liIdx} className="flex items-start space-x-3 text-sm text-slate-200">
                            {isChecked ? (
                              <CheckSquare size={16} className="text-amber-400 shrink-0 mt-0.5" />
                            ) : (
                              <Square size={16} className="text-slate-500 shrink-0 mt-0.5" />
                            )}
                            <span className="leading-relaxed">{cleanText}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                // Lista Ordenada Numérica (1. Passo tal)
                if (/^\d+\.\s/.test(trimmed)) {
                  const lines = trimmed.split('\n');
                  return (
                    <div key={index} className="space-y-3 my-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80">
                      {lines.map((line, liIdx) => {
                        const numMatch = line.match(/^(\d+)\.\s*(.*)/);
                        const num = numMatch ? numMatch[1] : `${liIdx + 1}`;
                        const lineBody = numMatch ? numMatch[2] : line;

                        return (
                          <div key={liIdx} className="flex items-start space-x-3 text-sm text-slate-300">
                            <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {num}
                            </span>
                            <div className="flex-1 leading-relaxed">
                              {lineBody.split('**').map((chunk, cIdx) =>
                                cIdx % 2 === 1 ? (
                                  <strong key={cIdx} className="text-white font-semibold">
                                    {chunk}
                                  </strong>
                                ) : (
                                  chunk
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                // Lista de Itens (Bullet list com asterisco ou traço)
                if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                  const lines = trimmed.split('\n');
                  return (
                    <div key={index} className="space-y-2.5 my-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80">
                      {lines.map((line, liIdx) => {
                        const cleanLine = line.replace(/^[\*\-]\s+/, '');
                        const isNever = cleanLine.toLowerCase().includes('o que nunca fazer');
                        const isAlways = cleanLine.toLowerCase().includes('o que sempre fazer');

                        return (
                          <div key={liIdx} className="flex items-start space-x-3 text-sm text-slate-300">
                            {isNever ? (
                              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                            ) : isAlways ? (
                              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <CheckCircle2 size={16} className="text-amber-500 shrink-0 mt-0.5" />
                            )}
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

                // Parágrafo Normal com Suporte a Negrito e Código
                return (
                  <p key={index} className="text-slate-300 leading-relaxed">
                    {trimmed.split('`').map((part, pIdx) => {
                      if (pIdx % 2 === 1) {
                        return (
                          <code key={pIdx} className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 text-xs font-mono border border-slate-700">
                            {part}
                          </code>
                        );
                      }
                      return part.split('**').map((chunk, cIdx) =>
                        cIdx % 2 === 1 ? (
                          <strong key={cIdx} className="text-white font-semibold">
                            {chunk}
                          </strong>
                        ) : (
                          chunk
                        )
                      );
                    })}
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
                <span className="font-semibold text-slate-200">{article.readingTimeMinutes || 5} minutos</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Autor</span>
                <span className="font-semibold text-slate-200">{article.author}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md hover:shadow-amber-500/20"
              >
                <Share2 size={15} />
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

      {/* Modal Interativo: Compartilhar com a Equipe por E-mail (Resend) e Notificação */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => !sendingShare && setIsShareModalOpen(false)}
        title="Compartilhar Treinamento com a Equipe"
      >
        <form onSubmit={handleSendShare} className="space-y-4">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
              <Mail size={16} />
              <span>Disparo de E-mails e Notificação In-App</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Selecione os colaboradores que devem receber este treinamento. Eles receberão um e-mail estruturado via <strong>Resend</strong> com o link direto e uma notificação no painel de usuário.
            </p>
          </div>

          {/* Campo de Busca de Usuário */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-400">
                Selecione os Destinatários ({selectedUserIds.length} selecionado{selectedUserIds.length !== 1 ? 's' : ''})
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300"
              >
                {selectedUserIds.length === filteredTeamUsers.filter((u) => u.status === 'ATIVO').length && filteredTeamUsers.length > 0
                  ? 'Desmarcar Todos'
                  : 'Selecionar Todos'}
              </button>
            </div>

            <div className="relative mb-2.5">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Filtrar por nome, e-mail ou cargo..."
                className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Lista de Membros */}
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 border border-slate-800 rounded-2xl p-2 bg-slate-950/60 custom-scrollbar">
              {loadingUsers ? (
                <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-amber-500" />
                  <span>Carregando membros da equipe...</span>
                </div>
              ) : filteredTeamUsers.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  Nenhum membro encontrado com este termo.
                </div>
              ) : (
                filteredTeamUsers.map((user) => {
                  const isSelected = selectedUserIds.includes(user.id);
                  const isInactive = user.status !== 'ATIVO';

                  return (
                    <div
                      key={user.id}
                      onClick={() => !isInactive && handleToggleUser(user.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/40 text-white'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 text-slate-300'
                      } ${isInactive ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                            isSelected
                              ? 'bg-amber-500 border-amber-500 text-slate-950'
                              : 'border-slate-600 bg-slate-800'
                          }`}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>

                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
                          {user.name.slice(0, 1).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold truncate">{user.name}</span>
                            <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.2 rounded font-medium">
                              {user.role}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block truncate">{user.email}</span>
                        </div>
                      </div>

                      {user.department && (
                        <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded font-semibold shrink-0 ml-2">
                          {user.department}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Mensagem Opcional / Nota de Recomendação */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Mensagem Personalizada (Opcional)
            </label>
            <textarea
              rows={3}
              value={shareNote}
              onChange={(e) => setShareNote(e.target.value)}
              placeholder="Ex: Pessoal, atenção especial ao passo a passo da Fase 2 para as reuniões de amanhã..."
              className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Ações do Modal */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={sendingShare}
              onClick={() => setIsShareModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={sendingShare || selectedUserIds.length === 0}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 transition-all disabled:opacity-50 shadow-md hover:shadow-amber-500/20"
            >
              {sendingShare ? (
                <>
                  <Loader2 size={14} className="animate-spin text-slate-950" />
                  <span>Despachando E-mails...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Enviar Recomendação ({selectedUserIds.length})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
