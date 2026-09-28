'use client';

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Award,
  Sparkles,
  Lock,
  CheckCircle2,
  Zap,
  Star,
  Shield,
  Plus,
  Loader2,
} from 'lucide-react';
import {
  BadgeDefinition,
  getAllBadges,
  calculateGamificationLevel,
} from '@/lib/gamification/badges';
import { useTheme } from '@/lib/theme-context';
import { toast } from '@/lib/toast-context';

interface GamificationBadgeListProps {
  memberId?: string;
  initialXp?: number;
  initialUnlockedBadges?: string[];
  isMentorView?: boolean;
}

// Cache em memória client-side para evitar refetches ao alternar abas
const gamificationClientCache = new Map<string, { xp: number; unlockedBadges: string[]; timestamp: number }>();
const CLIENT_CACHE_TTL = 120000; // 2 minutos

export function GamificationBadgeList({
  memberId = '1',
  initialXp = 1850,
  initialUnlockedBadges = ['FIRST_MISSION', 'ACADEMY_HALF', 'NETWORK_BUILDER'],
  isMentorView = true,
}: GamificationBadgeListProps) {
  const { activePalette } = useTheme();
  
  // Inicializa com cache se disponível
  const cached = gamificationClientCache.get(memberId);
  const [xp, setXp] = useState(cached?.xp ?? initialXp);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>(cached?.unlockedBadges ?? initialUnlockedBadges);
  const [badges] = useState<BadgeDefinition[]>(() => getAllBadges());
  const [isLoading, setIsLoading] = useState(false);
  const [showAddXpModal, setShowAddXpModal] = useState(false);
  const [bonusXpInput, setBonusXpInput] = useState('100');
  const [selectedBadgeToUnlock, setSelectedBadgeToUnlock] = useState('');

  // Sincronizar dados com o backend apenas se cache expirado
  useEffect(() => {
    const existing = gamificationClientCache.get(memberId);
    if (existing && Date.now() - existing.timestamp < CLIENT_CACHE_TTL) {
      setXp(existing.xp);
      setUnlockedBadges(existing.unlockedBadges);
      return;
    }

    async function loadGamification() {
      try {
        const res = await fetch(`/api/gamification?memberId=${memberId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok) {
            const newXp = data.xp || initialXp;
            const newBadges = data.unlockedBadges || initialUnlockedBadges;
            setXp(newXp);
            setUnlockedBadges(newBadges);
            gamificationClientCache.set(memberId, {
              xp: newXp,
              unlockedBadges: newBadges,
              timestamp: Date.now(),
            });
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar gamificação:', err);
      }
    }
    loadGamification();
  }, [memberId]);

  const levelInfo = calculateGamificationLevel(xp);

  const handleGrantXp = async () => {
    const numXp = parseInt(bonusXpInput, 10) || 0;
    if (numXp <= 0 && !selectedBadgeToUnlock) {
      toast.error('Informe um valor de XP ou selecione uma conquista.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/gamification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          addXp: numXp,
          unlockBadgeId: selectedBadgeToUnlock || undefined,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setXp(data.xp);
        setUnlockedBadges(data.unlockedBadges);
        setShowAddXpModal(false);
        setBonusXpInput('100');
        setSelectedBadgeToUnlock('');
        toast.success(`+${numXp} XP e conquistas atribuídas com sucesso!`);
      } else {
        toast.error(data.error || 'Erro ao atribuir XP');
      }
    } catch (e: any) {
      toast.error('Erro de conexão ao atribuir XP');
    } finally {
      setIsLoading(false);
    }
  };

  const getRarityBadge = (rarity: BadgeDefinition['rarity']) => {
    switch (rarity) {
      case 'LEGENDARY':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/10 shadow-lg';
      case 'EPIC':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
      case 'RARE':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Nível e Patente */}
      <div
        className="p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden"
        style={{
          backgroundColor: activePalette.tokens.surface,
          borderColor: activePalette.tokens.surfaceBorder,
        }}
      >
        <div className="flex items-center gap-4 z-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-3xl shadow-xl shrink-0"
            style={{
              backgroundColor: activePalette.tokens.badgeBg,
              border: `1px solid ${activePalette.tokens.badgeBorder}`,
              boxShadow: `0 8px 25px ${activePalette.tokens.glow}`,
            }}
          >
            {levelInfo.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-100">
                {levelInfo.title} (Nível {levelInfo.level})
              </h3>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                style={{
                  backgroundColor: activePalette.tokens.badgeBg,
                  color: activePalette.tokens.primary,
                  border: `1px solid ${activePalette.tokens.badgeBorder}`,
                }}
              >
                {xp.toLocaleString('pt-BR')} XP
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {levelInfo.level < 5 ? (
                <>
                  Faltam{' '}
                  <strong className="text-slate-200">
                    {Math.max(0, levelInfo.nextLevelXp - xp)} XP
                  </strong>{' '}
                  para alcançar o próximo nível.
                </>
              ) : (
                <span className="text-yellow-400 font-bold">
                  🌟 Patente Máxima Galáctica Atingida!
                </span>
              )}
            </p>
            {/* Barra de Progresso */}
            <div className="w-56 sm:w-80 h-2.5 bg-slate-950 rounded-full mt-2 overflow-hidden border border-slate-800 relative">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${levelInfo.progressPct}%`,
                  backgroundColor: activePalette.tokens.primary,
                  boxShadow: `0 0 12px ${activePalette.tokens.primary}`,
                }}
              />
            </div>
          </div>
        </div>

        {isMentorView && (
          <button
            type="button"
            onClick={() => setShowAddXpModal(true)}
            className="px-3 py-2 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 z-10 hover:scale-105"
          >
            <Zap size={14} /> Atribuir XP / Conquista
          </button>
        )}
      </div>

      {/* Grid de Badges */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Award size={14} className="text-yellow-400" />
            Mural de Conquistas & Insígnias ({unlockedBadges.length}/{badges.length})
          </h4>
          <span className="text-[11px] text-slate-500">
            Desbloqueie concluindo aulas, contratos e metas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {badges.map((b) => {
            const isUnlocked = unlockedBadges.includes(b.id);
            return (
              <div
                key={b.id}
                className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                  isUnlocked
                    ? 'bg-slate-900/90 border-yellow-500/40 shadow-lg shadow-yellow-500/5'
                    : 'bg-slate-950/40 border-slate-800 opacity-60 hover:opacity-80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{b.icon}</span>
                      <div>
                        <h5
                          className={`text-xs font-bold ${
                            isUnlocked ? 'text-slate-100' : 'text-slate-400'
                          }`}
                        >
                          {b.title}
                        </h5>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border inline-block mt-0.5 ${getRarityBadge(
                            b.rarity
                          )}`}
                        >
                          {b.rarity}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-bold shrink-0 ${
                        isUnlocked ? 'text-yellow-400' : 'text-slate-600'
                      }`}
                    >
                      +{b.xpValue} XP
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
                    {b.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                  {isUnlocked ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Conquistado
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Lock size={12} /> Bloqueado
                    </span>
                  )}
                  <span className="text-slate-500">{b.category}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Atribuir XP Manualmente */}
      {showAddXpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[#0f172a] border border-yellow-500/30 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black flex items-center gap-2 text-yellow-400">
                <Zap size={18} /> Atribuir Bônus de XP ao Mentorado
              </h3>
              <button
                onClick={() => setShowAddXpModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Quantidade de XP a Conceder
              </label>
              <input
                type="number"
                value={bonusXpInput}
                onChange={(e) => setBonusXpInput(e.target.value)}
                placeholder="Ex: 100"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-yellow-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Desbloquear Insígnia Especial (Opcional)
              </label>
              <select
                value={selectedBadgeToUnlock}
                onChange={(e) => setSelectedBadgeToUnlock(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-yellow-500"
              >
                <option value="">Nenhuma / Apenas XP</option>
                {badges.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.icon} {b.title} (+{b.xpValue} XP)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowAddXpModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGrantXp}
                disabled={isLoading}
                className="px-5 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-yellow-500/20"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                Confirmar Atribuição
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
