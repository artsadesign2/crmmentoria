'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { DEFAULT_TENANT } from '@/lib/tenant';

export default function LoginPage() {
  const router = useRouter();
  const { isLightMode, activePalette } = useTheme();
  const [email, setEmail] = useState('admin@mentoria.com');
  const [password, setPassword] = useState('••••••••');
  const [loading, setLoading] = useState(false);
  const [brandName, setBrandName] = useState(DEFAULT_TENANT.company.tradeName);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('rocket_club_company_tradename');
      if (saved) setBrandName(saved);
    } catch {}
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    document.cookie = 'rocket_session=authenticated_master; path=/; max-age=604800; SameSite=Lax';
    setTimeout(() => {
      router.push('/dashboard');
    }, 500);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors"
      style={{ backgroundColor: activePalette.tokens.background }}
    >
      {/* Glow Effects */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none opacity-20"
        style={{ backgroundColor: activePalette.tokens.primary }}
      />

      <div
        className="w-full max-w-md border rounded-3xl p-8 shadow-2xl space-y-6 relative z-10 backdrop-blur-xl"
        style={{
          backgroundColor: activePalette.tokens.surface,
          borderColor: activePalette.tokens.surfaceBorder,
        }}
      >
        <div className="text-center space-y-3">
          <div
            className="w-16 h-16 rounded-2xl font-black text-3xl flex items-center justify-center mx-auto shadow-lg border"
            style={{
              backgroundColor: activePalette.tokens.badgeBg,
              color: activePalette.tokens.primary,
              borderColor: activePalette.tokens.badgeBorder,
              boxShadow: `0 8px 25px ${activePalette.tokens.glow}`,
            }}
          >
            🚀
          </div>
          <div>
            <h1 className="text-2xl font-black theme-gradient-text uppercase tracking-tight">
              {brandName}
            </h1>
            <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Acesse a plataforma de mentoria executiva & CRM
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="block text-slate-400 font-semibold">E-mail Corporativo</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl pl-10 pr-4 py-2.5 text-slate-100 focus:outline-none focus:border-theme-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-slate-400 font-semibold">Senha de Acesso</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-3 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl pl-10 pr-4 py-2.5 text-slate-100 focus:outline-none focus:border-theme-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-xs shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            style={{
              backgroundColor: activePalette.tokens.primary,
              color: isLightMode ? '#FFFFFF' : '#0B0F17',
              boxShadow: `0 4px 15px ${activePalette.tokens.glow}`,
            }}
          >
            {loading ? (
              <span>Entrando...</span>
            ) : (
              <>
                <span>Entrar no Painel</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-[#1F293D]/60">
          <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
            <ShieldCheck size={14} style={{ color: activePalette.tokens.primary }} /> Conexão Criptografada Multi-Tenant White-Label
          </span>
        </div>
      </div>
    </div>
  );
}
