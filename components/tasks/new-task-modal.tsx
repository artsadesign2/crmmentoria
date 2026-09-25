'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Flag, User, Plus, CheckSquare, Sparkles } from 'lucide-react';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  projectId: string;
  columnId?: string;
  initialDate?: Date | null;
  columns: Array<{ id: string; name: string; colorHex: string }>;
  teamMembers: Array<{ id: string; name: string; email: string }>;
}

export function NewTaskModal({
  isOpen,
  onClose,
  onTaskCreated,
  projectId,
  columnId,
  initialDate,
  columns,
  teamMembers,
}: NewTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIA');
  const [selectedColumnId, setSelectedColumnId] = useState(columnId || columns[0]?.id || '');
  const [assignedToId, setAssignedToId] = useState('');
  const [dueDate, setDueDate] = useState(
    initialDate ? new Date(initialDate.getTime() + 18 * 60 * 60 * 1000).toISOString().slice(0, 16) : ''
  );
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    setSubtasks([...subtasks, newSubtask.trim()]);
    setNewSubtask('');
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          priority,
          projectId,
          columnId: selectedColumnId || columns[0]?.id,
          assignedToId: assignedToId || null,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          subtasks,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setTitle('');
        setDescription('');
        setSubtasks([]);
        onTaskCreated();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-lg bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#1E293B]/40">
              <div className="flex items-center space-x-2">
                <Sparkles size={16} className="text-yellow-400" />
                <h3 className="text-sm font-bold text-white">Criar Nova Tarefa</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Título */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Título da Tarefa *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Desenvolver nova landing page do mentorado..."
                  className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-yellow-400 transition-colors"
                />
              </div>

              {/* Grid: Coluna + Prioridade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Coluna / Etapa
                  </label>
                  <select
                    value={selectedColumnId}
                    onChange={(e) => setSelectedColumnId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400"
                  >
                    {columns.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Prioridade
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="URGENTE">Urgente</option>
                    <option value="ALTA">Alta</option>
                    <option value="MEDIA">Média</option>
                    <option value="BAIXA">Baixa</option>
                  </select>
                </div>
              </div>

              {/* Grid: Responsável + Data Limite */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Responsável
                  </label>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400"
                  >
                    <option value="">Nenhum (Livre)</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Prazo de Entrega (Google Agenda)
                  </label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Descrição & Instruções (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contexto, links ou notas rápidas..."
                  className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl p-3 text-xs focus:outline-none focus:border-yellow-400"
                />
              </div>

              {/* Subtarefas Iniciais */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Subtarefas Iniciais (Checklist)
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    placeholder="Adicionar item..."
                    className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-yellow-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-yellow-400 rounded-xl text-xs font-bold transition-colors"
                  >
                    + Add
                  </button>
                </div>
                {subtasks.length > 0 && (
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {subtasks.map((st, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-slate-900/60 px-3 py-1.5 rounded-lg text-xs text-slate-300"
                      >
                        <span>• {st}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtask(i)}
                          className="text-slate-500 hover:text-red-400"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {loading ? 'Criando...' : 'Criar Tarefa'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
