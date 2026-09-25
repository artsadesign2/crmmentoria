'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface TaskCalendarProps {
  tasks: any[];
  onTaskClick: (taskId: string) => void;
  onAddTaskOnDate: (date: Date) => void;
}

export function TaskCalendar({
  tasks,
  onTaskClick,
  onAddTaskOnDate,
}: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENTE': return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'ALTA': return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'MEDIA': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      case 'BAIXA':
      default: return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  const today = new Date();

  return (
    <div className="bg-[#131B2E]/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-6">
      {/* Top Header do Calendário */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CalendarIcon size={20} className="text-yellow-400" />
          <h2 className="text-lg font-bold text-white">
            {monthNames[month]} <span className="text-slate-400 font-normal">{year}</span>
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Hoje
          </button>
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60">
            <button
              onClick={prevMonth}
              className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={nextMonth}
              className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid dos Dias da Semana */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800">
        <div>Dom</div>
        <div>Seg</div>
        <div>Ter</div>
        <div>Qua</div>
        <div>Qui</div>
        <div>Sex</div>
        <div>Sáb</div>
      </div>

      {/* Grid de Dias */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((dayDate, idx) => {
          if (!dayDate) {
            return <div key={`empty-${idx}`} className="h-32 bg-slate-900/20 rounded-xl border border-transparent" />;
          }

          const isCurrentToday =
            dayDate.getDate() === today.getDate() &&
            dayDate.getMonth() === today.getMonth() &&
            dayDate.getFullYear() === today.getFullYear();

          // Tarefas deste dia
          const dayTasks = tasks.filter((t) => {
            if (!t.dueDate) return false;
            const due = new Date(t.dueDate);
            return (
              due.getDate() === dayDate.getDate() &&
              due.getMonth() === dayDate.getMonth() &&
              due.getFullYear() === dayDate.getFullYear()
            );
          });

          return (
            <div
              key={dayDate.toISOString()}
              className={`group h-32 p-2 rounded-xl border flex flex-col justify-between transition-all ${
                isCurrentToday
                  ? 'bg-yellow-400/5 border-yellow-400/40 ring-1 ring-yellow-400/20'
                  : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Dia Header */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                    isCurrentToday ? 'bg-yellow-400 text-slate-950' : 'text-slate-300'
                  }`}
                >
                  {dayDate.getDate()}
                </span>
                <button
                  onClick={() => onAddTaskOnDate(dayDate)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-yellow-400 rounded hover:bg-slate-800 transition-opacity"
                  title="Nova tarefa neste dia"
                >
                  <Plus size={13} />
                </button>
              </div>

              {/* Lista de Tarefas do Dia */}
              <div className="flex-1 overflow-y-auto space-y-1 mt-1 custom-scrollbar">
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task.id)}
                    className={`cursor-pointer px-1.5 py-1 rounded text-[10px] font-medium border truncate transition-transform hover:scale-[1.02] flex items-center space-x-1 ${getPriorityColor(
                      task.priority
                    )}`}
                    title={task.title}
                  >
                    {task.completedAt && <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />}
                    <span className="truncate">{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
