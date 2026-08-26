'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Award,
  Crown,
  Medal,
  Flame,
  Zap,
  TrendingUp,
  Sparkles,
  Search,
  Filter,
  Shield,
  Star,
  ChevronRight,
  Target,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Member, INITIAL_MEMBERS } from '@/lib/mock-data';
import { useTheme } from '@/lib/theme-context';
import { DEFAULT_TENANT } from '@/lib/tenant';

interface LeaderboardMentee {
  id: string;
  rank: number;
  name: string;
  companyName: string;
  specialty: string;
  avatar?: string;
  xp: number;
  tier: 'Diamante' | 'Ouro' | 'Prata' | 'Bronze';
  monthlyRevenue: string;
  goalsCompleted: number;
  badgesCount: number;
  growthPercent: number;
}

export default function LeaderboardPage() {
  const { isLightMode, activePalette } = useTheme();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedQuarter, setSelectedQuarter] = useState<'Q3-2026' | 'Q2-2026' | 'ALL'>('Q3-2026');
  const [search, setSearch] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [brandName, setBrandName] = useState(DEFAULT_TENANT.company.tradeName);

  useEffect(() => {
    try {
      const savedName = localStorage.getItem('rocket_club_company_tradename');
      if (savedName) setBrandName(savedName);
    } catch {}

    async function load() {
      try {
        const res = await fetch('/api/members');
        const data = await res.json();
        if (data.ok && data.members) setMembers(data.members);
        else setMembers(INITIAL_MEMBERS);
      } catch {
        setMembers(INITIAL_MEMBERS);
      }
    }
    load();
  }, []);

  // Compute rich gamified leaderboard items
  const leaderboardList: LeaderboardMentee[] = (members.length > 0 ? members : INITIAL_MEMBERS)
    .map((m, idx) => {
      const baseScores = [2850, 2640, 2410, 2190, 1980, 1850, 1720, 1540, 1320, 1100];
      const xp = baseScores[idx % baseScores.length] + ((idx * 37) % 150);
      const tier: 'Diamante' | 'Ouro' | 'Prata' | 'Bronze' =
        xp >= 2500 ? 'Diamante' : xp >= 2000 ? 'Ouro' : xp >= 1500 ? 'Prata' : 'Bronze';

      return {
        id: m.id,
        rank: idx + 1,
        name: m.name,
        companyName: m.companyName || m.tradeName || 'Empresa Mentorado',
        specialty: m.specialty || 'Negócios & Escala',
        avatar: m.avatar || m.coverImage,
        xp,
        tier,
        monthlyRevenue: m.monthlyRevenue || 'R$ 100k+',
        goalsCompleted: 8 + (idx % 5),
        badgesCount: 5 - (idx % 3),
        growthPercent: 28 + ((idx * 11) % 45),
      };
    })
    .sort((a, b) => b.xp - a.xp)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const filtered = leaderboardList.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.companyName.toLowerCase().includes(search.toLowerCase());
    const matchesTier = selectedTier === 'ALL' || item.tier === selectedTier;
    return matchesSearch && matchesTier;
  });

  const top3 = leaderboardList.slice(0, 3);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div
        className="p-6 sm:p-8 rounded-3xl border relative overflow-hidden shadow-2xl"
        style={{
          backgroundColor: activePalette.tokens.surface,
          borderColor: activePalette.tokens.surfaceBorder,
        }}
      >
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: activePalette.tokens.primary }}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <Badge variant="default" className="py-1">
              <Trophy size={14} className="mr-1.5" /> Quadro de Honra & Gamificação
            </Badge>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-100 tracking-tight">
              Leaderboard & <span className="theme-gradient-text">Ranking da Comunidade</span> 🏆
            </h1>
            <p className={`text-xs sm:text-sm max-w-2xl leading-relaxed ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
              Reconhecimento contínuo aos empresários com maior pontuação de XP, metas superadas e maturação estratégica.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {['Q3-2026', 'Q2-2026', 'ALL'].map((q) => (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all border ${
                  selectedQuarter === q
                    ? 'shadow-lg'
                    : 'bg-[#0B0F17] border-[#1F293D] text-slate-400 hover:text-slate-200'
                }`}
                style={
                  selectedQuarter === q
                    ? {
                        backgroundColor: activePalette.tokens.primary,
                        color: isLightMode ? '#FFFFFF' : '#0B0F17',
                        borderColor: activePalette.tokens.primary,
                        boxShadow: `0 4px 15px ${activePalette.tokens.glow}`,
                      }
                    : {}
                }
              >
                {q === 'ALL' ? 'Geral' : q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TOP 3 PODIUM */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-2">
        {/* 2nd Place */}
        {top3[1] && (
          <Card className="p-6 rounded-3xl bg-[#111728]/80 border-slate-700/60 flex flex-col items-center text-center space-y-3 relative order-2 md:order-1">
            <div className="w-10 h-10 rounded-full bg-slate-400/20 text-slate-300 font-black flex items-center justify-center text-sm border border-slate-400/40">
              🥈 2º
            </div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-400 to-slate-200 text-slate-950 font-black text-xl flex items-center justify-center shadow-lg overflow-hidden border-2 border-slate-300">
              {top3[1].avatar ? (
                <img src={top3[1].avatar} alt={top3[1].name} className="w-full h-full object-cover" />
              ) : (
                top3[1].name.charAt(0)
              )}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-100">{top3[1].name}</h3>
              <p className="text-xs text-slate-400">{top3[1].companyName}</p>
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-400/10 text-slate-300 font-mono text-xs font-black border border-slate-400/20">
              {top3[1].xp} XP
            </div>
          </Card>
        )}

        {/* 1st Place */}
        {top3[0] && (
          <Card
            className="p-6 rounded-3xl border-2 flex flex-col items-center text-center space-y-3 relative order-1 md:order-2 shadow-2xl md:-translate-y-2"
            style={{
              backgroundColor: activePalette.tokens.surface,
              borderColor: activePalette.tokens.primary,
              boxShadow: `0 10px 30px ${activePalette.tokens.glow}`,
            }}
          >
            <div
              className="absolute -top-3 px-3 py-0.5 rounded-full font-black text-[10px] uppercase shadow-lg"
              style={{
                backgroundColor: activePalette.tokens.primary,
                color: isLightMode ? '#FFFFFF' : '#0B0F17',
              }}
            >
              👑 1º Lugar Geral
            </div>
            <div
              className="w-12 h-12 rounded-full font-black flex items-center justify-center text-base border mt-2"
              style={{
                backgroundColor: activePalette.tokens.badgeBg,
                color: activePalette.tokens.primary,
                borderColor: activePalette.tokens.badgeBorder,
              }}
            >
              🥇 1º
            </div>
            <div
              className="w-20 h-20 rounded-3xl font-black text-2xl flex items-center justify-center shadow-xl overflow-hidden border-2"
              style={{
                backgroundColor: activePalette.tokens.primary,
                borderColor: activePalette.tokens.primary,
              }}
            >
              {top3[0].avatar ? (
                <img src={top3[0].avatar} alt={top3[0].name} className="w-full h-full object-cover" />
              ) : (
                top3[0].name.charAt(0)
              )}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-100">{top3[0].name}</h3>
              <p className="text-xs text-slate-400">{top3[0].companyName}</p>
            </div>
            <div
              className="px-4 py-1.5 rounded-full font-mono text-sm font-black border"
              style={{
                backgroundColor: activePalette.tokens.badgeBg,
                color: activePalette.tokens.primary,
                borderColor: activePalette.tokens.badgeBorder,
              }}
            >
              {top3[0].xp} XP
            </div>
          </Card>
        )}

        {/* 3rd Place */}
        {top3[2] && (
          <Card className="p-6 rounded-3xl bg-[#111728]/80 border-amber-800/50 flex flex-col items-center text-center space-y-3 relative order-3">
            <div className="w-10 h-10 rounded-full bg-amber-700/20 text-amber-400 font-black flex items-center justify-center text-sm border border-amber-700/40">
              🥉 3º
            </div>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-700 to-amber-500 text-slate-950 font-black text-xl flex items-center justify-center shadow-lg overflow-hidden border-2 border-amber-600">
              {top3[2].avatar ? (
                <img src={top3[2].avatar} alt={top3[2].name} className="w-full h-full object-cover" />
              ) : (
                top3[2].name.charAt(0)
              )}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-100">{top3[2].name}</h3>
              <p className="text-xs text-slate-400">{top3[2].companyName}</p>
            </div>
            <div className="px-3 py-1 rounded-full bg-amber-700/15 text-amber-300 font-mono text-xs font-black border border-amber-700/30">
              {top3[2].xp} XP
            </div>
          </Card>
        )}
      </div>

      {/* FILTER & FULL TABLE */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#111728]/80 border border-[#1F293D] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar mentorado ou empresa..."
              className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-theme-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['ALL', 'Diamante', 'Ouro', 'Prata', 'Bronze'].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTier(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedTier === t
                    ? 'font-black shadow-md'
                    : 'bg-[#0B0F17] text-slate-400 hover:text-slate-200 border border-[#1F293D]'
                }`}
                style={
                  selectedTier === t
                    ? {
                        backgroundColor: activePalette.tokens.primary,
                        color: isLightMode ? '#FFFFFF' : '#0B0F17',
                      }
                    : {}
                }
              >
                {t === 'ALL' ? 'Todas as Patentes' : t}
              </button>
            ))}
          </div>
        </div>

        {/* Table List */}
        <div className="divide-y divide-[#1F293D] overflow-x-auto">
          {filtered.map((mentee) => (
            <div
              key={mentee.id}
              className="py-3.5 px-2 flex items-center justify-between gap-4 hover:bg-[#131926]/60 transition-colors rounded-xl"
            >
              <div className="flex items-center gap-3 min-w-[200px]">
                <span className="w-7 text-center font-mono font-black text-xs text-slate-400">
                  #{mentee.rank}
                </span>
                <div
                  className="w-10 h-10 rounded-xl font-bold flex items-center justify-center text-sm shadow shrink-0 overflow-hidden"
                  style={{
                    backgroundColor: activePalette.tokens.badgeBg,
                    color: activePalette.tokens.primary,
                    border: `1px solid ${activePalette.tokens.badgeBorder}`,
                  }}
                >
                  {mentee.avatar ? (
                    <img src={mentee.avatar} alt={mentee.name} className="w-full h-full object-cover" />
                  ) : (
                    mentee.name.charAt(0)
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-100">{mentee.name}</h4>
                  <p className="text-[11px] text-slate-400">{mentee.companyName}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:gap-8 shrink-0">
                <div className="text-right hidden sm:block">
                  <span className="text-xs font-bold text-slate-300 block">{mentee.goalsCompleted} Metas</span>
                  <span className="text-[10px] text-slate-500">{mentee.badgesCount} Conquistas</span>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                    mentee.tier === 'Diamante'
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                      : 'bg-slate-500/15 text-slate-300 border-slate-500/30'
                  }`}
                  style={
                    mentee.tier === 'Ouro'
                      ? {
                          backgroundColor: activePalette.tokens.badgeBg,
                          color: activePalette.tokens.primary,
                          borderColor: activePalette.tokens.badgeBorder,
                        }
                      : {}
                  }
                >
                  {mentee.tier}
                </span>

                <div className="text-right min-w-[80px]">
                  <span
                    className="font-mono text-sm font-black block"
                    style={{ color: activePalette.tokens.primary }}
                  >
                    {mentee.xp} XP
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400">+{mentee.growthPercent}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
