'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MdVisibility, MdLogout, MdAutorenew } from 'react-icons/md';
import { useAuth } from '@/lib/auth-context';

/**
 * Faixa persistente exibida enquanto um Master está simulando outro papel.
 *
 * Sem ela é fácil esquecer que se está simulando e concluir que uma permissão
 * está quebrada quando na verdade ela está funcionando exatamente como devia.
 * A sessão de simulação expira sozinha em 1 hora.
 */
export function SimulationBanner() {
  const { simulatedBy, currentUser, currentRole, exitSimulation } = useAuth();
  const [leaving, setLeaving] = useState(false);

  if (!simulatedBy) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-amber-500/40 bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 px-4 py-2 text-center text-xs font-semibold text-amber-200 backdrop-blur-xl sm:text-sm shadow-lg"
    >
      <div className="flex items-center gap-2 mx-auto sm:mx-0">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <MdVisibility size={17} className="shrink-0 text-amber-400" />
        <span>
          Modo Manutenção / Visão do Mentorado: Você está acessando como{' '}
          <strong className="font-bold text-white underline decoration-amber-400/60">{currentUser.name}</strong> ({currentRole})
        </span>
      </div>

      <div className="flex items-center gap-2 mx-auto sm:mx-0">
        <Link
          href="/portal"
          prefetch={true}
          className="inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-100 transition-all hover:bg-amber-500/35 hover:scale-105"
        >
          🚀 Ir para o Portal
        </Link>

        <button
          type="button"
          disabled={leaving}
          onClick={() => {
            setLeaving(true);
            void exitSimulation().finally(() => setLeaving(false));
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/50 bg-red-500/20 px-3 py-1 font-bold text-red-200 transition-all hover:bg-red-500/35 hover:scale-105 disabled:opacity-60 shadow-sm"
        >
          {leaving ? <MdAutorenew size={14} className="animate-spin" /> : <MdLogout size={14} />}
          Voltar ao Modo Master
        </button>
      </div>
    </div>
  );
}
