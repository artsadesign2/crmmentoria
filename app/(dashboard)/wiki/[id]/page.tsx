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
  Globe,
  Image as ImageIcon,
} from 'lucide-react';
import { INITIAL_WIKI_ARTICLES, WikiArticleItem, getArticleCover } from '@/lib/wiki/wiki-service';
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

  // Modal Compartilhar nas Redes Sociais
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);

  // Modal Compartilhar com a Equipe (Interno)
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

  // Carrega lista de usuários ao abrir o modal de compartilhamento com a equipe
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

  const handleShareSocial = (platform: 'whatsapp' | 'linkedin' | 'twitter' | 'telegram') => {
    if (!article || typeof window === 'undefined') return;

    const currentUrl = window.location.href;
    const shareMessage = `Confira este treinamento na Base de Conhecimento do Rocket Club:\n*${article.title}* (${article.department} • ${article.category})\n\n${currentUrl}`;

    let shareUrl = '';
    if (platform === 'whatsapp') {
      shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
    } else if (platform === 'linkedin') {
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`;
    } else if (platform === 'twitter') {
      shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Confira "${article.title}" na Base de Conhecimento do Rocket Club:`)}&url=${encodeURIComponent(currentUrl)}`;
    } else if (platform === 'telegram') {
      shareUrl = `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(article.title)}`;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
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
  const articleCover = getArticleCover(article);

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
          {/* Botão Compartilhar nas Redes Sociais */}
          <button
            onClick={() => setIsSocialModalOpen(true)}
            className="px-3.5 py-2 bg-[#131B2E] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm"
          >
            <Share2 size={14} className="text-amber-400" />
            <span>Compartilhar nas Redes</span>
          </button>

          {/* Botão Copiar Link */}
          <button
            onClick={handleCopyLink}
            className="p-2 bg-[#131B2E] hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            title="Copiar link"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar Link'}</span>
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

          {/* Player de Vídeo Incorporado OU Imagem de Capa do Artigo */}
          {youtubeId ? (
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
          ) : (
            <div className="relative w-full h-64 sm:h-80 md:h-96 rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
              <img
                src={articleCover}
                alt={article.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent opacity-70" />
              <div className="absolute bottom-4 left-6 flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-slate-950/80 backdrop-blur-md text-amber-400 border border-amber-500/30 px-3.5 py-1.5 rounded-xl">
                  {article.category} &bull; {article.department}
                </span>
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
              {/* Botão Único e Exclusivo de Compartilhar com a Equipe */}
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center justify-center space-x-2 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md hover:shadow-amber-500/20"
              >
                <Users size={15} />
                <span>Compartilhar com a Equipe</span>
              </button>
            </div>
          </div>

          {/* Artigos Relacionados com Thumbnail */}
          <div className="bg-[#0F172A]/90 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
              <BookOpen size={14} className="text-amber-400" />
              <span>Outros Artigos da Wiki</span>
            </h3>

            <div className="space-y-3">
              {relatedArticles.map((rel) => {
                const relCover = getArticleCover(rel);

                return (
                  <Link
                    key={rel.id}
                    href={`/wiki/${rel.id}`}
                    className="group flex items-center gap-3 p-3 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/30 rounded-2xl transition-all overflow-hidden"
                  >
                    <div className="w-16 h-14 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700/60">
                      <img
                        src={relCover}
                        alt={rel.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-amber-400 uppercase">
                          {rel.category}
                        </span>
                        <span className="text-slate-500">{rel.createdAt}</span>
                      </div>
                      <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                        {rel.title}
                      </h4>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Compartilhar nas Redes Sociais */}
      <Modal
        isOpen={isSocialModalOpen}
        onClose={() => setIsSocialModalOpen(false)}
        title="Compartilhar nas Redes Sociais"
      >
        <div className="space-y-5">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded">
              {article.category} &bull; {article.department}
            </span>
            <h4 className="text-sm font-bold text-white leading-snug">{article.title}</h4>
            <p className="text-xs text-slate-400 line-clamp-2">{article.summary}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* WhatsApp */}
            <button
              onClick={() => handleShareSocial('whatsapp')}
              className="p-3.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 hover:border-[#25D366]/50 rounded-2xl flex items-center space-x-3 transition-all group text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-sm">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-5.805 1.554zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white group-hover:text-[#25D366] transition-colors">
                  WhatsApp
                </div>
                <div className="text-[11px] text-slate-400">Conversas & Grupos</div>
              </div>
            </button>

            {/* LinkedIn */}
            <button
              onClick={() => handleShareSocial('linkedin')}
              className="p-3.5 bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 border border-[#0A66C2]/30 hover:border-[#0A66C2]/50 rounded-2xl flex items-center space-x-3 transition-all group text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-[#0A66C2] text-white flex items-center justify-center shrink-0 shadow-sm">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white group-hover:text-[#0A66C2] transition-colors">
                  LinkedIn
                </div>
                <div className="text-[11px] text-slate-400">Feed & Conexões</div>
              </div>
            </button>

            {/* X / Twitter */}
            <button
              onClick={() => handleShareSocial('twitter')}
              className="p-3.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-2xl flex items-center space-x-3 transition-all group text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-black border border-slate-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                  X / Twitter
                </div>
                <div className="text-[11px] text-slate-400">Post & Comunidade</div>
              </div>
            </button>

            {/* Telegram */}
            <button
              onClick={() => handleShareSocial('telegram')}
              className="p-3.5 bg-[#229ED9]/10 hover:bg-[#229ED9]/20 border border-[#229ED9]/30 hover:border-[#229ED9]/50 rounded-2xl flex items-center space-x-3 transition-all group text-left"
            >
              <div className="w-8 h-8 rounded-xl bg-[#229ED9] text-white flex items-center justify-center shrink-0 shadow-sm">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white group-hover:text-[#229ED9] transition-colors">
                  Telegram
                </div>
                <div className="text-[11px] text-slate-400">Canais & Grupos</div>
              </div>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            <label className="text-xs font-semibold text-slate-400">Link Direto do Artigo</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={typeof window !== 'undefined' ? window.location.href : ''}
                className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono select-all focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 shrink-0 transition-colors shadow-sm"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

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
