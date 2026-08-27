'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Search,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Calendar,
  X,
  Target,
  Users,
  FileText,
  ChevronRight,
  Flame,
  Sparkles,
} from 'lucide-react';
import { INITIAL_MEMBERS, MOCK_COURSES, MOCK_ARTICLES, MOCK_LEADS, Member, Lead } from '@/lib/mock-data';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);

  // Fetch real members on mount or when opening
  useEffect(() => {
    if (isOpen) {
      async function loadData() {
        try {
          const res = await fetch('/api/members');
          const data = await res.json();
          if (data.ok && data.members && data.members.length > 0) {
            setMembers(data.members);
          }
        } catch (e) {
          // fallback to INITIAL_MEMBERS
        }
      }
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      (m.specialty && m.specialty.toLowerCase().includes(query.toLowerCase())) ||
      (m.companyName && m.companyName.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredLeads = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(query.toLowerCase()) ||
      l.company.toLowerCase().includes(query.toLowerCase()) ||
      l.specialty.toLowerCase().includes(query.toLowerCase())
  );

  const filteredCourses = MOCK_COURSES.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  const filteredArticles = MOCK_ARTICLES.filter(
    (a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase())
  );

  const openMemberSheet = (memberId: string) => {
    router.push(`/mentorados?memberId=${memberId}`);
    onClose();
  };

  const openLeadSheet = (leadId: string) => {
    router.push(`/crm?leadId=${leadId}`);
    onClose();
  };

  const navigateTo = (path: string) => {
    router.push(path);
    onClose();
  };

  const paletteNode = (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-20 px-4 modal-backdrop-animate">
      <div className="w-full max-w-2xl bg-[#131926] border border-[#1F293D] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] modal-card-animate">
        {/* Search Input Header */}
        <div className="flex items-center px-5 py-4 border-b border-[#1F293D] gap-3 bg-[#0B0F17]/80">
          <Search size={20} className="text-yellow-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar fichas de mentorados, leads do CRM, aulas ou procedimentos..."
            className="w-full bg-transparent text-slate-100 text-sm focus:outline-none placeholder-slate-500"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-500 hover:text-slate-300 text-xs font-semibold px-2 py-1 rounded bg-[#1F293D]">
              Limpar
            </button>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1 divide-y divide-[#1F293D]/60">
          {/* Quick Navigation Shortcuts */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
              Atalhos de Módulos
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={() => navigateTo('/crm')}
                className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#0B0F17]/50 hover:bg-theme-primary/10 hover:border-theme-primary/40 border border-[#1F293D] text-xs font-semibold text-slate-300 transition-all text-left group"
              >
                <Target size={16} className="text-theme-primary group-hover:scale-110 transition-transform" />
                <span>CRM Novos Leads</span>
              </button>
              <button
                onClick={() => navigateTo('/mentorados')}
                className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#0B0F17]/50 hover:bg-theme-primary/10 hover:border-theme-primary/40 border border-[#1F293D] text-xs font-semibold text-slate-300 transition-all text-left group"
              >
                <Users size={16} className="text-theme-primary group-hover:scale-110 transition-transform" />
                <span>Mentorados da Base</span>
              </button>
              <button
                onClick={() => navigateTo('/academy')}
                className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#0B0F17]/50 hover:bg-theme-primary/10 hover:border-theme-primary/40 border border-[#1F293D] text-xs font-semibold text-slate-300 transition-all text-left group"
              >
                <GraduationCap size={16} className="text-theme-primary group-hover:scale-110 transition-transform" />
                <span>Rocket Academy</span>
              </button>
              <button
                onClick={() => navigateTo('/wiki')}
                className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#0B0F17]/50 hover:bg-theme-primary/10 hover:border-theme-primary/40 border border-[#1F293D] text-xs font-semibold text-slate-300 transition-all text-left group"
              >
                <BookOpen size={16} className="text-theme-primary group-hover:scale-110 transition-transform" />
                <span>Wiki de Processos</span>
              </button>
              <button
                onClick={() => navigateTo('/financial')}
                className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#0B0F17]/50 hover:bg-theme-primary/10 hover:border-theme-primary/40 border border-[#1F293D] text-xs font-semibold text-slate-300 transition-all text-left group"
              >
                <TrendingUp size={16} className="text-theme-primary group-hover:scale-110 transition-transform" />
                <span>Gestão Financeira</span>
              </button>
              <button
                onClick={() => navigateTo('/events')}
                className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#0B0F17]/50 hover:bg-theme-primary/10 hover:border-theme-primary/40 border border-[#1F293D] text-xs font-semibold text-slate-300 transition-all text-left group"
              >
                <Calendar size={16} className="text-theme-primary group-hover:scale-110 transition-transform" />
                <span>Agenda de Eventos</span>
              </button>
            </div>
          </div>

          {/* Members / Fichas dos Mentorados */}
          {filteredMembers.length > 0 && (
            <div className="pt-4 space-y-2">
              <span className="text-[10px] font-bold text-theme-primary uppercase tracking-wider px-1 flex items-center gap-1.5">
                <Users size={12} /> Fichas de Mentorados da Base ({filteredMembers.length})
              </span>
              <div className="space-y-1.5">
                {filteredMembers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => openMemberSheet(m.id)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#0B0F17]/40 hover:bg-[#1F293D] hover:border-theme-primary/40 border border-[#1F293D]/60 text-left transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-300 text-slate-950 font-bold flex items-center justify-center text-xs shadow shrink-0">
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-100 group-hover:text-theme-primary transition-colors block">
                          {m.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {m.specialty} • {m.companyName || 'Empresa Própria'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-theme-badge-bg text-theme-primary border border-theme-badge-border">
                        {m.status}
                      </span>
                      <span className="text-[11px] font-bold text-yellow-400 flex items-center gap-1 group-hover:underline">
                        Abrir Ficha <ChevronRight size={14} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Leads do CRM */}
          {filteredLeads.length > 0 && (
            <div className="pt-4 space-y-2">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
                <Target size={12} /> Oportunidades & Leads no CRM ({filteredLeads.length})
              </span>
              <div className="space-y-1.5">
                {filteredLeads.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => openLeadSheet(l.id)}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#0B0F17]/40 hover:bg-[#1F293D] hover:border-blue-500/30 border border-[#1F293D]/60 text-left transition-all group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
                          {l.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold">
                          {l.source}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">{l.company} • R$ {l.estimatedValue.toLocaleString('pt-BR')}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-emerald-400">
                        {l.stage.toUpperCase()}
                      </span>
                      <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1 group-hover:underline">
                        Ver Diagnóstico <ChevronRight size={14} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Courses */}
          {filteredCourses.length > 0 && (
            <div className="pt-4 space-y-2">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
                <GraduationCap size={12} /> Cursos na Academy ({filteredCourses.length})
              </span>
              <div className="space-y-1.5">
                {filteredCourses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigateTo('/academy')}
                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#1F293D] text-left transition-colors"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">{c.title}</span>
                      <span className="text-[11px] text-slate-400">{c.category} • {c.lessonsCount} aulas</span>
                    </div>
                    <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1">
                      Acessar <ChevronRight size={14} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Wiki Articles */}
          {filteredArticles.length > 0 && (
            <div className="pt-4 space-y-2">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
                <BookOpen size={12} /> Artigos & SOPs na Wiki ({filteredArticles.length})
              </span>
              <div className="space-y-1.5">
                {filteredArticles.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => navigateTo('/wiki')}
                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[#1F293D] text-left transition-colors"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">{a.title}</span>
                      <span className="text-[11px] text-slate-400">{a.department} • {a.category}</span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                      Ler <ChevronRight size={14} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-[#1F293D] bg-[#0B0F17]/70 flex items-center justify-between text-[11px] text-slate-500">
          <span>Pressione <kbd className="text-slate-300 font-mono px-1.5 py-0.5 rounded bg-[#1F293D]">ESC</kbd> para fechar</span>
          <span>Pesquisa instantânea em todo o ecossistema Rocket</span>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(paletteNode, document.body) : null;
}
