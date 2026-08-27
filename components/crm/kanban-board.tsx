'use client';

import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { KanbanColumn } from './kanban-column';
import type { DealCardDTO, StageDTO } from '@/lib/crm/types';

/**
 * Quadro do funil.
 *
 * Só orquestra: recebe etapas e cards já filtrados, distribui por coluna e
 * repassa o resultado do arrasto. Quem persiste é o `useCrm`, que trata o
 * otimismo e o desfazer.
 */

interface KanbanBoardProps {
  stages: StageDTO[];
  deals: DealCardDTO[];
  onMove: (dealId: string, toStageId: string) => void;
  onOpenDeal: (deal: DealCardDTO) => void;
  onWhatsApp: (deal: DealCardDTO) => void;
  onRemoveTag: (contactId: string, tagId: string) => void;
  onBroadcast: (stage: StageDTO) => void;
  onAddDeal: (stage: StageDTO) => void;
}

export function KanbanBoard({
  stages,
  deals,
  onMove,
  onOpenDeal,
  onWhatsApp,
  onRemoveTag,
  onBroadcast,
  onAddDeal,
}: KanbanBoardProps) {
  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    onMove(draggableId, destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-3">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            deals={deals.filter((d) => d.stageId === stage.id)}
            onOpenDeal={onOpenDeal}
            onWhatsApp={onWhatsApp}
            onRemoveTag={onRemoveTag}
            onBroadcast={onBroadcast}
            onAddDeal={onAddDeal}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
