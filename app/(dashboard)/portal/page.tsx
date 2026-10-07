'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Rocket,
  Award,
  Target,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  TrendingUp,
  DollarSign,
  QrCode,
  CreditCard,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  Shield,
  Activity,
  Play,
  Flame,
  Check,
  RefreshCw,
  Users,
  Plus,
  Pencil,
  Copy,
  FileText,
  X,
  Lock,
  Download,
  AlertCircle,
  Eye,
  Trash2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Member, INITIAL_MEMBERS } from '@/lib/mock-data';
import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { generateRocketAiDiagnosis, DiagnosisReport } from '@/lib/ai-copilot';
import { DEFAULT_TENANT } from '@/lib/tenant';

interface MenteeGoal {
  id: string;
  title: string;
  category: string;
  xp: number;
  done: boolean;
  deadline: string;
}

export default function MenteePortalPage() {
  const { isLightMode, activePalette } = useTheme();
  const { currentUser, currentRole, isMaster, isAdmin, simulatedBy, switchMenteeSimulation } = useAuth();
  const isSimulating = Boolean(simulatedBy);
  const [members, setMembers] = useState<Member[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('rocket_club_cached_members');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return INITIAL_MEMBERS;
  });
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'goals' | 'academy' | 'diagnosis' | 'financial'>('overview');
  const [aiReport, setAiReport] = useState<DiagnosisReport | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [brandName, setBrandName] = useState(DEFAULT_TENANT.company.tradeName);

  // Dynamic state of mentee goals
  const [menteeGoals, setMenteeGoals] = useState<MenteeGoal[]>([
    { id: 'g1', title: 'Gravar 3 novos criativos de vendas de alta conversão', category: 'Tráfego', xp: 200, done: true, deadline: 'Semana 1' },
    { id: 'g2', title: 'Estruturar script de qualificação de leads com SDR', category: 'Comercial', xp: 350, done: true, deadline: 'Semana 2' },
    { id: 'g3', title: 'Testar e validar nova oferta de Upsell para base ativa', category: 'Oferta', xp: 250, done: false, deadline: 'Semana 3' },
    { id: 'g4', title: 'Documentar fluxo de Onboarding no Notion / CRM', category: 'CS / LTV', xp: 150, done: false, deadline: 'Semana 4' },
    { id: 'g5', title: 'Concluir módulo de Tráfego Perpétuo na Academy', category: 'Academy', xp: 300, done: false, deadline: 'Semana 4' },
  ]);

  // Master Maintenance Feedback Note
  const [mentorFeedback, setMentorFeedback] = useState<string>(
    'Foco absoluto deste ciclo: estruturar e colocar para rodar o script de qualificação do SDR para liberar o tempo do Closer e dobrar o fechamento de propostas High Ticket.'
  );

  // Modals state
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('Comercial');
  const [newGoalXp, setNewGoalXp] = useState(250);
  const [newGoalDeadline, setNewGoalDeadline] = useState('Semana 3');

  const [isEditFeedbackModalOpen, setIsEditFeedbackModalOpen] = useState(false);
  const [tempFeedback, setTempFeedback] = useState(mentorFeedback);

  const [copiedPix, setCopiedPix] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    try {
      const savedName = localStorage.getItem('rocket_club_company_tradename');
      if (savedName) setBrandName(savedName);

      const savedGoals = localStorage.getItem('rocket_club_portal_goals');
      if (savedGoals) setMenteeGoals(JSON.parse(savedGoals));

      const savedFeedback = localStorage.getItem('rocket_club_mentor_feedback');
      if (savedFeedback) setMentorFeedback(savedFeedback);
    } catch {}

    async function load() {
      try {
        const res = await fetch('/api/members');
        const data = await res.json();
        if (data.ok && data.members && data.members.length > 0) {
          setMembers(data.members);
          // If Cliente, find matching member
          if (currentUser && currentRole === 'Cliente') {
            const found = data.members.find(
              (m: Member) =>
                (m.email && m.email.toLowerCase() === currentUser.email?.toLowerCase()) ||
                (m.name && m.name.toLowerCase() === currentUser.name?.toLowerCase()) ||
                m.id === currentUser.id
            );
            if (found) setSelectedMemberId(found.id);
            else setSelectedMemberId(data.members[0].id);
          } else {
            setSelectedMemberId(data.members[0].id);
          }
        } else {
          setMembers(INITIAL_MEMBERS);
          setSelectedMemberId(INITIAL_MEMBERS[0].id);
        }
      } catch {
        setMembers(INITIAL_MEMBERS);
        setSelectedMemberId(INITIAL_MEMBERS[0].id);
      }
    }
    load();
  }, [currentUser, currentRole]);

  const currentMember = useMemo(() => {
    if (currentUser && currentRole === 'Cliente' && !isMaster && !isAdmin && !isSimulating) {
      const found = members.find(
        (m) =>
          (m.email && m.email.toLowerCase() === currentUser.email?.toLowerCase()) ||
          (m.name && m.name.toLowerCase() === currentUser.name?.toLowerCase()) ||
          m.id === currentUser.id
      );
      if (found) return found;
    }
    return members.find((m) => m.id === selectedMemberId) || members[0] || INITIAL_MEMBERS[0];
  }, [members, selectedMemberId, currentUser, currentRole, isMaster, isAdmin, isSimulating]);

  const totalXp = menteeGoals.filter((g) => g.done).reduce((acc, g) => acc + g.xp, 1250);
  const completedGoalsCount = menteeGoals.filter((g) => g.done).length;
  const progressPercent = menteeGoals.length > 0 ? Math.round((completedGoalsCount / menteeGoals.length) * 100) : 0;

  const handleToggleGoal = (id: string) => {
    setMenteeGoals((prev) => {
      const updated = prev.map((g) => (g.id === id ? { ...g, done: !g.done } : g));
      try {
        localStorage.setItem('rocket_club_portal_goals', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast('Status da meta atualizado!');
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    const newGoal: MenteeGoal = {
      id: `g-${Date.now()}`,
      title: newGoalTitle.trim(),
      category: newGoalCategory,
      xp: Number(newGoalXp) || 200,
      done: false,
      deadline: newGoalDeadline,
    };

    setMenteeGoals((prev) => {
      const updated = [...prev, newGoal];
      try {
        localStorage.setItem('rocket_club_portal_goals', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setNewGoalTitle('');
    setIsAddGoalModalOpen(false);
    showToast('Nova meta adicionada com sucesso ao plano do mentorado!');
  };

  const handleDeleteGoal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenteeGoals((prev) => {
      const updated = prev.filter((g) => g.id !== id);
      try {
        localStorage.setItem('rocket_club_portal_goals', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast('Meta removida do plano.');
  };

  const handleSaveMentorFeedback = () => {
    setMentorFeedback(tempFeedback);
    try {
      localStorage.setItem('rocket_club_mentor_feedback', tempFeedback);
    } catch {}
    setIsEditFeedbackModalOpen(false);
    showToast('Parecer do Mentor atualizado com sucesso!');
  };

  const handleRunAiDiagnosis = () => {
    setGeneratingAi(true);
    setTimeout(() => {
      const rep = generateRocketAiDiagnosis({
        menteeId: currentMember.id,
        menteeName: currentMember.name,
        companyName: currentMember.companyName || currentMember.tradeName || 'Empresa em Escala',
        monthlyRevenue: currentMember.monthlyRevenue || 'R$ 80.000/mês',
        mainGoal: currentMember.mainGoal || 'Escalar faturamento e estruturar time comercial',
        biggestChallenge: currentMember.biggestChallenge || 'Gargalo no fechamento de vendas',
      });
      setAiReport(rep);
      setGeneratingAi(false);
      setActiveTab('diagnosis');
      showToast('Diagnóstico AI 360° gerado com sucesso!');
    }, 800);
  };

  const handleCopyPix = () => {
    const pixPayload = '00020126580014br.gov.bcb.pix0136rocketclub@mentoria.com.br5204000053039865802BR5925ROCKET CLUB MENTORIA6009SAO PAULO62070503***6304E2B1';
    navigator.clipboard.writeText(pixPayload);
    setCopiedPix(true);
    showToast('Código Pix Copia e Cola copiado para a área de transferência!');
    setTimeout(() => setCopiedPix(false), 3000);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="px-4 py-3 rounded-2xl bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 shadow-2xl flex items-center gap-3 text-xs font-bold">
            <CheckCircle2 size={16} />
            <span>{toastMsg.text}</span>
          </div>
        </div>
      )}

      {/* Top Banner & Mentee Overview */}
      <div
        className="p-6 sm:p-8 rounded-3xl border relative overflow-hidden shadow-2xl"
        style={{
          backgroundColor: activePalette.tokens.surface,
          borderColor: activePalette.tokens.surfaceBorder,
        }}
      >
        <div
          className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: activePalette.tokens.primary }}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl font-black shadow-xl overflow-hidden border-2"
                style={{
                  backgroundColor: activePalette.tokens.badgeBg,
                  borderColor: activePalette.tokens.primary,
                  boxShadow: `0 8px 25px ${activePalette.tokens.glow}`,
                }}
              >
                {currentMember?.avatar || currentMember?.coverImage ? (
                  <img
                    src={currentMember.coverImage || currentMember.avatar}
                    alt={currentMember.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  '🚀'
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 text-base" title="Mentorado Ativo">
                ⚡
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-100">{currentMember?.name}</h1>
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase"
                  style={{
                    backgroundColor: activePalette.tokens.badgeBg,
                    color: activePalette.tokens.primary,
                    border: `1px solid ${activePalette.tokens.badgeBorder}`,
                  }}
                >
                  ⭐ Membro em Aceleração
                </span>
                {isSimulating && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Modo Manutenção Ativo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {currentMember?.companyName || currentMember?.tradeName} •{' '}
                <span style={{ color: activePalette.tokens.primary }} className="font-semibold">
                  {currentMember?.specialty}
                </span>
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs text-slate-300">
                <span className="font-mono font-bold" style={{ color: activePalette.tokens.primary }}>
                  {totalXp} XP Acumulado
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">Patente: Diamante (Próxima: Black Rocket)</span>
              </div>
            </div>
          </div>

          {/* Quick Mentee Actions / Maintenance Toolbar for Master */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {(isMaster || isAdmin || isSimulating) && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 block">
                  Alternar Mentorado para Manutenção:
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 focus:outline-none focus:border-yellow-500"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#111728]">
                      {m.name} ({m.companyName || 'Empresa'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleRunAiDiagnosis}
              disabled={generatingAi}
              className="px-4 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all self-end sm:self-auto hover:scale-105"
              style={{
                backgroundColor: activePalette.tokens.primary,
                color: isLightMode ? '#FFFFFF' : '#0B0F17',
                boxShadow: `0 4px 15px ${activePalette.tokens.glow}`,
              }}
            >
              <Sparkles size={14} />
              <span>{generatingAi ? 'Diagnosticando...' : 'AI Co-Pilot 360°'}</span>
            </button>
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div className="mt-6 pt-4 border-t border-[#1F293D] space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300">Progresso do Ciclo de Metas</span>
            <span className="font-mono font-bold" style={{ color: activePalette.tokens.primary }}>
              {progressPercent}% Concluído ({completedGoalsCount}/{menteeGoals.length} Metas)
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#0B0F17] rounded-full overflow-hidden border border-[#1F293D]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: activePalette.tokens.primary,
              }}
            />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#1F293D]">
        {[
          { id: 'overview', label: '🚀 Visão Geral & Mural', icon: Rocket },
          { id: 'goals', label: '🎯 Metas & Sprints do Ciclo', icon: Target },
          { id: 'academy', label: '🎓 Academy & Aulas', icon: BookOpen },
          { id: 'diagnosis', label: '🤖 Diagnóstico & IA', icon: Sparkles },
          { id: 'financial', label: '💳 Mensalidades & Pix', icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 border ${
                isActive
                  ? 'shadow-lg'
                  : 'bg-[#111728]/70 border-[#1F293D] text-slate-400 hover:text-slate-200'
              }`}
              style={
                isActive
                  ? {
                      backgroundColor: activePalette.tokens.primary,
                      color: isLightMode ? '#FFFFFF' : '#0B0F17',
                      borderColor: activePalette.tokens.primary,
                      boxShadow: `0 4px 15px ${activePalette.tokens.glow}`,
                    }
                  : {}
              }
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: VISÃO GERAL & MURAL DE CONQUISTAS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Parecer do Mentor & Orientações Estratégicas */}
          <div
            className="p-5 sm:p-6 rounded-3xl bg-[#111728]/90 border space-y-3 relative overflow-hidden shadow-xl"
            style={{ borderColor: activePalette.tokens.primary + '50' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧭</span>
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                  Parecer Executivo & Foco Estratégico do Mentor
                </h3>
              </div>

              {(isMaster || isAdmin || isSimulating) && (
                <button
                  onClick={() => {
                    setTempFeedback(mentorFeedback);
                    setIsEditFeedbackModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#0B0F17] hover:bg-[#1E293B] border border-[#1F293D] text-xs font-bold text-slate-200 flex items-center gap-1 transition-all"
                >
                  <Pencil size={12} />
                  <span>Editar Parecer</span>
                </button>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-[#0B0F17]/80 p-4 rounded-2xl border border-[#1F293D]">
              "{mentorFeedback}"
            </p>
          </div>

          {/* Mural de Conquistas & Insígnias */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#111728]/80 border border-[#1F293D] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className="text-sm sm:text-base font-black uppercase tracking-wider flex items-center gap-2"
                  style={{ color: activePalette.tokens.primary }}
                >
                  <Award size={18} /> Mural de Conquistas & Insígnias de Prestígio
                </h3>
                <p className="text-xs text-slate-400">
                  Insígnias desbloqueadas pelo mentorado durante a sua jornada de aceleração.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">5 / 6 Desbloqueados</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {[
                { title: 'Primeiro 100k', desc: 'Faturamento de 6 dígitos no mês', icon: '🥇', date: '15/07/2026', unlocked: true },
                { title: 'Oferta High Ticket', desc: 'Funil comercial validado com previsibilidade', icon: '⚡', date: '02/08/2026', unlocked: true },
                { title: 'Closer de Elite', desc: 'Taxa de fechamento acima de 30%', icon: '🎯', date: '10/08/2026', unlocked: true },
                { title: 'Academy Master', desc: 'Mais de 75% dos cursos assistidos', icon: '🎓', date: '20/08/2026', unlocked: true },
                { title: 'Presença VIP', desc: 'Participação ativa nas imersões', icon: '🌟', date: '24/08/2026', unlocked: true },
                { title: 'Escala 500k+', desc: 'Operação faturando meio milhão', icon: '🛸', date: 'Em progresso', unlocked: false },
              ].map((badge, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                    badge.unlocked
                      ? 'bg-[#0B0F17] shadow-lg'
                      : 'bg-[#0B0F17]/40 border-[#1F293D] opacity-60'
                  }`}
                  style={
                    badge.unlocked
                      ? {
                          borderColor: activePalette.tokens.primary + '50',
                        }
                      : {}
                  }
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 border"
                    style={{
                      backgroundColor: badge.unlocked ? activePalette.tokens.badgeBg : '#1E293B',
                      borderColor: badge.unlocked ? activePalette.tokens.badgeBorder : '#334155',
                    }}
                  >
                    {badge.icon}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-slate-100">{badge.title}</span>
                      {badge.unlocked && <CheckCircle2 size={13} className="text-emerald-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">{badge.desc}</p>
                    <span className="text-[9px] font-mono text-slate-500 block pt-0.5">
                      {badge.unlocked ? `Conquistado em ${badge.date}` : '🔒 Próximo Nível'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Matriz dos 5 Pilares de Negócios */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#111728]/80 border border-[#1F293D] space-y-4">
            <h3
              className="text-xs font-black uppercase tracking-wider flex items-center gap-2"
              style={{ color: activePalette.tokens.primary }}
            >
              <TrendingUp size={16} /> Maturidade nos 5 Pilares Estratégicos
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[
                { name: '1. Oferta High Ticket', score: 8.5, color: 'text-amber-400', bar: 'bg-amber-400' },
                { name: '2. Tráfego & Funis', score: 7.0, color: 'text-blue-400', bar: 'bg-blue-400' },
                { name: '3. Comercial & Vendas', score: 8.0, color: 'text-emerald-400', bar: 'bg-emerald-400' },
                { name: '4. Entrega, CS & LTV', score: 9.0, color: 'text-purple-400', bar: 'bg-purple-400' },
                { name: '5. Gestão & Escala', score: 6.5, color: 'text-rose-400', bar: 'bg-rose-400' },
              ].map((p, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-[#0B0F17] border border-[#1F293D] space-y-2">
                  <div className="text-[11px] font-bold text-slate-300 truncate">{p.name}</div>
                  <div className="flex items-baseline justify-between">
                    <span className={`text-sm font-black font-mono ${p.color}`}>Nota {p.score}</span>
                    <span className="text-[10px] text-slate-500">/ 10</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#1F293D] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${p.bar}`} style={{ width: `${p.score * 10}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: METAS DO CICLO */}
      {activeTab === 'goals' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-[#111728]/80 border border-[#1F293D] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3
                className="text-xs font-black uppercase tracking-wider flex items-center gap-2"
                style={{ color: activePalette.tokens.primary }}
              >
                <Target size={16} /> Metas Smart & Checkpoints de Aceleração
              </h3>
              <p className="text-xs text-slate-400">
                Clique nas tarefas para marcar como concluídas e acumular XP.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className="text-xs font-mono font-bold px-3 py-1 rounded-xl border"
                style={{
                  backgroundColor: activePalette.tokens.badgeBg,
                  color: activePalette.tokens.primary,
                  borderColor: activePalette.tokens.badgeBorder,
                }}
              >
                +{completedGoalsCount * 250} XP Ganhos
              </span>

              {(isMaster || isAdmin || isSimulating) && (
                <button
                  onClick={() => setIsAddGoalModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md hover:scale-105 transition-all"
                  style={{
                    backgroundColor: activePalette.tokens.primary,
                    color: isLightMode ? '#FFFFFF' : '#0B0F17',
                  }}
                >
                  <Plus size={14} />
                  <span>Nova Meta</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            {menteeGoals.map((goal) => (
              <div
                key={goal.id}
                onClick={() => handleToggleGoal(goal.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                  goal.done
                    ? 'bg-[#0B0F17]/50 border-emerald-500/30'
                    : 'bg-[#0B0F17] border-[#1F293D] hover:border-slate-500 shadow-md'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                      goal.done
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-transparent border-slate-600'
                    }`}
                  >
                    {goal.done && <Check size={14} className="font-bold" />}
                  </div>
                  <div>
                    <span
                      className={`text-xs font-bold ${
                        goal.done ? 'text-slate-400 line-through' : 'text-slate-100'
                      }`}
                    >
                      {goal.title}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span className="font-semibold text-slate-400">{goal.category}</span>
                      <span>•</span>
                      <span>Prazo: {goal.deadline}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      goal.done
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {goal.done ? 'Concluída' : 'Em Execução'}
                  </span>
                  <span
                    className="font-mono text-xs font-black"
                    style={{ color: activePalette.tokens.primary }}
                  >
                    +{goal.xp} XP
                  </span>

                  {(isMaster || isAdmin || isSimulating) && (
                    <button
                      onClick={(e) => handleDeleteGoal(goal.id, e)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      title="Excluir meta"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ACADEMY */}
      {activeTab === 'academy' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-[#111728]/80 border border-[#1F293D] space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3
                className="text-xs font-black uppercase tracking-wider flex items-center gap-2"
                style={{ color: activePalette.tokens.primary }}
              >
                <BookOpen size={16} /> Aulas Recomendadas para seu Momento de Escala
              </h3>
              <p className="text-xs text-slate-400">
                Trilhas selecionadas estrategicamente com base nos seus gargalos diagnosticados.
              </p>
            </div>
            <Link
              href="/academy"
              className="text-xs font-bold flex items-center gap-1 hover:underline"
              style={{ color: activePalette.tokens.primary }}
            >
              Ver Todas as Aulas <ExternalLink size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: 'Construção da Máquina Comercial High Ticket',
                course: 'Módulo de Vendas & Closer',
                duration: '45 min',
                progress: 100,
                tag: 'Recomendado para Gargalo Comercial',
              },
              {
                title: 'Tráfego Perpétuo & Validação de Criativos',
                course: 'Módulo de Aquisição & Funis',
                duration: '60 min',
                progress: 60,
                tag: 'Acelerador de Leads',
              },
              {
                title: 'Governança Financeira, DRE & Contratações',
                course: 'Módulo de Gestão & Escala',
                duration: '50 min',
                progress: 0,
                tag: 'Próxima Aula',
              },
              {
                title: 'Experiência do Cliente & Estratégias de LTV',
                course: 'Módulo de CS & Entrega',
                duration: '40 min',
                progress: 100,
                tag: 'Concluído',
              },
            ].map((lesson, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#0B0F17] border border-[#1F293D] hover:border-slate-500 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <span
                    className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase"
                    style={{
                      backgroundColor: activePalette.tokens.badgeBg,
                      color: activePalette.tokens.primary,
                      border: `1px solid ${activePalette.tokens.badgeBorder}`,
                    }}
                  >
                    {lesson.tag}
                  </span>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-100">{lesson.title}</h4>
                  <p className="text-[11px] text-slate-400">
                    {lesson.course} • {lesson.duration}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#1F293D] flex items-center justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Progresso</span>
                      <span className="font-bold">{lesson.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#1F293D] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${lesson.progress}%`,
                          backgroundColor: activePalette.tokens.primary,
                        }}
                      />
                    </div>
                  </div>

                  <Link
                    href="/academy"
                    className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 shadow-sm"
                    style={{
                      backgroundColor: activePalette.tokens.primary,
                      color: isLightMode ? '#FFFFFF' : '#0B0F17',
                    }}
                  >
                    <Play size={12} />
                    <span>Assistir</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DIAGNÓSTICO IA */}
      {activeTab === 'diagnosis' && (
        <div className="space-y-6">
          {aiReport ? (
            <div className="p-5 sm:p-6 rounded-3xl bg-[#111728]/80 border border-[#1F293D] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1F293D]">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shadow"
                    style={{
                      backgroundColor: activePalette.tokens.badgeBg,
                      color: activePalette.tokens.primary,
                    }}
                  >
                    🤖
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-100">
                      Relatório Executivo AI Co-Pilot
                    </h3>
                    <p className="text-xs text-slate-400">
                      Diagnóstico 360° gerado para {aiReport.companyName}
                    </p>
                  </div>
                </div>
                <Badge variant="default" className="text-xs font-mono">
                  Score de Maturidade: {aiReport.maturityScore}%
                </Badge>
              </div>

              {/* Resumo */}
              <div
                className="p-4 rounded-2xl bg-[#0B0F17] border space-y-1.5"
                style={{ borderColor: activePalette.tokens.primary + '50' }}
              >
                <span
                  className="text-[10px] font-black uppercase tracking-wider block"
                  style={{ color: activePalette.tokens.primary }}
                >
                  Parecer do Co-Pilot:
                </span>
                <p className="text-xs text-slate-200 leading-relaxed">{aiReport.executiveSummary}</p>
              </div>

              {/* Plano de Ação 30 Dias */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                  Sprint Recomendado (30 Dias):
                </h4>
                <div className="space-y-2.5">
                  {aiReport.actionPlan30Days.map((act) => (
                    <div
                      key={act.id}
                      className="p-4 rounded-2xl bg-[#0B0F17] border border-[#1F293D] space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-extrabold text-xs text-slate-100">{act.title}</span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            backgroundColor: activePalette.tokens.badgeBg,
                            color: activePalette.tokens.primary,
                            border: `1px solid ${activePalette.tokens.badgeBorder}`,
                          }}
                        >
                          +{act.xpReward} XP
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{act.description}</p>
                      {act.recommendedLesson && (
                        <div
                          className="pt-2 border-t border-[#1F293D] flex items-center justify-between text-[11px]"
                          style={{ color: activePalette.tokens.primary }}
                        >
                          <span>🎓 Aula Sugerida: {act.recommendedLesson.title}</span>
                          <Link href="/academy" className="underline font-bold">
                            Abrir Aula
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-[#111728]/50 border border-[#1F293D] text-center space-y-3">
              <Sparkles size={36} className="mx-auto" style={{ color: activePalette.tokens.primary }} />
              <h3 className="text-base font-bold text-slate-200">Nenhum diagnóstico gerado ainda</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Clique no botão abaixo para gerar uma análise inteligente personalizada com base nos 5 pilares do seu negócio.
              </p>
              <button
                onClick={handleRunAiDiagnosis}
                className="px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all"
                style={{
                  backgroundColor: activePalette.tokens.primary,
                  color: isLightMode ? '#FFFFFF' : '#0B0F17',
                  boxShadow: `0 4px 15px ${activePalette.tokens.glow}`,
                }}
              >
                Gerar Diagnóstico AI Co-Pilot
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: MENSALIDADES & PIX */}
      {activeTab === 'financial' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-[#111728]/80 border border-[#1F293D] space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3
                className="text-xs font-black uppercase tracking-wider flex items-center gap-2"
                style={{ color: activePalette.tokens.primary }}
              >
                <DollarSign size={16} /> Fatura Atual da Mentoria & Pagamento
              </h3>
              <p className="text-xs text-slate-400">
                Efetue o pagamento da sua anuidade/mensalidade via Pix instantâneo ou Cartão de Crédito.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Status: Em Dia
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#0B0F17] border border-[#1F293D] space-y-2">
              <span className="text-xs text-slate-400">Valor do Ciclo:</span>
              <div className="text-2xl font-black text-slate-100">R$ 5.000,00</div>
              <p className="text-[11px] text-slate-500">Ciclo Anual de Aceleração 2026</p>
              <div className="pt-2 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>Próximo Vencimento: 10/11/2026</span>
              </div>
            </div>

            <div
              className="p-5 rounded-2xl bg-[#0B0F17] border space-y-3 md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-4"
              style={{ borderColor: activePalette.tokens.primary + '50' }}
            >
              <div className="space-y-1.5 text-center sm:text-left">
                <span
                  className="text-xs font-bold uppercase block"
                  style={{ color: activePalette.tokens.primary }}
                >
                  Pagamento Instantâneo via Pix Copia e Cola:
                </span>
                <p className="text-xs text-slate-300">
                  Liberação e pontuação de XP imediata na confirmação do pagamento.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <code className="px-2.5 py-1 bg-[#111728] border border-[#1F293D] rounded-lg text-[10px] font-mono text-slate-300 truncate max-w-[220px]">
                    00020126580014br.gov.bcb.pix0136...
                  </code>
                  <button
                    onClick={handleCopyPix}
                    className="px-2.5 py-1 rounded-lg bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 border border-yellow-500/30 text-[10px] font-bold flex items-center gap-1 transition-all"
                  >
                    {copiedPix ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedPix ? 'Copiado!' : 'Copiar Pix'}</span>
                  </button>
                </div>
              </div>

              <Link
                href="/financial"
                className="px-4 py-2.5 rounded-xl font-black text-xs shadow-lg hover:scale-105 transition-all flex items-center gap-2 shrink-0"
                style={{
                  backgroundColor: activePalette.tokens.primary,
                  color: isLightMode ? '#FFFFFF' : '#0B0F17',
                  boxShadow: `0 4px 15px ${activePalette.tokens.glow}`,
                }}
              >
                <QrCode size={16} />
                <span>Central Financeira</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Meta / Entregável (Master Maintenance) */}
      <Modal
        isOpen={isAddGoalModalOpen}
        onClose={() => setIsAddGoalModalOpen(false)}
        title="Adicionar Nova Meta ao Mentorado"
        subtitle={`Defina um objetivo com pontuação de XP para ${currentMember?.name}`}
        icon={<Target size={20} style={{ color: activePalette.tokens.primary }} />}
        size="md"
      >
        <form onSubmit={handleAddGoal} className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Título do Entregável / Meta:</label>
            <input
              type="text"
              required
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              placeholder="Ex: Validar novo roteiro de prospecção fria"
              className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-yellow-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Pilar / Categoria:</label>
              <select
                value={newGoalCategory}
                onChange={(e) => setNewGoalCategory(e.target.value)}
                className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-yellow-500"
              >
                <option value="Comercial">Comercial</option>
                <option value="Tráfego">Tráfego</option>
                <option value="Oferta">Oferta</option>
                <option value="CS / LTV">CS / LTV</option>
                <option value="Gestão">Gestão</option>
                <option value="Academy">Academy</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Recompensa (XP):</label>
              <input
                type="number"
                min="50"
                step="50"
                value={newGoalXp}
                onChange={(e) => setNewGoalXp(Number(e.target.value))}
                className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Prazo Estimado:</label>
              <input
                type="text"
                value={newGoalDeadline}
                onChange={(e) => setNewGoalDeadline(e.target.value)}
                placeholder="Ex: Semana 3"
                className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-yellow-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#1F293D] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddGoalModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0B0F17] hover:bg-[#1E293B] text-slate-300 border border-[#1F293D]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold shadow-md"
              style={{
                backgroundColor: activePalette.tokens.primary,
                color: isLightMode ? '#FFFFFF' : '#0B0F17',
              }}
            >
              Adicionar Meta
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Editar Parecer do Mentor (Master Maintenance) */}
      <Modal
        isOpen={isEditFeedbackModalOpen}
        onClose={() => setIsEditFeedbackModalOpen(false)}
        title="Editar Parecer Estratégico do Mentor"
        subtitle={`Defina as diretrizes prioritárias visíveis para ${currentMember?.name}`}
        icon={<Pencil size={20} style={{ color: activePalette.tokens.primary }} />}
        size="md"
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Parecer Executivo:</label>
            <textarea
              rows={5}
              value={tempFeedback}
              onChange={(e) => setTempFeedback(e.target.value)}
              placeholder="Descreva as prioridades estratégicas para o mentorado..."
              className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-yellow-500 resize-none leading-relaxed"
            />
          </div>

          <div className="pt-3 border-t border-[#1F293D] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditFeedbackModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0B0F17] hover:bg-[#1E293B] text-slate-300 border border-[#1F293D]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveMentorFeedback}
              className="px-4 py-2 rounded-xl text-xs font-bold shadow-md"
              style={{
                backgroundColor: activePalette.tokens.primary,
                color: isLightMode ? '#FFFFFF' : '#0B0F17',
              }}
            >
              Salvar Parecer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
