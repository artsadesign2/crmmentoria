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
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Member, MOCK_TRANSACTIONS, MOCK_EVENTS } from '@/lib/mock-data';

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
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Birthday Block State (3-month window)
  const currentMonthIndex = new Date().getMonth(); // 0-indexed (e.g. 7 = Aug)
  const [selectedMonthTab, setSelectedMonthTab] = useState(0); // 0 = current, 1 = next, 2 = next+1

  // Birthday Card Modal State
  const [selectedBirthdayMember, setSelectedBirthdayMember] = useState<BirthdayMember | null>(null);
  const [customBirthdayMessage, setCustomBirthdayMessage] = useState('');
  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => {
    async function loadMembers() {
      try {
        const res = await fetch('/api/members');
        const data = await res.json();
        if (data.ok && data.members) {
          setMembers(data.members);
        }
      } catch (err) {
        console.error('Erro ao carregar dados dos mentorados:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMembers();
  }, []);

  const totalMembers = members.length;
  const topPerformers = members.filter(
    (m) => m.status === 'ouro' || m.status === 'diamante' || m.status === 'amarelo'
  ).length;
  const totalRevenue = MOCK_TRANSACTIONS.filter((t) => t.type === 'INCOME').reduce(
    (acc, t) => acc + t.amount,
    0
  );

  // Health Score Calculation (% of highly engaged members)
  const healthScore = totalMembers > 0 ? Math.round((topPerformers / totalMembers) * 100) : 94;

  // Compute 3 consecutive months: [current, current+1, current+2]
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
        // Deterministic distributed dates for demo richness
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
        phone: m.phone || '(11) 99999-0000',
        specialty: m.specialty || 'Empreendedorismo de Alta Performance',
      } as BirthdayMember;
    });
  }, [members, currentMonthIndex]);

  // Filter birthday members for active selected tab month
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

  const handleCopyMessage = () => {
    if (customBirthdayMessage) {
      navigator.clipboard.writeText(customBirthdayMessage);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 3000);
    }
  };

  const handleSendWhatsApp = (member: BirthdayMember) => {
    const cleanPhone = member.phone.replace(/\D/g, '');
    const encoded = encodeURIComponent(customBirthdayMessage);
    window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* BANNER: EXECUTIVE COCKPIT HERO                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Card className="relative overflow-hidden bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-transparent border-yellow-500/30 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <Badge variant="default" className="py-1">
              <Sparkles size={14} className="mr-1.5" /> Painel Executivo & Gestão do Ecossistema
            </Badge>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-100 tracking-tight">
              Cockpit do <span className="gold-gradient-text">Comandante</span> 🚀
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Gestão estratégica de alto nível: acompanhe a evolução de{' '}
              <span className="text-yellow-400 font-bold">
                {loading ? '...' : totalMembers} empresários e líderes
              </span>{' '}
              em aceleração, métricas de faturamento e encontros exclusivos.
            </p>
          </div>
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* HEALTH SCORE & COMUNIDADE                                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Card className="p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden border-[#1F293D]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-2xl shrink-0">
            <HeartPulse size={28} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest block">
              ÍNDICE DE SAÚDE & RETENÇÃO
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-slate-100">Comunidade em Alta Performance</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Score calculado dinamicamente com base no progresso das metas e engajamento dos membros.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 self-end md:self-auto">
          <div className="text-right">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400">{healthScore}%</span>
            <span className="text-[10px] font-bold text-emerald-400 block uppercase">Excelente Retenção</span>
          </div>
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* KPI METRIC CARDS GRID                                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Card className="p-5 sm:p-6 hover:border-yellow-500/30 transition-all space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Membros Ativos</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Users size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-100">{loading ? '...' : totalMembers}</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center">
              100% ativos <ArrowUpRight size={14} />
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Líderes integrados ao programa</p>
        </Card>

        <Card className="p-5 sm:p-6 hover:border-yellow-500/30 transition-all space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Líderes em Destaque</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Award size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400">{loading ? '...' : topPerformers}</span>
            <span className="text-xs font-bold text-yellow-500">Faixas Ouro & Diamante</span>
          </div>
          <p className="text-[11px] text-slate-500">Empresários com metas superadas</p>
        </Card>

        <Card className="p-5 sm:p-6 hover:border-yellow-500/30 transition-all space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Faturamento da Base</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400">
              R$ {totalRevenue.toLocaleString('pt-BR')}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Volume gerado pelos negócios</p>
        </Card>

        <Card className="p-5 sm:p-6 hover:border-yellow-500/30 transition-all space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Engajamento Academy</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <BookOpen size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-purple-400">88%</span>
            <span className="text-xs font-bold text-emerald-400">+12% no mês</span>
          </div>
          <p className="text-[11px] text-slate-500">Conclusão de trilhas e aulas práticas</p>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* BLOCO DE ANIVERSARIANTES DO MÊS (VISÃO 3 MESES TRIMESTRAL)  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Card className="p-5 sm:p-6 space-y-5 border-yellow-500/20 bg-gradient-to-b from-[#131926] to-[#0B0F17]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1F293D]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 flex items-center justify-center">
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
                Felicite os empresários da mentoria e gere cards personalizados comemorativos.
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
                    ? 'bg-yellow-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#131926]'
                }`}
              >
                <span>{tab.name}</span>
                {tab.isCurrent && (
                  <span className={`text-[9px] px-1 py-0.2 rounded-full ${
                    selectedMonthTab === idx ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-yellow-500/20 text-yellow-300'
                  }`}>
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
            <PartyPopper size={32} className="mx-auto text-yellow-400/50" />
            <p className="text-sm font-semibold text-slate-300">
              Nenhum aniversariante cadastrado em {targetMonths[selectedMonthTab]?.name}.
            </p>
            <p className="text-xs text-slate-500">
              Ajuste as datas de nascimento na ficha do mentorado para exibir no mural.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {currentMonthBirthdays.map((member) => (
              <Card
                key={member.id}
                className="p-4 bg-[#0B0F17]/80 hover:bg-[#0B0F17] border-[#1F293D] hover:border-yellow-500/40 transition-all flex flex-col justify-between space-y-3 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar with Birthday Crown/Ring */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-500 to-amber-300 text-slate-950 font-bold flex items-center justify-center text-base shadow border border-yellow-400/50 overflow-hidden">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          member.name.charAt(0)
                        )}
                      </div>
                      <span className="absolute -bottom-1 -right-1 text-xs" title="Aniversariante">
                        🎂
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-yellow-400 transition-colors line-clamp-1">
                        {member.name}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-1">{member.companyName}</p>
                      <span className="text-[10px] text-slate-500 block">{member.specialty}</span>
                    </div>
                  </div>

                  {/* Day Badge */}
                  <div className="px-2.5 py-1 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-center shrink-0">
                    <span className="text-[10px] font-bold uppercase block">{member.monthShort}</span>
                    <span className="text-base font-black leading-none">{member.day}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-[#1F293D] flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenBirthdayCard(member)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={13} />
                    <span>Gerar Card</span>
                  </button>

                  <button
                    onClick={() => {
                      const msg = encodeURIComponent(
                        `Parabéns ${member.name}! 🎉 O Rocket Club deseja muito sucesso, saúde e grandes conquistas neste novo ciclo! 🚀✨`
                      );
                      const cleanPhone = member.phone.replace(/\D/g, '');
                      window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, '_blank');
                    }}
                    className="py-1.5 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-all flex items-center justify-center gap-1 shrink-0"
                    title="Enviar WhatsApp"
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

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT: RECENT MEMBERS & UPCOMING SESSIONS            */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column: Recent Members List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
              <UserCheck size={20} className="text-yellow-400" />
              <span>Membros & Lideranças em Acompanhamento</span>
            </h2>
            <Link
              href="/mentorados"
              className="text-xs font-semibold text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
            >
              Base Completa ({totalMembers}) <ChevronRight size={14} />
            </Link>
          </div>

          {loading ? (
            <Card className="h-48 flex items-center justify-center text-slate-400 gap-2">
              <Loader2 size={20} className="animate-spin text-yellow-400" />
              <span className="text-xs">Carregando quadro de mentorados...</span>
            </Card>
          ) : (
            <Card className="divide-y divide-[#1F293D] overflow-hidden p-0">
              {members.slice(0, 7).map((member) => (
                <div
                  key={member.id}
                  className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-[#1F293D]/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-300 text-slate-950 font-bold flex items-center justify-center text-xs sm:text-sm shadow shrink-0">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        member.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-semibold text-slate-100 line-clamp-1">
                        {member.name}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-1">
                        {member.companyName || member.tradeName || member.specialty}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="text-right hidden sm:block">
                      <span className="text-xs font-medium text-slate-300 block">
                        {member.monthlyRevenue || 'Faturamento Privado'}
                      </span>
                      <span className="text-[10px] text-slate-500">{member.phone}</span>
                    </div>
                    <Badge
                      variant={
                        member.status === 'diamante'
                          ? 'secondary'
                          : member.status === 'ouro' || member.status === 'amarelo'
                          ? 'default'
                          : 'outline'
                      }
                      className="text-[10px] uppercase font-bold"
                    >
                      {member.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>

        {/* Right Column: Next Events & Exclusive Sessions */}
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Calendar size={18} className="text-yellow-400" />
              <span>Próximos Encontros & Imersões</span>
            </h2>

            <div className="space-y-3">
              {MOCK_EVENTS.map((event) => (
                <Card key={event.id} className="p-3.5 bg-[#0B0F17]/60 space-y-2 border-[#1F293D]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-yellow-400">{event.title}</span>
                    <Badge variant="default" className="text-[10px]">
                      {event.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{event.description}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-[#1F293D]/60">
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {new Date(event.date).toLocaleDateString('pt-BR')}
                    </span>
                    <span>
                      {event.attendeesCount}/{event.maxAttendees} confirmados
                    </span>
                  </div>
                </Card>
              ))}
            </div>

            <Link
              href="/events"
              className="w-full py-2.5 rounded-xl bg-[#1F293D]/50 hover:bg-[#1F293D] text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors block text-center"
            >
              <span>Acessar Calendário Completo</span>
              <ChevronRight size={14} />
            </Link>
          </Card>
        </div>
      </div>

      {/* MODAL: GERADOR DE CARD EXCLUSIVO DE ANIVERSÁRIO */}
      {selectedBirthdayMember && (
        <Modal
          isOpen={Boolean(selectedBirthdayMember)}
          onClose={() => setSelectedBirthdayMember(null)}
          title="Card de Homenagem de Aniversário"
          subtitle={`Celebrando a vida de ${selectedBirthdayMember.name} (${selectedBirthdayMember.companyName})`}
          icon={<PartyPopper size={20} />}
          size="lg"
        >
          <div className="space-y-5">
            {/* LIVE PREVIEW OF THE LUXURY GOLDEN CARD */}
            <div className="relative p-6 rounded-2xl bg-gradient-to-br from-[#1C2538] via-[#0B0F17] to-[#0A0D14] border-2 border-yellow-500/50 shadow-2xl shadow-yellow-500/10 space-y-4 text-center overflow-hidden">
              {/* Gold Top Accents */}
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-yellow-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

              {/* Badge & Rocket Logo */}
              <div className="flex items-center justify-center gap-2">
                <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                  🚀 ROCKET CLUB • CELEBRAÇÃO EXCLUSIVA
                </span>
              </div>

              {/* Avatar Frame */}
              <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-gradient-to-tr from-yellow-500 via-amber-300 to-yellow-600 shadow-xl shadow-yellow-500/20">
                <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center text-2xl font-black text-yellow-400">
                  {selectedBirthdayMember.avatar ? (
                    <img
                      src={selectedBirthdayMember.avatar}
                      alt={selectedBirthdayMember.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    selectedBirthdayMember.name.charAt(0)
                  )}
                </div>
              </div>

              {/* Member Title & Date */}
              <div className="space-y-1">
                <span className="text-xs font-black text-yellow-400 uppercase tracking-widest block">
                  ✨ FELIZ ANIVERSÁRIO! ✨
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight">
                  {selectedBirthdayMember.name}
                </h2>
                <p className="text-xs font-semibold text-slate-300">
                  {selectedBirthdayMember.companyName}
                </p>
                <div className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 text-[10px] font-bold">
                  🎂 {selectedBirthdayMember.day} de {selectedBirthdayMember.monthName}
                </div>
              </div>

              {/* Card Quote */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-yellow-500/20 text-slate-300 text-xs italic leading-relaxed">
                "{customBirthdayMessage}"
              </div>

              <div className="text-[10px] font-bold text-yellow-500/80 uppercase tracking-widest">
                — Comandante & Tripulação Rocket Club
              </div>
            </div>

            {/* Message Editor */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Personalizar Mensagem de Homenagem:
              </label>
              <textarea
                rows={3}
                value={customBirthdayMessage}
                onChange={(e) => setCustomBirthdayMessage(e.target.value)}
                className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/40 resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-[#1F293D]">
              <button
                type="button"
                onClick={handleCopyMessage}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0B0F17] hover:bg-[#1F293D] text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-[#1F293D]"
              >
                {copiedText ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedText ? 'Copiado!' : 'Copiar Mensagem'}</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSelectedBirthdayMember(null)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#0B0F17] text-slate-400 text-xs font-semibold hover:bg-[#1F293D] flex-1 sm:flex-initial"
                >
                  Fechar
                </button>

                <button
                  type="button"
                  onClick={() => handleSendWhatsApp(selectedBirthdayMember)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs hover:scale-105 transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 flex-1 sm:flex-initial"
                >
                  <MessageCircle size={15} />
                  <span>Enviar no WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
