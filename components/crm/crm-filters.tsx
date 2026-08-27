'use client';

import { Search, LayoutGrid, List, Plus } from 'lucide-react';
import { CHANNELS, PRIORITIES, type ChannelType, type PriorityLevel } from '@/lib/crm/types';
import type { StageDTO } from '@/lib/crm/types';

/**
 * Busca e filtros do funil.
 *
 * Preserva os quatro filtros que a tela já tinha — busca, origem, prioridade e
 * etapa —, agora falando o vocabulário do CRM em vez do tipo `Lead`.
 */

const CHANNEL_LABELS: Record<ChannelType, string> = {
  WHATSAPP: 'WhatsApp',
  INSTAGRAM: 'Instagram',
  VOIP: 'Chamada',
  WEBCHAT: 'Webchat',
  WEBHOOK: 'Webhook',
};

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  URGENT: 'Urgente',
  HIGH: 'Alta',
  MEDIUM: 'Média',
  LOW: 'Baixa',
};

export interface CrmFilterState {
  search: string;
  channel: ChannelType | 'TODOS';
  priority: PriorityLevel | 'TODAS';
  stageId: string | 'TODAS';
}

export const FILTROS_INICIAIS: CrmFilterState = {
  search: '',
  channel: 'TODOS',
  priority: 'TODAS',
  stageId: 'TODAS',
};

const selectClass =
  'rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-xs font-semibold text-[var(--theme-text-primary)] outline-none transition-colors focus:border-[var(--primary-color)]';

interface CrmFiltersProps {
  filters: CrmFilterState;
  onChange: (filters: CrmFilterState) => void;
  stages: StageDTO[];
  viewMode: 'kanban' | 'table';
  onViewModeChange: (mode: 'kanban' | 'table') => void;
  onAddDeal: () => void;
}

export function CrmFilters({
  filters,
  onChange,
  stages,
  viewMode,
  onViewModeChange,
  onAddDeal,
}: CrmFiltersProps) {
  const set = <K extends keyof CrmFilterState>(key: K, value: CrmFilterState[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-secondary)]"
        />
        <input
          type="search"
          value={filters.search}
          onChange={(e) => set('search', e.target.value)}
          placeholder="Buscar por nome, empresa ou telefone"
          aria-label="Buscar oportunidades"
          className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] py-2 pl-9 pr-3 text-xs font-medium text-[var(--theme-text-primary)] outline-none transition-colors placeholder:text-[var(--theme-text-secondary)] focus:border-[var(--primary-color)]"
        />
      </div>

      <select
        value={filters.channel}
        onChange={(e) => set('channel', e.target.value as CrmFilterState['channel'])}
        aria-label="Filtrar por canal"
        className={selectClass}
      >
        <option value="TODOS">Todos os canais</option>
        {CHANNELS.map((c) => (
          <option key={c} value={c}>
            {CHANNEL_LABELS[c]}
          </option>
        ))}
      </select>

      <select
        value={filters.priority}
        onChange={(e) => set('priority', e.target.value as CrmFilterState['priority'])}
        aria-label="Filtrar por prioridade"
        className={selectClass}
      >
        <option value="TODAS">Todas as prioridades</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABELS[p]}
          </option>
        ))}
      </select>

      <select
        value={filters.stageId}
        onChange={(e) => set('stageId', e.target.value)}
        aria-label="Filtrar por etapa"
        className={selectClass}
      >
        <option value="TODAS">Todas as etapas</option>
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <div className="flex overflow-hidden rounded-xl border border-[var(--theme-border)]">
        {(['kanban', 'table'] as const).map((mode) => {
          const Icon = mode === 'kanban' ? LayoutGrid : List;
          const active = viewMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onViewModeChange(mode)}
              aria-label={mode === 'kanban' ? 'Ver como quadro' : 'Ver como tabela'}
              aria-pressed={active}
              className="p-2 transition-colors"
              style={{
                backgroundColor: active ? 'var(--theme-badge-bg)' : 'var(--theme-surface)',
                color: active ? 'var(--primary-color)' : 'var(--theme-text-secondary)',
              }}
            >
              <Icon size={14} />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAddDeal}
        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black text-[#0B0F17] transition-opacity hover:opacity-90"
        style={{ backgroundColor: 'var(--primary-color)' }}
      >
        <Plus size={14} />
        Nova oportunidade
      </button>
    </div>
  );
}
