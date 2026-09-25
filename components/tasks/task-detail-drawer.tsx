'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar as CalendarIcon,
  User,
  Flag,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  MessageSquare,
  Send,
  Clock,
  Folder,
  Tag,
  AlertCircle,
  CheckSquare,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface TaskDetailDrawerProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
  teamMembers: Array<{ id: string; name: string; email: string; avatarUrl?: string | null; role?: string }>;
  columns: Array<{ id: string; name: string; colorHex: string; isCompletedColumn: boolean }>;
}

export function TaskDetailDrawer({
  taskId,
  isOpen,
  onClose,
  onTaskUpdated,
  teamMembers,
  columns,
}: TaskDetailDrawerProps) {
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIA');
  const [columnId, setColumnId] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');

  // Subtasks & Comments
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (!taskId || !isOpen) return;

    setLoading(true);
    fetch(`/api/tasks/${taskId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.task) {
          const t = data.task;
          setTask(t);
          setTitle(t.title || '');
          setDescription(t.description || '');
          setPriority(t.priority || 'MEDIA');
          setColumnId(t.columnId || '');
          setAssignedToId(t.assignedToId || '');
          setDueDate(t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 16) : '');
          setStartDate(t.startDate ? new Date(t.startDate).toISOString().slice(0, 16) : '');
          setSubtasks(t.subtasks || []);
          setComments(t.comments || []);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [taskId, isOpen]);

  const handleUpdateField = async (field: string, value: any) => {
    if (!taskId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (data.ok) {
        setTask(data.task);
        onTaskUpdated();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !taskId) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSubtaskTitle.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setSubtasks([...subtasks, data.subtask]);
        setNewSubtaskTitle('');
        onTaskUpdated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, currentStatus: boolean) => {
    if (!taskId) return;
    const nextStatus = !currentStatus;
    setSubtasks(subtasks.map((st) => (st.id === subtaskId ? { ...st, isCompleted: nextStatus } : st)));

    try {
      await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtaskId, isCompleted: nextStatus }),
      });
      onTaskUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!taskId) return;
    setSubtasks(subtasks.filter((st) => st.id !== subtaskId));
    try {
      await fetch(`/api/tasks/${taskId}/subtasks?subtaskId=${subtaskId}`, {
        method: 'DELETE',
      });
      onTaskUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !taskId) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setComments([data.comment, ...comments]);
        setNewComment('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const completedSubtasksCount = subtasks.filter((st) => st.isCompleted).length;
  const subtasksProgress = subtasks.length > 0 ? Math.round((completedSubtasksCount / subtasks.length) * 100) : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          />

          {/* Drawer Lateral Notion-Style */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-[#0F172A] border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header / Breadcrumb */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#1E293B]/40">
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <Folder size={14} className="text-yellow-400" />
                <span className="font-semibold text-slate-200">{task?.project?.name || 'Projeto'}</span>
                <ChevronRight size={12} />
                <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono text-[11px]">
                  {task?.id?.slice(0, 8)}
                </span>
                {saving && <span className="text-yellow-400 text-[11px] animate-pulse">Salvando...</span>}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-400"></div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 custom-scrollbar">
                {/* Título Editável */}
                <div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => handleUpdateField('title', title)}
                    placeholder="Título da tarefa..."
                    className="w-full text-2xl font-bold bg-transparent text-white placeholder-slate-600 border-b border-transparent hover:border-slate-700 focus:border-yellow-400 focus:outline-none transition-all py-1"
                  />
                </div>

                {/* Grid de Propriedades (Estilo Notion/ClickUp) */}
                <div className="grid grid-cols-2 gap-4 bg-[#1E293B]/50 p-4 rounded-xl border border-slate-800">
                  {/* Status / Coluna */}
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-semibold text-slate-400 w-24 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-slate-500" /> Status
                    </span>
                    <select
                      value={columnId}
                      onChange={(e) => {
                        setColumnId(e.target.value);
                        handleUpdateField('columnId', e.target.value);
                      }}
                      className="flex-1 bg-slate-900 text-xs font-medium text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-yellow-400"
                    >
                      {columns.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.name} {col.isCompletedColumn ? '✓' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Prioridade */}
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-semibold text-slate-400 w-24 flex items-center gap-1.5">
                      <Flag size={14} className="text-slate-500" /> Prioridade
                    </span>
                    <select
                      value={priority}
                      onChange={(e) => {
                        setPriority(e.target.value);
                        handleUpdateField('priority', e.target.value);
                      }}
                      className="flex-1 bg-slate-900 text-xs font-medium text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-yellow-400"
                    >
                      <option value="URGENTE">🔴 Urgente</option>
                      <option value="ALTA">🟠 Alta</option>
                      <option value="MEDIA">🟡 Média</option>
                      <option value="BAIXA">🟢 Baixa</option>
                    </select>
                  </div>

                  {/* Responsável */}
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-semibold text-slate-400 w-24 flex items-center gap-1.5">
                      <User size={14} className="text-slate-500" /> Responsável
                    </span>
                    <select
                      value={assignedToId}
                      onChange={(e) => {
                        setAssignedToId(e.target.value);
                        handleUpdateField('assignedToId', e.target.value);
                      }}
                      className="flex-1 bg-slate-900 text-xs font-medium text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-yellow-400"
                    >
                      <option value="">Não atribuído</option>
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Data Limite / Deadline */}
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-semibold text-slate-400 w-24 flex items-center gap-1.5">
                      <CalendarIcon size={14} className="text-slate-500" /> Prazo Final
                    </span>
                    <input
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => {
                        setDueDate(e.target.value);
                        handleUpdateField('dueDate', e.target.value ? new Date(e.target.value).toISOString() : null);
                      }}
                      className="flex-1 bg-slate-900 text-xs font-medium text-slate-200 border border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                </div>

                {/* Subtarefas / Checklists (Estilo Todoist) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckSquare size={16} className="text-yellow-400" />
                      <span className="text-sm font-bold text-white">Subtarefas & Checklist</span>
                      {subtasks.length > 0 && (
                        <span className="text-xs font-semibold bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                          {completedSubtasksCount}/{subtasks.length} ({subtasksProgress}%)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barra de Progresso */}
                  {subtasks.length > 0 && (
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-yellow-400 h-full transition-all duration-300"
                        style={{ width: `${subtasksProgress}%` }}
                      />
                    </div>
                  )}

                  {/* Lista de itens */}
                  <div className="space-y-1.5">
                    {subtasks.map((st) => (
                      <div
                        key={st.id}
                        className="group flex items-center justify-between p-2.5 bg-slate-900/60 hover:bg-slate-800/80 rounded-lg border border-slate-800/80 transition-colors"
                      >
                        <button
                          onClick={() => handleToggleSubtask(st.id, st.isCompleted)}
                          className="flex items-center space-x-3 flex-1 text-left"
                        >
                          {st.isCompleted ? (
                            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                          ) : (
                            <Circle size={16} className="text-slate-500 hover:text-yellow-400 shrink-0" />
                          )}
                          <span
                            className={`text-xs ${
                              st.isCompleted ? 'line-through text-slate-500' : 'text-slate-200 font-medium'
                            }`}
                          >
                            {st.title}
                          </span>
                        </button>
                        <button
                          onClick={() => handleDeleteSubtask(st.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Formulário de Nova Subtarefa */}
                  <form onSubmit={handleAddSubtask} className="flex items-center space-x-2 pt-1">
                    <input
                      type="text"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      placeholder="Adicionar um novo item de checklist..."
                      className="flex-1 bg-slate-900/80 text-xs text-white placeholder-slate-500 border border-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-400"
                    />
                    <button
                      type="submit"
                      disabled={!newSubtaskTitle.trim()}
                      className="px-3 py-2 bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      <Plus size={14} />
                    </button>
                  </form>
                </div>

                {/* Descrição em Markdown / Documento (Estilo Notion) */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm font-bold text-white">
                    <Sparkles size={16} className="text-yellow-400" />
                    <span>Descrição & Notas do Documento</span>
                  </div>
                  <textarea
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => handleUpdateField('description', description)}
                    placeholder="Escreva detalhes, links úteis, orientações, briefings ou contexto para a equipe..."
                    className="w-full bg-[#131B2E] text-slate-200 placeholder-slate-500 border border-slate-800 rounded-xl p-4 text-xs font-normal leading-relaxed focus:outline-none focus:border-yellow-400 transition-colors"
                  />
                </div>

                {/* Discussão & Comentários da Equipe */}
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="flex items-center space-x-2 text-sm font-bold text-white">
                    <MessageSquare size={16} className="text-yellow-400" />
                    <span>Discussão da Equipe ({comments.length})</span>
                  </div>

                  {/* Novo Comentário */}
                  <form onSubmit={handleAddComment} className="flex space-x-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Deixe um comentário ou menção..."
                      className="flex-1 bg-slate-900 text-xs text-white placeholder-slate-500 border border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:border-yellow-400"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim() || submittingComment}
                      className="px-4 py-2.5 bg-yellow-400 text-slate-950 rounded-xl text-xs font-bold flex items-center space-x-1.5 hover:bg-yellow-300 transition-colors disabled:opacity-50"
                    >
                      <Send size={13} />
                      <span>Enviar</span>
                    </button>
                  </form>

                  {/* Lista de Comentários */}
                  <div className="space-y-3">
                    {comments.map((c) => (
                      <div key={c.id} className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200">{c.user?.name || 'Membro'}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(c.createdAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{c.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
