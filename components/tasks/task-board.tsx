'use client';

import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  Plus,
  Calendar,
  CheckSquare,
  MessageSquare,
  AlertCircle,
  Flag,
  User,
  MoreVertical,
} from 'lucide-react';

interface TaskBoardProps {
  columns: Array<{
    id: string;
    name: string;
    colorHex: string;
    isCompletedColumn: boolean;
  }>;
  tasks: any[];
  onTaskClick: (taskId: string) => void;
  onAddTask: (columnId: string) => void;
  onTaskMoved: (taskId: string, targetColumnId: string, newPosition: number) => void;
}

export function TaskBoard({
  columns,
  tasks,
  onTaskClick,
  onAddTask,
  onTaskMoved,
}: TaskBoardProps) {
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    onTaskMoved(draggableId, destination.droppableId, destination.index);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENTE':
        return <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold px-2 py-0.5 rounded">🔴 Urgente</span>;
      case 'ALTA':
        return <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-bold px-2 py-0.5 rounded">🟠 Alta</span>;
      case 'MEDIA':
        return <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[10px] font-bold px-2 py-0.5 rounded">🟡 Média</span>;
      case 'BAIXA':
      default:
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded">🟢 Baixa</span>;
    }
  };

  const getDueDateBadge = (dueDateStr: string | null, isCompleted: boolean) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr);
    const now = new Date();
    const isOverdue = !isCompleted && due < now;
    const isToday =
      !isCompleted &&
      due.getDate() === now.getDate() &&
      due.getMonth() === now.getMonth() &&
      due.getFullYear() === now.getFullYear();

    const formatted = due.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

    if (isCompleted) {
      return (
        <span className="flex items-center space-x-1 text-[11px] text-slate-500">
          <Calendar size={11} />
          <span>{formatted}</span>
        </span>
      );
    }

    if (isOverdue) {
      return (
        <span className="flex items-center space-x-1 text-[11px] font-semibold text-red-400 bg-red-950/40 border border-red-500/40 px-1.5 py-0.5 rounded">
          <AlertCircle size={11} />
          <span>{formatted} (Atrasado)</span>
        </span>
      );
    }

    if (isToday) {
      return (
        <span className="flex items-center space-x-1 text-[11px] font-semibold text-yellow-400 bg-yellow-950/40 border border-yellow-500/40 px-1.5 py-0.5 rounded">
          <Calendar size={11} />
          <span>Hoje</span>
        </span>
      );
    }

    return (
      <span className="flex items-center space-x-1 text-[11px] text-slate-400">
        <Calendar size={11} />
        <span>{formatted}</span>
      </span>
    );
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex space-x-4 overflow-x-auto pb-6 pt-2 select-none">
        {columns.map((column) => {
          const columnTasks = tasks
            .filter((t) => t.columnId === column.id)
            .sort((a, b) => a.position - b.position);

          return (
            <div
              key={column.id}
              className="w-80 min-w-[320px] max-w-[320px] flex flex-col bg-[#131B2E]/60 border border-slate-800/80 rounded-2xl p-3.5 backdrop-blur-md"
            >
              {/* Header da Coluna */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: column.colorHex || '#64748B' }}
                  />
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    {column.name}
                  </h3>
                  <span className="text-[11px] font-semibold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>

                <button
                  onClick={() => onAddTask(column.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Adicionar tarefa nesta coluna"
                >
                  <Plus size={15} />
                </button>
              </div>

              {/* Lista de Cards Droppable */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 space-y-3 min-h-[140px] rounded-xl p-1 transition-colors ${
                      snapshot.isDraggingOver ? 'bg-slate-800/30 border border-yellow-400/20' : ''
                    }`}
                  >
                    {columnTasks.map((task, index) => {
                      const completedSubtasks = (task.subtasks || []).filter((st: any) => st.isCompleted).length;
                      const totalSubtasks = (task.subtasks || []).length;

                      return (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => onTaskClick(task.id)}
                              className={`group cursor-pointer bg-[#1E293B] border border-slate-700/60 hover:border-yellow-400/60 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all ${
                                snapshot.isDragging ? 'shadow-2xl border-yellow-400 scale-[1.02] rotate-1 z-50' : ''
                              }`}
                            >
                              {/* Top Bar: Prioridade & Projeto */}
                              <div className="flex items-center justify-between gap-2 mb-2">
                                {getPriorityBadge(task.priority)}
                                {task.project && (
                                  <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">
                                    {task.project.name}
                                  </span>
                                )}
                              </div>

                              {/* Título da Tarefa */}
                              <h4 className="text-xs font-semibold text-white group-hover:text-yellow-300 transition-colors line-clamp-2 leading-relaxed mb-3">
                                {task.title}
                              </h4>

                              {/* Footer com Metadados */}
                              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                                <div className="flex items-center space-x-2">
                                  {getDueDateBadge(task.dueDate, Boolean(task.completedAt))}

                                  {totalSubtasks > 0 && (
                                    <span className="flex items-center space-x-1 text-[11px] text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded">
                                      <CheckSquare size={11} className={completedSubtasks === totalSubtasks ? 'text-emerald-400' : 'text-slate-400'} />
                                      <span>{completedSubtasks}/{totalSubtasks}</span>
                                    </span>
                                  )}

                                  {(task._count?.comments > 0 || task.comments?.length > 0) && (
                                    <span className="flex items-center space-x-1 text-[11px] text-slate-400">
                                      <MessageSquare size={11} />
                                      <span>{task._count?.comments ?? task.comments.length}</span>
                                    </span>
                                  )}
                                </div>

                                {/* Responsável Avatar */}
                                {task.assignedTo ? (
                                  <div
                                    className="w-5 h-5 rounded-full bg-yellow-400 text-slate-950 font-bold text-[10px] flex items-center justify-center shrink-0 shadow"
                                    title={`Responsável: ${task.assignedTo.name}`}
                                  >
                                    {task.assignedTo.name?.slice(0, 1).toUpperCase()}
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full border border-dashed border-slate-600 flex items-center justify-center text-slate-500">
                                    <User size={10} />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {/* Botão "+ Nova Tarefa" no rodapé da coluna */}
              <button
                onClick={() => onAddTask(column.id)}
                className="mt-2 w-full py-2 flex items-center justify-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-yellow-400 hover:bg-slate-800/60 rounded-xl border border-dashed border-slate-800 hover:border-yellow-400/40 transition-all"
              >
                <Plus size={13} />
                <span>Nova Tarefa</span>
              </button>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
