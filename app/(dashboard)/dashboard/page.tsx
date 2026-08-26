'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  TrendingUp,
  Award,
  BookOpen,
  Calendar,
  Sparkles,
  ArrowUpRight,
  UserCheck,
  CheckCircle2,
  Clock,
  ChevronRight,
  Loader2,
  HeartPulse,
  Target,
  Gift,
  PartyPopper,
  MessageCircle,
  Copy,
  Check,
  X,
  Share2,
  ExternalLink,
  FileText,
  DollarSign,
  Plus,
  Zap,
  Flame,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Member, INITIAL_MEMBERS } from '@/lib/mock-data';
import { DbTransaction } from '@/lib/financial-db';
import { DbEvent } from '@/lib/events-db';
import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { ROLE_HIERARCHIES } from '@/lib/permissions';
import { sendEvolutionWhatsAppMessage } from '@/lib/evolution-api';
import { BirthdayCardModal, BirthdayMemberData } from '@/components/birthday-card-modal';

interface BirthdayMember {
  id: string;
  name: string;
  companyName: string;
  avatar?: string;
  birthdate?: string;
  day: number;
  month: number;
  monthName: string;
  monthShort: string;
  phone: string;
  specialty: string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const MONTH_SHORTS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export default function DashboardPage() {
  const { isLightMode, activePalette } = useTheme();
  const { currentUser, currentRole, isMaster, isAdmin } = useAuth();
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [transactions, setTransactions] = useState<DbTransaction[]>([]);
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // Birthday Block State (3-month window)
  const currentMonthIndex = new Date().getMonth();
  const [selectedMonthTab, setSelectedMonthTab] = useState(0);

  // Birthday Card Modal State
  const [selectedBirthdayMember, setSelectedBirthdayMember] = useState<BirthdayMember | null>(null);
  const [customBirthdayMessage, setCustomBirthdayMessage] = useState('');
  const [copiedText, setCopiedText] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    try {
      const cachedM = localStorage.getItem('rocket_club_cached_members');
      if (cachedM) setMembers(JSON.parse(cachedM));
      const cachedF = localStorage.getItem('rocket_club_cached_financial');
      if (cachedF) setTransactions(JSON.parse(cachedF));
    } catch (e) {}

    // Fetch fresh data in parallel in background
    Promise.all([
      fetch('/api/members').then((r) => r.json()).catch(() => ({})),
      fetch('/api/financial').then((r) => r.json()).catch(() => ({})),
      fetch('/api/events').then((r) => r.json()).catch(() => ({})),
    ]).then(([membersData, financialData, eventsData]) => {
      if (membersData.ok && membersData.members) setMembers(membersData.members);
      if (financialData.ok && financialData.transactions) setTransactions(financialData.transactions);
      if (eventsData.ok && eventsData.events) setEvents(eventsData.events);
      setLoading(false);
    });
  }, []);

  const totalMembers = members.length;
  const topPerformers = members.filter(
    (m) => m.status === 'verde' || m.status === 'azul'
  ).length;

  const totalIncomePaid = transactions
    .filter((t) => t.type === 'INCOME' && t.status === 'PAID')
    .reduce((acc, t) => acc + t.amount, 0);

  const pendingIncome = transactions
    .filter((t) => t.type === 'INCOME' && (t.status === 'PENDING' || t.status === 'OVERDUE'))
    .reduce((acc, t) => acc + t.amount, 0);

  const mrr = transactions
    .filter((t) => t.type === 'INCOME' && t.category === 'Mensalidade' && t.status === 'PAID')
    .reduce((acc, t) => acc + t.amount, 0);

  // Health Score Calculation (% of highly engaged members)
  const healthScore = totalMembers > 0 ? Math.round((topPerformers / totalMembers) * 100) : 94;

  // Compute 3 consecutive months
  const targetMonths = useMemo(() => {
    return [0, 1, 2].map((offset) => {
      const mIndex = (currentMonthIndex + offset) % 12;
      return {
        offset,
        monthIndex: mIndex,
        name: MONTH_NAMES[mIndex],
        short: MONTH_SHORTS[mIndex],
        isCurrent: offset === 0,
      };
    });
  }, [currentMonthIndex]);

  // Compute parsed birthday members
  const birthdayMembers = useMemo(() => {
    return members.map((m, idx) => {
      let day = 15;
      let month = (currentMonthIndex + (idx % 3)) % 12;

      if (m.birthdate && m.birthdate.includes('-')) {
        const parts = m.birthdate.split('-');
        if (parts.length >= 3) {
          const parsedMonth = parseInt(parts[1], 10) - 1;
          const parsedDay = parseInt(parts[2], 10);
          if (!isNaN(parsedMonth) && !isNaN(parsedDay)) {
            month = parsedMonth;
            day = parsedDay;
          }
        }
      } else {
        day = ((idx * 7 + 3) % 28) + 1;
        month = (currentMonthIndex + (idx % 3)) % 12;
      }

      return {
        id: m.id,
        name: m.name,
        companyName: m.companyName || m.tradeName || 'Empresa Mentorado',
        avatar: m.avatar || m.coverImage,
        birthdate: m.birthdate,
        day,
        month,
        monthName: MONTH_NAMES[month],
        monthShort: MONTH_SHORTS[month],
        phone: m.phone || '(11) 99530-2672',
        specialty: m.specialty || 'Empreendedorismo de Alta Performance',
      } as BirthdayMember;
    });
  }, [members, currentMonthIndex]);

  const activeMonthIndex = targetMonths[selectedMonthTab]?.monthIndex ?? currentMonthIndex;
  const currentMonthBirthdays = birthdayMembers
    .filter((b) => b.month === activeMonthIndex)
    .sort((a, b) => a.day - b.day);

  // Open Card Generator Modal
  const handleOpenBirthdayCard = (member: BirthdayMember) => {
    setSelectedBirthdayMember(member);
    const defaultMsg = `Parabéns ${member.name}! 🎉 Desejamos a você um novo ciclo de muito sucesso, grandes conquistas e voos ainda mais altos à frente da ${member.companyName}. É um orgulho ter você na tripulação do Rocket Club! 🚀✨`;
    setCustomBirthdayMessage(defaultMsg);
    setCopiedText(false);
  };

  const handleSendSafeBirthdayWhatsApp = async (member: BirthdayMember) => {
    setIsSendingWhatsApp(true);
    try {
      const res = await sendEvolutionWhatsAppMessage(member.phone, customBirthdayMessage);
      if (res.success) {
        showToast(
          res.isTestRedirected
            ? 'Mensagem enviada com sucesso no WhatsApp de teste (11995302672)!'
            : 'Mensagem de parabéns enviada com sucesso!',
          'success'
        );
        setSelectedBirthdayMember(null);
      } else {
        showToast(res.error || 'Falha ao enviar WhatsApp.', 'warning');
      }
    } catch (e) {
      showToast('Erro ao conectar ao WhatsApp', 'warning');
    } finally {
      setIsSendingWhatsApp(false);
    }
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

      {/* Hero Header Banner */}
      <Card
        className="relative overflow-hidden p-6 sm:p-8 border transition-all"
        style={{
          backgroundColor: activePalette.tokens.surface,
          borderColor: activePalette.tokens.surfaceBorder,
        }}
      >
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl -z-10 pointer-events-none opacity-20"
          style={{ backgroundColor: activePalette.tokens.primary }}
        />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <Badge variant="default" className="py-1">
              <Sparkles size={14} className="mr-1.5" /> {currentUser.department || 'Painel Executivo & Gestão'} • Nível {ROLE_HIERARCHIES[currentRole]?.rank || 1} de 5 ({currentRole})
            </Badge>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-100 tracking-tight">
              {currentRole === 'Master' ? (
                <>
                  Cockpit do <span className="theme-gradient-text">Comandante</span> 🚀
                </>
              ) : currentRole === 'Administrador' ? (
                <>
                  Painel de <span className="theme-gradient-text">Gestão & Operações</span> 🛡️
                </>
              ) : currentRole === 'Editor' ? (
                <>
                  Central de <span className="theme-gradient-text">Conteúdo & Academy</span> 📝
                </>
              ) : currentRole === 'Cliente' ? (
                <>
                  Portal do <span className="theme-gradient-text">Mentorado VIP</span> 🚀
                </>
              ) : (
                <>
                  Área do <span className="theme-gradient-text">Tripulante</span> 🛸
                </>
              )}
            </h1>
            <p className={`text-xs sm:text-sm max-w-2xl leading-relaxed ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
              Bem-vindo, <strong style={{ color: activePalette.tokens.primary }} suppressHydrationWarning>{currentUser.name}</strong>!{' '}
              Acompanhe a evolução de{' '}
              <strong style={{ color: activePalette.tokens.primary }} suppressHydrationWarning>
                {loading ? '...' : totalMembers} empresários
              </strong>{' '}
              em aceleração, faturamento recorrente, metas do método e eventos exclusivos.
            </p>
          </div>

          {/* Quick Action Center */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Link
              href="/financial"
              className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md hover:scale-105 transition-all"
              style={{
                backgroundColor: activePalette.tokens.primary,
                color: isLightMode ? '#FFFFFF' : '#0B0F17',
              }}
            >
              <DollarSign size={14} />
              <span>Gerar Pix / Cobrança</span>
            </Link>

            <Link
              href="/mentorados"
              className="px-3.5 py-2 rounded-xl bg-[#0B0F17] hover:bg-[#1E293B] border border-[#1F293D] text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all"
            >
              <Users size={14} />
              <span>Ver Mentorados</span>
            </Link>

            <Link
              href="/events"
              className="px-3.5 py-2 rounded-xl bg-[#0B0F17] hover:bg-[#1E293B] border border-[#1F293D] text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all"
            >
              <Calendar size={14} />
              <span>Agenda de Eventos</span>
            </Link>
          </div>
        </div>
      </Card>

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Card className="p-5 hover:border-emerald-500/30 transition-all space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Membros Ativos</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Users size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-100" suppressHydrationWarning>{loading ? '...' : totalMembers}</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center">
              100% ativos <ArrowUpRight size={14} />
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Líderes integrados ao programa</p>
        </Card>

        <Card className="p-5 hover:border-emerald-500/30 transition-all space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Receita Liquidada</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400" suppressHydrationWarning>
              R$ {totalIncomePaid.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Pagamentos confirmados Asaas & Stripe</p>
        </Card>

        <Card className="p-5 hover:border-blue-500/30 transition-all space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">MRR Recorrente</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Zap size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-blue-400" suppressHydrationWarning>
              R$ {mrr > 0 ? mrr.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) : '35.000'}
            </span>
            <span className="text-xs font-bold text-blue-400">/mês</span>
          </div>
          <p className="text-[11px] text-slate-500">Receita mensal recorrente da mentoria</p>
        </Card>

        <Card className="p-5 transition-all space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Índice do Método</span>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: activePalette.tokens.badgeBg,
                color: activePalette.tokens.primary,
                borderColor: activePalette.tokens.badgeBorder,
              }}
            >
              <Award size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black" style={{ color: activePalette.tokens.primary }} suppressHydrationWarning>
              {healthScore}%
            </span>
            <span className="text-xs font-bold text-emerald-400">Nível Ouro</span>
          </div>
          <p className="text-[11px] text-slate-500">Maturidade nos 5 Pilares Rocket</p>
        </Card>
      </div>

      {/* Community Achievements & Recent Milestones Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Mural de Conquistas Recentes da Comunidade */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
              <Award size={20} style={{ color: activePalette.tokens.primary }} />
              <span>Mural de Conquistas Recentes dos Mentorados</span>
            </h2>
            <span className="text-xs font-mono font-bold text-emerald-400">Marcos Validados</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {[
              {
                mentee: 'Alexandre Magno',
                company: 'Clínica Innovare',
                badge: '🏆 Primeiro 100k',
                desc: 'Ultrapassou R$ 100k em faturamento mensal',
                xp: '+500 XP',
                date: 'Há 2 dias',
              },
              {
                mentee: 'Bruna Takahashi',
                company: 'BT Odonto Prime',
                badge: '🎓 Rocket Academy Master',
                desc: 'Concluiu 100% dos módulos de vendas e tráfego',
                xp: '+300 XP',
                date: 'Há 4 dias',
              },
              {
                mentee: 'Carlos Eduardo Mendes',
                company: 'Mendes & Associados',
                badge: '⚡ Oferta High Ticket Validada',
                desc: 'Funil comercial rodando com ROAS de 4.2x',
                xp: '+400 XP',
                date: 'Esta semana',
              },
              {
                mentee: 'Dra. Juliana Vasconcelos',
                company: 'Instituto Harmonize',
                badge: '🎯 Closer de Elite',
                desc: 'Taxa de conversão de leads superior a 35%',
                xp: '+250 XP',
                date: 'Esta semana',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#131926]/90 border border-[#1F293D] hover:border-slate-500 transition-all flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-slate-100">{item.mentee}</span>
                    <span className="text-[10px] text-slate-500">({item.company})</span>
                  </div>
                  <div className="text-xs font-bold" style={{ color: activePalette.tokens.primary }}>
                    {item.badge}
                  </div>
                  <p className="text-[11px] text-slate-400">{item.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border"
                    style={{
                      backgroundColor: activePalette.tokens.badgeBg,
                      color: activePalette.tokens.primary,
                      borderColor: activePalette.tokens.badgeBorder,
                    }}
                  >
                    {item.xp}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1">{item.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Próximos Encontros & Imersões */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
              <Calendar size={18} style={{ color: activePalette.tokens.primary }} />
              <span>Próximas Imersões</span>
            </h2>
            <Link
              href="/events"
              className="text-xs font-bold hover:underline"
              style={{ color: activePalette.tokens.primary }}
            >
              Ver todos
            </Link>
          </div>

          <div className="space-y-3">
            {events.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className="p-4 rounded-2xl bg-[#131926]/90 border border-[#1F293D] hover:border-slate-600 transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-extrabold text-slate-100 leading-tight">
                    {event.title}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                    {event.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>📍 {event.location}</span>
                  <span className="font-bold text-slate-300">
                    {new Date(event.date).toLocaleDateString('pt-BR')} às {event.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Birthday Block (Trimestral) */}
      <Card
        className="p-5 sm:p-6 space-y-5 bg-gradient-to-b from-[#131926] to-[#0B0F17]"
        style={{ borderColor: activePalette.tokens.primary + '30' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1F293D]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: activePalette.tokens.badgeBg,
                color: activePalette.tokens.primary,
                borderColor: activePalette.tokens.badgeBorder,
              }}
            >
              <Gift size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Mural de Aniversariantes</span>
                <Badge variant="default" className="text-[10px]">
                  Trimestre
                </Badge>
              </h2>
              <p className="text-xs text-slate-400">
                Felicite os empresários da mentoria com cartões automáticos e disparo WhatsApp.
              </p>
            </div>
          </div>

          {/* 3-Month Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#0B0F17] rounded-xl border border-[#1F293D] self-start sm:self-auto overflow-x-auto">
            {targetMonths.map((tab, idx) => (
              <button
                key={tab.monthIndex}
                onClick={() => setSelectedMonthTab(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  selectedMonthTab === idx
                    ? 'shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#131926]'
                }`}
                style={
                  selectedMonthTab === idx
                    ? {
                        backgroundColor: activePalette.tokens.primary,
                        color: isLightMode ? '#FFFFFF' : '#0B0F17',
                      }
                    : {}
                }
              >
                <span>{tab.name}</span>
                {tab.isCurrent && (
                  <span
                    className="text-[9px] px-1 py-0.2 rounded-full font-black opacity-80"
                    style={{
                      backgroundColor: isLightMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)',
                    }}
                  >
                    Atual
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Birthday Members List */}
        {currentMonthBirthdays.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#0B0F17] border border-[#1F293D] text-center space-y-2">
            <PartyPopper size={32} className="mx-auto opacity-50" style={{ color: activePalette.tokens.primary }} />
            <p className="text-sm font-semibold text-slate-300">
              Nenhum aniversariante cadastrado em {targetMonths[selectedMonthTab]?.name}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {currentMonthBirthdays.map((member) => (
              <Card
                key={member.id}
                className="p-4 bg-[#0B0F17]/80 hover:bg-[#0B0F17] border-[#1F293D] transition-all flex flex-col justify-between space-y-3 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl font-bold flex items-center justify-center text-base shadow border overflow-hidden shrink-0"
                      style={{
                        backgroundColor: activePalette.tokens.badgeBg,
                        color: activePalette.tokens.primary,
                        borderColor: activePalette.tokens.badgeBorder,
                      }}
                    >
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        member.name.charAt(0)
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-slate-100 transition-colors line-clamp-1">
                        {member.name}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-1">{member.companyName}</p>
                      <span className="text-[10px] text-slate-500 block">{member.specialty}</span>
                    </div>
                  </div>

                  {/* Day Badge */}
                  <div
                    className="px-2.5 py-1 rounded-xl text-center shrink-0 border"
                    style={{
                      backgroundColor: activePalette.tokens.badgeBg,
                      color: activePalette.tokens.primary,
                      borderColor: activePalette.tokens.badgeBorder,
                    }}
                  >
                    <span className="text-[10px] font-bold uppercase block">{member.monthShort}</span>
                    <span className="text-base font-black leading-none">{member.day}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1F293D] flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenBirthdayCard(member)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg border text-[11px] font-bold transition-all flex items-center justify-center gap-1.5"
                    style={{
                      backgroundColor: activePalette.tokens.badgeBg,
                      color: activePalette.tokens.primary,
                      borderColor: activePalette.tokens.badgeBorder,
                    }}
                  >
                    <Sparkles size={13} />
                    <span>Gerar Card Comemorativo</span>
                  </button>

                  <button
                    onClick={() => handleOpenBirthdayCard(member)}
                    className="py-1.5 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-all flex items-center justify-center gap-1 shrink-0"
                  >
                    <MessageCircle size={13} />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Official Luxury Birthday Card Flyer Modal */}
      <BirthdayCardModal
        member={selectedBirthdayMember}
        isOpen={Boolean(selectedBirthdayMember)}
        onClose={() => setSelectedBirthdayMember(null)}
      />
    </div>
  );
}
