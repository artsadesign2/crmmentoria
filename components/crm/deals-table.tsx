'use client';

import { MessageCircle } from 'lucide-react';
import { ChannelBadge } from './channel-badge';
import { SlaLabel } from './sla-indicator';
import type { DealCardDTO, StageDTO } from '@/lib/crm/types';

/**
 * Visão de tabela do funil, alternativa ao quadro.
 *
 * Útil para varrer muitas oportunidades de uma vez e comparar valores — coisa
 * que o Kanban, otimizado para o fluxo entre etapas, não faz bem.
 */

function moeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface DealsTableProps {
  deals: DealCardDTO[];
  stages: StageDTO[];
  onOpenDeal: (deal: DealCardDTO) => void;
  onWhatsApp: (deal: DealCardDTO) => void;
}

export function DealsTable({ deals, stages, onOpenDeal, onWhatsApp }: DealsTableProps) {
  const stageById = new Map(stages.map((s) => [s.id, s]));

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)]">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead>
          <tr className="border-b border-[var(--theme-border)] text-[10px] uppercase tracking-wide text-[var(--theme-text-secondary)]">
            <th className="px-4 py-3 font-bold">Contato</th>
            <th className="px-4 py-3 font-bold">Etapa</th>
            <th className="px-4 py-3 font-bold">Canal</th>
            <th className="px-4 py-3 font-bold">Responsável</th>
            <th className="px-4 py-3 text-right font-bold">Valor</th>
            <th className="px-4 py-3 font-bold">Prazo</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => {
            const stage = stageById.get(deal.stageId);
            return (
              <tr
                key={deal.id}
                onClick={() => onOpenDeal(deal)}
                className="cursor-pointer border-b border-[var(--theme-border)]/60 transition-colors last:border-0 hover:bg-[var(--theme-bg)]/50"
              >
                <td className="px-4 py-3">
                  <div className="font-bold text-[var(--theme-text-primary)]">
                    {deal.contact.name}
                  </div>
                  {deal.contact.company && (
                    <div className="text-[10px] text-[var(--theme-text-secondary)]">
                      {deal.contact.company}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {stage && (
                    <span
                      className="rounded-md px-2 py-0.5 text-[10px] font-bold"
                      style={{ backgroundColor: `${stage.colorHex}26`, color: stage.colorHex }}
                    >
                      {stage.name}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <ChannelBadge channel={deal.channel} />
                </td>
                <td className="px-4 py-3 text-[var(--theme-text-secondary)]">
                  {deal.assignedUserName ?? '—'}
                </td>
                <td
                  className="px-4 py-3 text-right font-black"
                  style={{ color: 'var(--primary-color)' }}
                >
                  {moeda(deal.dealValue)}
                </td>
                <td className="px-4 py-3">
                  <SlaLabel slaDueAt={deal.slaDueAt} />
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    aria-label={`Abrir WhatsApp de ${deal.contact.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onWhatsApp(deal);
                    }}
                    className="rounded-md p-1 text-emerald-400 transition-colors hover:bg-emerald-500/15"
                  >
                    <MessageCircle size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
