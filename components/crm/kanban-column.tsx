'use client';

import { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { ChevronLeft, ChevronRight, Send, Plus } from 'lucide-react';
import { DealCard } from './deal-card';
import type { DealCardDTO, StageDTO } from '@/lib/crm/types';

/**
 * Coluna do funil.
 *
 * Cabeçalho conforme o Módulo 1 do PRD: barra colorida configurável por etapa,
 * contador de cards, somatório financeiro e ações rápidas de recolher e de
 * envio em massa.
 *
 * O somatório vem agregado do servidor, em `stage.totalValue` — não é somado a
 * partir dos cards visíveis. Com filtro ativo os dois números divergiriam, e o
 * rodapé da coluna deve refletir a etapa, não o recorte na tela.
 */

function moedaCompacta(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface KanbanColumnProps {
  stage: StageDTO;
  deals: DealCardDTO[];
  onOpenDeal: (deal: DealCardDTO) => void;
  onWhatsApp: (deal: DealCardDTO) => void;
  onRemoveTag: (contactId: string, tagId: string) => void;
  onBroadcast: (stage: StageDTO) => void;
  onAddDeal: (stage: StageDTO) => void;
}

export function KanbanColumn({
  stage,
  deals,
  onOpenDeal,
  onWhatsApp,
  onRemoveTag,
  onBroadcast,
  onAddDeal,
}: KanbanColumnProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="flex w-12 shrink-0 flex-col items-center gap-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)]/60 py-3">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label={`Expandir coluna ${stage.name}`}
          className="rounded-lg p-1 text-[var(--theme-text-secondary)] transition-colors hover:bg-[var(--theme-border)]"
        >
          <ChevronRight size={16} />
        </button>
        <span
          className="rounded-full px-1.5 py-0.5 text-[10px] font-black"
          style={{ backgroundColor: `${stage.colorHex}26`, color: stage.colorHex }}
        >
          {stage.cardCount}
        </span>
        <span
          className="whitespace-nowrap text-[11px] font-bold text-[var(--theme-text-secondary)]"
          style={{ writingMode: 'vertical-rl' }}
        >
          {stage.name}
        </span>
      </div>
    );
  }

  return (
    <section className="flex w-[290px] shrink-0 flex-col">
      {/* Barra colorida da etapa */}
      <div
        className="h-1 rounded-t-2xl"
        style={{ backgroundColor: stage.colorHex }}
        aria-hidden
      />

      <header className="flex items-center gap-2 border-x border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2.5">
        <h2 className="min-w-0 flex-1 truncate text-[12px] font-black text-[var(--theme-text-primary)]">
          {stage.name}
        </h2>

        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black"
          style={{ backgroundColor: `${stage.colorHex}26`, color: stage.colorHex }}
        >
          {stage.cardCount}
        </span>

        <button
          type="button"
          onClick={() => onBroadcast(stage)}
          title={`Envio em massa para ${stage.name}`}
          aria-label={`Envio em massa para ${stage.name}`}
          className="rounded-lg p-1 text-[var(--theme-text-secondary)] transition-colors hover:bg-[var(--theme-border)] hover:text-[var(--primary-color)]"
        >
          <Send size={13} />
        </button>

        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="Recolher coluna"
          aria-label={`Recolher coluna ${stage.name}`}
          className="rounded-lg p-1 text-[var(--theme-text-secondary)] transition-colors hover:bg-[var(--theme-border)]"
        >
          <ChevronLeft size={14} />
        </button>
      </header>

      {/* Somatório financeiro da etapa */}
      <div className="border-x border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/60 px-3 pb-2">
        <strong className="text-[13px] font-black" style={{ color: stage.colorHex }}>
          {moedaCompacta(stage.totalValue)}
        </strong>
      </div>

      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex min-h-[140px] flex-1 flex-col gap-2 rounded-b-2xl border-x border-b border-[var(--theme-border)] p-2 transition-colors ${
              snapshot.isDraggingOver ? 'bg-[var(--primary-glow)]' : 'bg-[var(--theme-bg)]/40'
            }`}
          >
            {deals.map((deal, index) => (
              <Draggable key={deal.id} draggableId={deal.id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                  >
                    <DealCard
                      deal={deal}
                      onOpen={onOpenDeal}
                      onWhatsApp={onWhatsApp}
                      onRemoveTag={onRemoveTag}
                      isDragging={dragSnapshot.isDragging}
                    />
                  </div>
                )}
              </Draggable>
            ))}

            {provided.placeholder}

            {deals.length === 0 && !snapshot.isDraggingOver && (
              <button
                type="button"
                onClick={() => onAddDeal(stage)}
                className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--theme-border)] py-6 text-[11px] font-semibold text-[var(--theme-text-secondary)] transition-colors hover:border-[var(--primary-color)]/50 hover:text-[var(--primary-color)]"
              >
                <Plus size={16} />
                Adicionar oportunidade
              </button>
            )}
          </div>
        )}
      </Droppable>
    </section>
  );
}
