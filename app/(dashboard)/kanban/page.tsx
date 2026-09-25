'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Kanban as KanbanIcon,
  List as ListIcon,
  Calendar as CalendarIcon,
  Plus,
  Search,
  Filter,
  Folder,
  ChevronDown,
  Sparkles,
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  RefreshCw,
} from 'lucide-react';
import { TaskBoard } from '@/components/tasks/task-board';
import { TaskList } from '@/components/tasks/task-list';
import { TaskCalendar } from '@/components/tasks/task-calendar';
import { TaskDetailDrawer } from '@/components/tasks/task-detail-drawer';
import { NewTaskModal } from '@/components/tasks/new-task-modal';
import { NewProjectModal } from '@/components/tasks/new-project-modal';
import { CalendarSyncModal } from '@/components/tasks/calendar-sync-modal';

type ViewMode = 'kanban' | 'list' | 'calendar';
type FilterType = 'all' | 'my_tasks' | 'today' | 'upcoming' | 'overdue' | 'completed';

export default function TasksWorkspacePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Data
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Drawers
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskColumnId, setNewTaskColumnId] = useState<string | undefined>(undefined);
  const [newTaskInitialDate, setNewTaskInitialDate] = useState<Date | null>(null);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isCalendarSyncOpen, setIsCalendarSyncOpen] = useState(false);

  // Carregar Projetos & Membros
  const loadProjectsAndMembers = useCallback(async () => {
    try {
      const [projRes, usersRes] = await Promise.all([
        fetch('/api/tasks/projects'),
        fetch('/api/users'),
      ]);

      const projData = await projRes.json();
      const usersData = await usersRes.json();

      if (projData.ok && projData.projects) {
        setProjects(projData.projects);
        if (!selectedProjectId && projData.projects.length > 0) {
          setSelectedProjectId(projData.projects[0].id);
        }
      }

      if (usersData.ok && usersData.users) {
        setTeamMembers(usersData.users);
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedProjectId]);

  // Carregar Tarefas
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (selectedProjectId) query.set('projectId', selectedProjectId);
      if (filter !== 'all') query.set('filter', filter);
      if (priorityFilter) query.set('priority', priorityFilter);
      if (search) query.set('search', search);

      const res = await fetch(`/api/tasks?${query.toString()}`);
      const data = await res.json();
      if (data.ok && data.tasks) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, filter, priorityFilter, search]);

  useEffect(() => {
    loadProjectsAndMembers();
  }, [loadProjectsAndMembers]);

  useEffect(() => {
    if (selectedProjectId) {
      loadTasks();
    }
  }, [selectedProjectId, loadTasks]);

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const columns = activeProject?.columns || [];

  // Handlers
  const handleOpenTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsDrawerOpen(true);
  };

  const handleOpenNewTaskForColumn = (columnId?: string) => {
    setNewTaskColumnId(columnId);
    setNewTaskInitialDate(null);
    setIsNewTaskOpen(true);
  };

  const handleOpenNewTaskForDate = (date: Date) => {
    setNewTaskColumnId(undefined);
    setNewTaskInitialDate(date);
    setIsNewTaskOpen(true);
  };

  const handleTaskMoved = async (taskId: string, targetColumnId: string, newPosition: number) => {
    // Atualização otimista
    const targetColumn = columns.find((c: any) => c.id === targetColumnId);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              columnId: targetColumnId,
              column: targetColumn || t.column,
              completedAt: targetColumn?.isCompletedColumn ? new Date() : null,
              position: newPosition,
            }
          : t
      )
    );

    try {
      await fetch(`/api/tasks/${taskId}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId: targetColumnId, position: newPosition }),
      });
      loadProjectsAndMembers();
    } catch (err) {
      console.error(err);
      loadTasks();
    }
  };

  const handleToggleComplete = async (task: any) => {
    const isCompleted = Boolean(task.completedAt);
    const completedColumn = columns.find((c: any) => c.isCompletedColumn) || columns[columns.length - 1];
    const initialColumn = columns.find((c: any) => !c.isCompletedColumn) || columns[0];

    const targetColumnId = isCompleted ? initialColumn?.id : completedColumn?.id;

    if (targetColumnId) {
      await handleTaskMoved(task.id, targetColumnId, 0);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A]/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400 shadow-inner">
              <KanbanIcon size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Projetos & Tarefas
                <span className="text-[10px] uppercase font-mono bg-yellow-400 text-slate-950 px-2 py-0.5 rounded font-bold">
                  ClickUp + Notion
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Gestão ágil de demandas, subtarefas e sincronização automática com Google Agenda.
              </p>
            </div>
          </div>
        </div>

        {/* Ações do Header */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Botão Sincronizar Google Agenda */}
          <button
            onClick={() => setIsCalendarSyncOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
          >
            <CalendarIcon size={14} className="text-yellow-400" />
            <span>Google Agenda (iCal)</span>
          </button>

          {/* Botão Novo Projeto */}
          <button
            onClick={() => setIsNewProjectOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
          >
            <Folder size={14} className="text-yellow-400" />
            <span>Novo Projeto</span>
          </button>

          {/* Botão Criar Tarefa */}
          <button
            onClick={() => handleOpenNewTaskForColumn()}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-md hover:shadow-yellow-400/20"
          >
            <Plus size={15} />
            <span>Criar Tarefa</span>
          </button>
        </div>
      </div>

      {/* Barra de Controle: Seletor de Projeto, Modos de Visualização e Filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Seletor de Projeto + Modos de Visualização */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Dropdown de Projeto */}
          <div className="relative">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-[#131B2E] text-white border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-yellow-400 appearance-none pr-8 cursor-pointer shadow-sm"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.completedTasks}/{p.totalTasks})
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
          </div>

          {/* Alternador de Visualização (Kanban / Lista / Calendário) */}
          <div className="flex items-center bg-[#131B2E] border border-slate-800 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-yellow-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KanbanIcon size={14} />
              <span>Quadro</span>
            </button>

            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-yellow-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListIcon size={14} />
              <span>Lista</span>
            </button>

            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'calendar'
                  ? 'bg-yellow-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarIcon size={14} />
              <span>Calendário</span>
            </button>
          </div>
        </div>

        {/* Filtros Rápidos (Todoist / ClickUp style) */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'my_tasks', label: 'Minhas Tarefas' },
            { id: 'today', label: 'Hoje' },
            { id: 'upcoming', label: '7 Dias' },
            { id: 'overdue', label: 'Atrasadas' },
            { id: 'completed', label: 'Concluídas' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as FilterType)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filter === f.id
                  ? 'bg-slate-800 text-yellow-400 border border-yellow-400/40 font-bold'
                  : 'bg-[#131B2E]/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Barra de Busca & Prioridade */}
      <div className="flex items-center justify-between gap-3 bg-[#131B2E]/40 border border-slate-800/80 rounded-xl p-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar tarefas..."
            className="w-full bg-slate-900/80 text-xs text-white placeholder-slate-500 rounded-lg pl-9 pr-3 py-1.5 border border-slate-800 focus:outline-none focus:border-yellow-400"
          />
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-900 text-xs text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="">Todas Prioridades</option>
            <option value="URGENTE">🔴 Urgentes</option>
            <option value="ALTA">🟠 Altas</option>
            <option value="MEDIA">🟡 Médias</option>
            <option value="BAIXA">🟢 Baixas</option>
          </select>
        </div>
      </div>

      {/* Conteúdo Principal Conforme a Visualização Ativa */}
      {loading && tasks.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-3 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-400" />
          <span className="text-xs font-semibold">Carregando tarefas...</span>
        </div>
      ) : (
        <>
          {viewMode === 'kanban' && (
            <TaskBoard
              columns={columns}
              tasks={tasks}
              onTaskClick={handleOpenTask}
              onAddTask={handleOpenNewTaskForColumn}
              onTaskMoved={handleTaskMoved}
            />
          )}

          {viewMode === 'list' && (
            <TaskList
              tasks={tasks}
              onTaskClick={handleOpenTask}
              onAddTask={() => handleOpenNewTaskForColumn()}
              onToggleComplete={handleToggleComplete}
            />
          )}

          {viewMode === 'calendar' && (
            <TaskCalendar
              tasks={tasks}
              onTaskClick={handleOpenTask}
              onAddTaskOnDate={handleOpenNewTaskForDate}
            />
          )}
        </>
      )}

      {/* Modal / Drawer Notion-Style de Detalhes da Tarefa */}
      <TaskDetailDrawer
        taskId={selectedTaskId}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedTaskId(null);
        }}
        onTaskUpdated={() => {
          loadTasks();
          loadProjectsAndMembers();
        }}
        teamMembers={teamMembers}
        columns={columns}
      />

      {/* Modal Criar Tarefa */}
      <NewTaskModal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        onTaskCreated={() => {
          loadTasks();
          loadProjectsAndMembers();
        }}
        projectId={selectedProjectId}
        columnId={newTaskColumnId}
        initialDate={newTaskInitialDate}
        columns={columns}
        teamMembers={teamMembers}
      />

      {/* Modal Criar Projeto */}
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onProjectCreated={(newProject) => {
          loadProjectsAndMembers();
          setSelectedProjectId(newProject.id);
        }}
      />

      {/* Modal Sincronizar Google Agenda */}
      <CalendarSyncModal
        isOpen={isCalendarSyncOpen}
        onClose={() => setIsCalendarSyncOpen(false)}
      />
    </div>
  );
}
