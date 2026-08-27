'use client';

import { Clock } from 'lucide-react';
import { slaState, slaProgress, relativeTime, type SlaState } from '@/lib/crm/sla';

/**
 * Indicador de prazo de atendimento.
 *
 * Duas peças que compartilham o mesmo estado: um filete vertical na borda
 * esquerda do card, que preenche conforme o prazo é consumido, e um rótulo
 * curto na linha de ações.
 *
 * Sem `slaDueAt`, ambos somem. Um trilho cinza em todo card seria ruído —
 * a maioria das oportunidades não tem prazo, e desenhar um marcador vazio
 * para elas não informa nada.
 */

const CORES: Record<Exclude<SlaState, 'none'>, string> = {
  ok: '#10B981',
  warning: '#F59E0B',
  overdue: '#EF4444',
};

const ROTULOS: Record<Exclude<SlaState, 'none'>, string> = {
  ok: 'No prazo',
  warning: 'Prazo próximo',
  overdue: 'Prazo vencido',
};

interface SlaProps {
  slaDueAt: string | null;
  startedAt?: string | null;
  now?: Date;
}

/** Filete vertical na borda do card. */
export function SlaRail({ slaDueAt, startedAt = null, now = new Date() }: SlaProps) {
  const estado = slaState(slaDueAt, now);
  if (estado === 'none') return null;

  const progresso = slaProgress(slaDueAt, startedAt, now) ?? 0;
  const cor = CORES[estado];

  return (
    <span
      aria-hidden
      className="absolute left-0 top-0 h-full w-[3px] overflow-hidden rounded-l-xl"
      style={{ backgroundColor: `${cor}26` }}
    >
      <span
        className="block w-full transition-[height] duration-500"
        style={{ height: `${Math.round(progresso * 100)}%`, backgroundColor: cor }}
      />
    </span>
  );
}

/** Rótulo com o tempo restante, para a linha de ações do card. */
export function SlaLabel({ slaDueAt, now = new Date() }: SlaProps) {
  const estado = slaState(slaDueAt, now);
  if (estado === 'none') return null;

  const cor = CORES[estado];
  const restante = relativeTime(slaDueAt, now);
  const texto = estado === 'overdue' ? `${restante} atrás` : restante;

  return (
    <span
      title={ROTULOS[estado]}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
      style={{ backgroundColor: `${cor}1F`, color: cor }}
    >
      <Clock size={10} strokeWidth={2.5} />
      {texto}
    </span>
  );
}
