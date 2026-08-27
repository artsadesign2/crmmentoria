'use client';

import { Search, Inbox as InboxIcon } from 'lucide-react';
import { ConversationItem } from './conversation-item';
import type { ConversationDTO, ConversationStatus, InboxScope } from '@/lib/crm/inbox-types';
import type { InboxFilterState } from '@/lib/crm/use-inbox';

/**
 * Coluna esquerda: as três visões da caixa e a busca.
 *
 * "Fila" tem contador porque é a única aba cujo número exige ação — conversa
 * sem responsável é cliente esperando. As outras duas não ganham contador para
 * o da fila não virar mais um número no meio de vários.
 */

const ABAS: Array<{ id: InboxScope; label: string }> = [
  { id: 'mine', label: 'Minhas' },
  { id: 'queue', label: 'Fila' },
  { id: 'all', label: 'Todas' },
];

const STATUS: Array<{ id: ConversationStatus | 'TODOS'; label: string }> = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'OPEN', label: 'Em aberto' },
  { id: 'PENDING', label: 'Aguardando' },
  { id: 'CLOSED', label: 'Encerradas' },
];

interface ConversationListProps {
  conversations: ConversationDTO[];
  activeId: string | null;
  filters: InboxFilterState;
  queueCount: number;
  onFiltersChange: (filters: InboxFilterState) => void;
  onOpen: (id: string) => void;
}

export function ConversationList({
  conversations,
  activeId,
  filters,
  queueCount,
  onFiltersChange,
  onOpen,
}: ConversationListProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)]">
      <div className="shrink-0 border-b border-[var(--theme-border)] p-2.5">
        <div className="flex gap-1">
          {ABAS.map((aba) => {
            const ativa = filters.scope === aba.id;
            return (
              <button
                key={aba.id}
                type="button"
                onClick={() => onFiltersChange({ ...filters, scope: aba.id })}
                aria-pressed={ativa}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors"
                style={{
                  backgroundColor: ativa ? 'var(--theme-badge-bg)' : 'transparent',
                  color: ativa ? 'var(--primary-color)' : 'var(--theme-text-secondary)',
                }}
              >
                {aba.label}
                {aba.id === 'queue' && queueCount > 0 && (
                  <span
                    className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black text-[#0B0F17]"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    {queueCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="relative mt-2">
          <Search
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-secondary)]"
          />
          <input
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            placeholder="Buscar por nome, empresa ou telefone"
            aria-label="Buscar conversas"
            className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] py-1.5 pl-7 pr-2 text-[11px] text-[var(--theme-text-primary)] outline-none transition-colors placeholder:text-[var(--theme-text-secondary)] focus:border-[var(--primary-color)]"
          />
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {STATUS.map((s) => {
            const ativo = filters.status === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onFiltersChange({ ...filters, status: s.id })}
                aria-pressed={ativo}
                className="rounded-md border px-1.5 py-0.5 text-[10px] font-bold transition-colors"
                style={{
                  borderColor: ativo ? 'var(--primary-color)' : 'var(--theme-border)',
                  color: ativo ? 'var(--primary-color)' : 'var(--theme-text-secondary)',
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-12 text-center">
            <InboxIcon size={22} style={{ color: 'var(--primary-color)' }} />
            <p className="text-xs font-bold text-[var(--theme-text-primary)]">
              {filters.scope === 'queue' ? 'Ninguém esperando.' : 'Nenhuma conversa aqui.'}
            </p>
            <p className="text-[11px] text-[var(--theme-text-secondary)]">
              {filters.search
                ? 'Nada corresponde à busca.'
                : 'Mensagens recebidas no WhatsApp aparecem nesta lista.'}
            </p>
          </div>
        ) : (
          conversations.map((conversa) => (
            <ConversationItem
              key={conversa.id}
              conversation={conversa}
              isActive={conversa.id === activeId}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </div>
  );
}
