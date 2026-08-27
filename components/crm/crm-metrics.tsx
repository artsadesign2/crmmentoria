'use client';

import { useMemo } from 'react';
import { Users, DollarSign, Flame, TrendingUp, Target } from 'lucide-react';
import type { DealCardDTO, StageDTO } from '@/lib/crm/types';

/**
 * As cinco métricas executivas do topo do funil.
 *
 * Derivadas dos agregados que `/api/crm/pipelines` já calculou no banco, e não
 * somadas a partir dos cards carregados. Os dois caminhos dariam números
 * diferentes para um Editor — ele veria o total da empresa aqui e o total dele
 * no rodapé das colunas — e o rodapé é quem está certo.
 *
 * A exceção é a contagem de leads quentes, que depende da prioridade de cada
 * card e não tem agregado próprio no servidor.
 */

function moeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

interface CrmMetricsProps {
  stages: StageDTO[];
  deals: DealCardDTO[];
}

export function CrmMetrics({ stages, deals }: CrmMetricsProps) {
  const m = useMemo(() => {
    const abertas = stages.filter((s) => !s.isWon && !s.isLost);
    const ganhas = stages.filter((s) => s.isWon);
    const terminais = new Set(stages.filter((s) => s.isWon || s.isLost).map((s) => s.id));

    const total = stages.reduce((acc, s) => acc + s.cardCount, 0);
    const cardsAbertos = abertas.reduce((acc, s) => acc + s.cardCount, 0);
    const valorAberto = abertas.reduce((acc, s) => acc + s.totalValue, 0);
    const convertidos = ganhas.reduce((acc, s) => acc + s.cardCount, 0);

    const quentes = deals.filter(
      (d) => (d.priority === 'HIGH' || d.priority === 'URGENT') && !terminais.has(d.stageId)
    ).length;

    return {
      total,
      valorAberto,
      quentes,
      convertidos,
      conversao: total > 0 ? Math.round((convertidos / total) * 100) : 0,
      ticketMedio: cardsAbertos > 0 ? Math.round(valorAberto / cardsAbertos) : 0,
    };
  }, [stages, deals]);

  const tiles = [
    { icon: Users, label: 'Oportunidades', value: String(m.total), tone: 'var(--theme-text-primary)' },
    { icon: DollarSign, label: 'Valor em aberto', value: moeda(m.valorAberto), tone: 'var(--primary-color)' },
    { icon: Flame, label: 'Leads quentes', value: String(m.quentes), tone: '#F87171' },
    {
      icon: TrendingUp,
      label: 'Conversão',
      value: `${m.conversao}%`,
      hint: `${m.convertidos} convertidos`,
      tone: '#FBBF24',
    },
    { icon: Target, label: 'Ticket médio', value: moeda(m.ticketMedio), tone: '#34D399' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">
      {tiles.map(({ icon: Icon, label, value, hint, tone }) => (
        <div
          key={label}
          className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 sm:p-4"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-secondary)]">
            <Icon size={12} />
            {label}
          </div>
          <div className="mt-1 truncate text-xl font-black sm:text-2xl" style={{ color: tone }}>
            {value}
          </div>
          {hint && (
            <span className="block text-[10px] text-[var(--theme-text-secondary)]">{hint}</span>
          )}
        </div>
      ))}
    </div>
  );
}
