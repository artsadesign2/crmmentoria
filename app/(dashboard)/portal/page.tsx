'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Member, INITIAL_MEMBERS } from '@/lib/mock-data';
import { useTheme } from '@/lib/theme-context';
import { generateRocketAiDiagnosis, DiagnosisReport } from '@/lib/ai-copilot';
import { DEFAULT_TENANT } from '@/lib/tenant';

export default function MenteePortalPage() {
  const { isLightMode, activePalette } = useTheme();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'goals' | 'academy' | 'financial' | 'diagnosis'>('overview');
  const [aiReport, setAiReport] = useState<DiagnosisReport | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [brandName, setBrandName] = useState(DEFAULT_TENANT.company.tradeName);

  // Dynamic state of mentee goals
  const [menteeGoals, setMenteeGoals] = useState<
    Array<{ id: string; title: string; category: string; xp: number; done: boolean; deadline: string }>
  >([
    { id: 'g1', title: 'Gravar 3 novos criativos de vendas de alta conversão', category: 'Tráfego', xp: 200, done: true, deadline: 'Semana 1' },
    { id: 'g2', title: 'Estruturar script de qualificação de leads com SDR', category: 'Comercial', xp: 350, done: true, deadline: 'Semana 2' },
    { id: 'g3', title: 'Testar e validar nova oferta de Upsell para base ativa', category: 'Oferta', xp: 250, done: false, deadline: 'Semana 3' },
    { id: 'g4', title: 'Documentar fluxo de Onboarding no Notion / CRM', category: 'CS / LTV', xp: 150, done: false, deadline: 'Semana 4' },
    { id: 'g5', title: 'Concluir módulo de Tráfego Perpétuo na Academy', category: 'Academy', xp: 300, done: false, deadline: 'Semana 4' },
  ]);

  useEffect(() => {
    try {
      const savedName = localStorage.getItem('rocket_club_company_tradename');
      if (savedName) setBrandName(savedName);
    } catch {}

    async function load() {
      try {
        const res = await fetch('/api/members');
        const data = await res.json();
        if (data.ok && data.members && data.members.length > 0) {
          setMembers(data.members);
          setSelectedMemberId(data.members[0].id);
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
  }, []);

  const currentMember = members.find((m) => m.id === selectedMemberId) || members[0] || INITIAL_MEMBERS[0];

  const totalXp = menteeGoals.filter((g) => g.done).reduce((acc, g) => acc + g.xp, 1250);
  const completedGoalsCount = menteeGoals.filter((g) => g.done).length;
  const progressPercent = Math.round((completedGoalsCount / menteeGoals.length) * 100);

  const handleToggleGoal = (id: string) => {
    setMenteeGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, done: !g.done } : g))
    );
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
    }, 800);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Mentee Switcher */}
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
                {currentMember?.avatar ? (
                  <img src={currentMember.avatar} alt={currentMember.name} className="w-full h-full object-cover" />
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
                <span className="text-slate-400">Próxima Patente: Diamante (2.500 XP)</span>
              </div>
            </div>
          </div>

          {/* Mentee Selector for Demonstration */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-400 block">
                Alternar Visão do Mentorado:
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 focus:outline-none focus:border-theme-primary"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#111728]">
                    {m.name} ({m.companyName || 'Empresa'})
                  </option>
                ))}
              </select>
            </div>

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
              <span>{generatingAi ? 'Diagnosticando...' : 'AI Co-Pilot de Mentoria'}</span>
            </button>
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div className="mt-6 pt-4 border-t border-[#1F293D] space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300">Progresso do Ciclo Atual de Metas</span>
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
          <div className="flex items-center justify-between">
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
          </div>

          <div className="space-y-2.5">
            {menteeGoals.map((goal) => (
              <div
                key={goal.id}
                onClick={() => handleToggleGoal(goal.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
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
                      <span>{goal.category}</span>
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
        <div className="p-5 sm:p-6 rounded-3xl bg-[#111728]/80 border border-[#1F293D] space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3
                className="text-xs font-black uppercase tracking-wider flex items-center gap-2"
                style={{ color: activePalette.tokens.primary }}
              >
                <DollarSign size={16} /> Fatura Atual da Mentoria & Pagamento
              </h3>
              <p className="text-xs text-slate-400">
                Efetue o pagamento da sua mensalidade via Pix instantâneo ou Cartão de Crédito.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Vencimento: 10/09/2026
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#0B0F17] border border-[#1F293D] space-y-2">
              <span className="text-xs text-slate-400">Valor da Mensalidade:</span>
              <div className="text-2xl font-black text-slate-100">R$ 5.000,00</div>
              <p className="text-[11px] text-slate-500">Ciclo Anual de Aceleração</p>
            </div>

            <div
              className="p-5 rounded-2xl bg-[#0B0F17] border space-y-3 md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-4"
              style={{ borderColor: activePalette.tokens.primary + '50' }}
            >
              <div className="space-y-1 text-center sm:text-left">
                <span
                  className="text-xs font-bold uppercase"
                  style={{ color: activePalette.tokens.primary }}
                >
                  Pagamento Instantâneo via Pix:
                </span>
                <p className="text-xs text-slate-300">
                  Liberação e pontuação de XP imediata na confirmação do pagamento.
                </p>
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
                <span>Pagar via Pix / Cartão</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
