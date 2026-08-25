'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Rocket, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('master@rocketclub.com');
  const [password, setPassword] = useState('••••••••');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    document.cookie = 'rocket_session=authenticated_master; path=/; max-age=604800; SameSite=Lax';
    setTimeout(() => {
      router.push('/dashboard');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#131926]/90 border border-[#1F293D] rounded-3xl p-8 shadow-2xl space-y-6 relative z-10 backdrop-blur-xl">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 text-slate-950 font-black text-3xl flex items-center justify-center mx-auto shadow-lg shadow-yellow-500/20">
            🚀
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100 gold-gradient-text">ROCKET CLUB SAAS</h1>
            <p className="text-xs text-slate-400">Acesse a plataforma de mentoria e comunidade</p>
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
                className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl pl-10 pr-4 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
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
                className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl pl-10 pr-4 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-yellow-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
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
            <ShieldCheck size={14} className="text-yellow-400" /> Conexão Criptografada Multi-Tenant
          </span>
        </div>
      </div>
    </div>
  );
}
