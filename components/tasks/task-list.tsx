'use client';

import React from 'react';
import {
  CheckCircle2,
  Circle,
  Calendar,
  User,
  Flag,
  CheckSquare,
  MessageSquare,
  AlertCircle,
  Plus,
} from 'lucide-react';

interface TaskListProps {
  tasks: any[];
  onTaskClick: (taskId: string) => void;
  onAddTask: () => void;
  onToggleComplete: (task: any) => void;
}

export function TaskList({
  tasks,
  onTaskClick,
  onAddTask,
  onToggleComplete,
}: TaskListProps) {
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENTE':
        return <span className="text-[10px] font-bold text-red-400">🔴 Urgente</span>;
      case 'ALTA':
        return <span className="text-[10px] font-bold text-orange-400">🟠 Alta</span>;
      case 'MEDIA':
        return <span className="text-[10px] font-bold text-yellow-400">🟡 Média</span>;
      case 'BAIXA':
      default:
        return <span className="text-[10px] font-bold text-emerald-400">🟢 Baixa</span>;
    }
  };

  const getDueDateLabel = (dueDateStr: string | null, isCompleted: boolean) => {
    if (!dueDateStr) return <span className="text-slate-600 text-xs">—</span>;
    const due = new Date(dueDateStr);
    const now = new Date();
    const isOverdue = !isCompleted && due < now;

    return (
      <span
        className={`text-xs flex items-center space-x-1 ${
          isOverdue ? 'text-red-400 font-bold' : isCompleted ? 'text-slate-500' : 'text-slate-400'
        }`}
      >
        <Calendar size={12} />
        <span>{due.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
      </span>
    );
  };

  return (
    <div className="bg-[#131B2E]/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md">
      <div className="divide-y divide-slate-800/80">
        {tasks.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-3">
            <CheckSquare size={36} className="mx-auto text-slate-600" />
            <p className="text-sm font-medium">Nenhuma tarefa encontrada neste filtro.</p>
            <button
              onClick={onAddTask}
              className="px-4 py-2 bg-yellow-400 text-slate-950 rounded-xl text-xs font-bold hover:bg-yellow-300 transition-colors"
            >
              Criar Nova Tarefa
            </button>
          </div>
        ) : (
          tasks.map((task) => {
            const isCompleted = Boolean(task.completedAt);
            const completedSubtasks = (task.subtasks || []).filter((st: any) => st.isCompleted).length;
            const totalSubtasks = (task.subtasks || []).length;

            return (
              <div
                key={task.id}
                className="group flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/50 transition-colors cursor-pointer"
                onClick={() => onTaskClick(task.id)}
              >
                {/* Lado Esquerdo: Checkbox de Conclusão + Título */}
                <div className="flex items-center space-x-3.5 flex-1 min-w-0 pr-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleComplete(task);
                    }}
                    className="text-slate-500 hover:text-yellow-400 shrink-0 transition-colors"
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={18} className="text-emerald-400" />
                    ) : (
                      <Circle size={18} />
                    )}
                  </button>

                  <div className="min-w-0">
                    <h4
                      className={`text-xs font-semibold truncate ${
                        isCompleted ? 'line-through text-slate-500' : 'text-slate-100 group-hover:text-yellow-300'
                      }`}
                    >
                      {task.title}
                    </h4>
                    {task.project && (
                      <span className="text-[10px] text-slate-500 font-medium">
                        {task.project.name} • {task.column?.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Lado Direito: Metadados (Prioridade, Subtarefas, Prazo, Responsável) */}
                <div className="flex items-center space-x-6 shrink-0">
                  {totalSubtasks > 0 && (
                    <span className="flex items-center space-x-1 text-[11px] text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded">
                      <CheckSquare size={12} className={completedSubtasks === totalSubtasks ? 'text-emerald-400' : 'text-slate-500'} />
                      <span>{completedSubtasks}/{totalSubtasks}</span>
                    </span>
                  )}

                  <div className="w-20 text-right">{getPriorityBadge(task.priority)}</div>

                  <div className="w-24 text-right">{getDueDateLabel(task.dueDate, isCompleted)}</div>

                  <div className="w-28 flex items-center justify-end space-x-2">
                    {task.assignedTo ? (
                      <div className="flex items-center space-x-1.5" title={task.assignedTo.email}>
                        <div className="w-5 h-5 rounded-full bg-yellow-400 text-slate-950 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {task.assignedTo.name?.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="text-[11px] text-slate-300 truncate max-w-[80px]">
                          {task.assignedTo.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-600">—</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
