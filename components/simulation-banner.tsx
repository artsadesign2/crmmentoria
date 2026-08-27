'use client';

import { useState } from 'react';
import { Eye, LogOut, Loader2 } from 'lucide-react';
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
      className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-center text-xs font-semibold text-amber-200 backdrop-blur-xl sm:text-sm"
    >
      <span className="flex items-center gap-2">
        <Eye size={15} className="shrink-0" />
        Modo simulação — você está vendo o sistema como{' '}
        <strong className="font-bold">{currentUser.name}</strong> ({currentRole})
      </span>

      <button
        type="button"
        disabled={leaving}
        onClick={() => {
          setLeaving(true);
          void exitSimulation().finally(() => setLeaving(false));
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/50 bg-amber-500/20 px-2.5 py-1 font-bold text-amber-100 transition-colors hover:bg-amber-500/35 disabled:opacity-60"
      >
        {leaving ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
        Voltar à minha conta
      </button>
    </div>
  );
}
