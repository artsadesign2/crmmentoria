'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import {
  Plus,
  Search,
  Users,
  Building,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Target,
  Award,
  X,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
  Loader2,
  FileText,
  Eye,
  EyeOff,
  Download,
  Pencil,
  Trash2,
  MessageCircle,
  Save,
  Instagram,
  Linkedin,
  Globe,
  MapPin,
  Heart,
  Briefcase,
  Layers,
  Flame,
  Activity,
  AlertTriangle,
  UserCheck,
  GripVertical,
  TrendingUp,
  Filter,
  LayoutGrid,
  Kanban as KanbanIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Member, KANBAN_STAGES } from '@/lib/mock-data';
import { generatePdfDirectlyInPage } from '@/lib/pdf-export';
import { ConfirmDeleteModal } from '@/components/ui/confirm-delete-modal';
import { MenteeSheet } from '@/components/mentee-sheet';
import { maskPhone } from '@/lib/masks';
import { useTheme } from '@/lib/theme-context';
import { toast } from '@/lib/toast-context';

export default function MentoradosPage() {
  const { isLightMode, activePalette } = useTheme();
  const [members, setMembers] = useState<(Member & { excludeFromBook?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedMember, setSelectedMember] = useState<(Member & { excludeFromBook?: boolean }) | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('TODOS');
  const [viewMode, setViewMode] = useState<'kanban' | 'grid'>('kanban');
  const [deleteTargetMember, setDeleteTargetMember] = useState<Member | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Form State for new member
  const [newName, setNewName] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newRevenue, setNewRevenue] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newStatus, setNewStatus] = useState<Member['status']>('cinza');

  // In-Page PDF Generation State
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgressPercent, setPdfProgressPercent] = useState(0);
  const [pdfStatusMessage, setPdfStatusMessage] = useState('');
  const [pdfPageCountInfo, setPdfPageCountInfo] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    if (type === 'success') toast.success(text);
    else if (type === 'info') toast.info(text);
    else toast.warning(text);
  };

  // Instant client-side cached load
  useEffect(() => {
    try {
      const cached = localStorage.getItem('rocket_club_cached_members');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMembers(parsed);
          setLoading(false);
        }
      }
    } catch (e) {}
  }, []);

  // Background Fetch members
  useEffect(() => {
    async function loadMembers() {
      try {
        const res = await fetch('/api/members');
        const data = await res.json();
        if (data.ok && data.members) {
          const list = data.members.map((m: any) => ({
            ...m,
            excludeFromBook: typeof m.excludeFromBook === 'boolean' ? m.excludeFromBook : false,
          }));
          setMembers(list);
          try {
            localStorage.setItem('rocket_club_cached_members', JSON.stringify(list));
          } catch (e) {}

          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const targetId = params.get('memberId');
            if (targetId) {
              const target = list.find((m: any) => m.id === targetId);
              if (target) setSelectedMember(target);
            }
          }
        }
      } catch (err) {
        console.error('Erro ao carregar mentorados:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMembers();
  }, []);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        m.name.toLowerCase().includes(query) ||
        m.specialty.toLowerCase().includes(query) ||
        (m.companyName && m.companyName.toLowerCase().includes(query)) ||
        (m.tradeName && m.tradeName.toLowerCase().includes(query)) ||
        (m.phone && m.phone.includes(query)) ||
        (m.cnpj && m.cnpj.includes(query));

      const matchesStage = selectedStageFilter === 'TODOS' || m.status === selectedStageFilter;

      return matchesQuery && matchesStage;
    });
  }, [members, searchQuery, selectedStageFilter]);

  // Executive KPI Statistics
  const kpis = useMemo(() => {
    const total = members.length;
    const onboarding = members.filter((m) => m.status === 'azul').length;
    const activeEngaged = members.filter((m) => m.status === 'verde').length;
    const inRisk = members.filter((m) => m.status === 'vermelha').length;
    const attention = members.filter((m) => m.status === 'amarelo').length;

    const totalRevNum = members.reduce((acc, m) => {
      if (!m.monthlyRevenue) return acc;
      const clean = m.monthlyRevenue.replace(/[^\d]/g, '');
      const val = parseFloat(clean);
      return acc + (isNaN(val) ? 0 : val > 10000000 ? val / 100 : val);
    }, 0);

    const formattedRev = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(totalRevNum);

    return { total, onboarding, activeEngaged, inRisk, attention, formattedRev };
  }, [members]);

  // Drag and Drop Handler
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceStatus = source.droppableId as Member['status'];
    const destStatus = destination.droppableId as Member['status'];

    const draggedMember = members.find((m) => m.id === draggableId);
    if (!draggedMember) return;

    const stageInfo = KANBAN_STAGES.find((s) => s.id === destStatus);

    const updatedMembers = [...members];
    const memberIndex = updatedMembers.findIndex((m) => m.id === draggableId);
    if (memberIndex === -1) return;

    updatedMembers[memberIndex] = {
      ...updatedMembers[memberIndex],
      status: destStatus,
      lastContact: new Date().toISOString().split('T')[0],
      position: destination.index,
    };

    setMembers(updatedMembers);

    if (selectedMember && selectedMember.id === draggableId) {
      setSelectedMember(updatedMembers[memberIndex]);
    }

    showToast(`Mentorado "${draggedMember.name}" movido para "${stageInfo?.title || destStatus}"`);

    try {
      await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draggableId,
          status: destStatus,
          position: destination.index,
        }),
      });
    } catch (err) {
      console.error('Falha ao sincronizar movimentação de kanban:', err);
    }
  };

  const handleSaveMember = async (updatedMember: Member & { excludeFromBook?: boolean }) => {
    setMembers((prev) => prev.map((m) => (m.id === updatedMember.id ? updatedMember : m)));
    setSelectedMember(updatedMember);

    try {
      const res = await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMember),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Ficha cadastral salva no banco com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao salvar mentorado:', err);
      showToast('Erro ao sincronizar com o banco.', 'warning');
    }
  };

  const toggleExcludeFromBook = async (memberId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = members.find((m) => m.id === memberId);
    if (!target) return;

    const newExcl = !target.excludeFromBook;
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, excludeFromBook: newExcl } : m))
    );

    if (selectedMember && selectedMember.id === memberId) {
      setSelectedMember({ ...selectedMember, excludeFromBook: newExcl });
    }

    try {
      await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: memberId, excludeFromBook: newExcl }),
      });
    } catch (err) {}
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newMemberData = {
      name: newName.trim(),
      specialty: newSpecialty.trim() || 'Empresário / Mentorado',
      status: newStatus || 'cinza',
      email: newEmail.trim() || 'contato@cliente.com',
      phone: newPhone.trim() || '(11) 99999-0000',
      companyName: newCompany.trim() || 'Empresa Própria',
      monthlyRevenue: newRevenue.trim() || 'R$ 50.000,00',
      mainGoal: 'Escalar faturamento e estruturar equipe',
      notes: 'Novo mentorado adicionado ao pipeline Rocket Club.',
    };

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMemberData),
      });
      const data = await res.json();
      if (data.ok && data.member) {
        const added = { ...data.member, excludeFromBook: false };
        setMembers([added, ...members]);
        setSelectedMember(added);
        showToast('Novo mentorado adicionado! Ficha aberta para edição.');
      }
    } catch (err) {
      console.error('Erro ao salvar mentorado:', err);
      const fallbackMember: Member = {
        id: `m-${Date.now()}`,
        ...newMemberData,
        lastContact: new Date().toISOString().split('T')[0],
        position: 0,
      };
      setMembers([{ ...fallbackMember, excludeFromBook: false }, ...members]);
      setSelectedMember({ ...fallbackMember, excludeFromBook: false });
    }

    setNewName('');
    setNewSpecialty('');
    setNewCompany('');
    setNewRevenue('');
    setNewEmail('');
    setNewPhone('');
    setIsAddModalOpen(false);
  };

  const handlePromptDeleteMember = (member: Member) => {
    setDeleteTargetMember(member);
  };

  const handleConfirmDeleteMember = async () => {
    if (!deleteTargetMember) return;
    setIsDeletingMember(true);

    try {
      setMembers((prev) => prev.filter((m) => m.id !== deleteTargetMember.id));
      if (selectedMember?.id === deleteTargetMember.id) {
        setSelectedMember(null);
      }
      await fetch(`/api/members?id=${deleteTargetMember.id}`, { method: 'DELETE' });
      setDeleteTargetMember(null);
      showToast('Mentorado removido da base com sucesso.');
    } catch (err) {
      console.error('Erro ao excluir mentorado:', err);
    } finally {
      setIsDeletingMember(false);
    }
  };

  const handleDownloadSingleMemberPdf = async (memberId: string) => {
    setIsGeneratingPdf(true);
    setPdfProgressPercent(20);
    setPdfStatusMessage('Compilando ficha individual do mentorado...');
    setPdfPageCountInfo('');

    const success = await generatePdfDirectlyInPage(memberId, (current, total, msg) => {
      const pct = Math.round((current / total) * 100);
      setPdfProgressPercent(pct);
      setPdfStatusMessage(msg);
      setPdfPageCountInfo(`Página ${current} de ${total}`);
    });

    if (success) {
      setPdfStatusMessage('PDF gerado com sucesso!');
      setPdfProgressPercent(100);
      setTimeout(() => setIsGeneratingPdf(false), 1500);
    } else {
      setPdfStatusMessage('Abrindo em nova aba...');
      setTimeout(() => setIsGeneratingPdf(false), 2000);
    }
  };

  const handleDownloadBookPdf = async () => {
    const includedMembers = members.filter((m) => !m.excludeFromBook);
    const memberIds = includedMembers.map((m) => m.id);

    if (memberIds.length === 0) {
      alert('Nenhum mentorado selecionado para o Members Book. Ative ao menos um mentorado.');
      return;
    }

    setIsGeneratingPdf(true);
    setPdfProgressPercent(10);
    setPdfStatusMessage(`Iniciando geração do Members Book com ${memberIds.length} mentorados...`);
    setPdfPageCountInfo(`Total de Fichas: ${memberIds.length}`);

    const success = await generatePdfDirectlyInPage(undefined, (current, total, msg) => {
      const pct = Math.round((current / total) * 100);
      setPdfProgressPercent(pct);
      setPdfStatusMessage(msg);
      setPdfPageCountInfo(`Ficha ${current} de ${total}`);
    });

    if (success) {
      setPdfStatusMessage('Members Book compilado com sucesso!');
      setPdfProgressPercent(100);
      setTimeout(() => setIsGeneratingPdf(false), 1800);
    } else {
      setPdfStatusMessage('Processando documento...');
      setTimeout(() => setIsGeneratingPdf(false), 2000);
    }
  };

  const openWhatsApp = (phoneStr?: string, nameStr?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const cleanNumber = (phoneStr || '').replace(/\D/g, '');
    if (!cleanNumber) return;
    const text = encodeURIComponent(`Olá ${nameStr || 'Mentorado'}, tudo bem? Sou da equipe executiva do Rocket Club.`);
    window.open(`https://wa.me/55${cleanNumber}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl border text-xs font-extrabold flex items-center gap-2.5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top duration-200 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10'
              : toastMsg.type === 'warning'
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-amber-500/10'
              : 'bg-blue-500/20 border-blue-500/40 text-blue-300 shadow-blue-500/10'
          }`}
        >
          <CheckCircle2 size={17} />
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Executive Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Badge variant="default" className="text-[11px] font-extrabold px-3 py-1">
              <Users size={14} className="mr-1.5" /> Fichas dos Mentorados
            </Badge>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs font-semibold text-theme-primary">
              Edição Instantânea & Drag & Drop
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
            Base de <span className="theme-gradient-text">Mentorados & Membros</span>
          </h1>
          <p className={`text-xs sm:text-sm max-w-2xl mt-0.5 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
            Acompanhe o ciclo de evolução, acesse e edite as fichas completas diretamente ao clicar e organize no quadro drag & drop.
          </p>
        </div>

        {/* View Switcher & Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="p-1 rounded-xl bg-[#111728] border border-[#1F293D] flex items-center gap-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'kanban'
                  ? 'shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              style={
                viewMode === 'kanban'
                  ? {
                      backgroundColor: activePalette.tokens.primary,
                      color: isLightMode ? '#FFFFFF' : '#0B0F17',
                    }
                  : {}
              }
            >
              <KanbanIcon size={14} />
              <span>Quadro Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              style={
                viewMode === 'grid'
                  ? {
                      backgroundColor: activePalette.tokens.primary,
                      color: isLightMode ? '#FFFFFF' : '#0B0F17',
                    }
                  : {}
              }
            >
              <LayoutGrid size={14} />
              <span>Fichas em Grid</span>
            </button>
          </div>

          <button
            onClick={handleDownloadBookPdf}
            disabled={isGeneratingPdf}
            className="px-4 py-2.5 rounded-xl bg-[#111728] hover:bg-[#1E293B] text-slate-200 border border-[#1F293D] font-bold text-xs shadow-md transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            {isGeneratingPdf ? <Loader2 size={15} className="animate-spin text-theme-primary" /> : <FileText size={15} className="text-theme-primary" />}
            <span>Members Book (PDF)</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl font-extrabold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
            style={{
              backgroundColor: activePalette.tokens.primary,
              color: isLightMode ? '#FFFFFF' : '#0B0F17',
              boxShadow: `0 4px 15px ${activePalette.tokens.glow}`,
            }}
          >
            <Plus size={16} />
            <span>Novo Mentorado</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#111728]/80 border border-[#1F293D] backdrop-blur-md space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
            <span>Total da Base</span>
            <Users size={14} className="text-yellow-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-100">{kpis.total}</div>
          <span className="text-[10px] text-slate-500 block">Mentorados ativos</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#111728]/80 border border-[#1F293D] backdrop-blur-md space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
            <span>Onboarding</span>
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-400">{kpis.onboarding}</div>
          <span className="text-[10px] text-slate-500 block">Iniciando ciclo</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#111728]/80 border border-[#1F293D] backdrop-blur-md space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
            <span>Na Meta / Engajados</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">{kpis.activeEngaged}</div>
          <span className="text-[10px] text-slate-500 block">Tração máxima</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#111728]/80 border border-[#1F293D] backdrop-blur-md space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
            <span>Atenção & Risco</span>
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-red-400">
            {kpis.inRisk + kpis.attention}
          </div>
          <span className="text-[10px] text-slate-500 block">Exigem contato</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#111728]/80 border border-yellow-500/30 backdrop-blur-md space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-yellow-400 text-[11px] font-extrabold">
            <span>Faturamento Estimado</span>
            <DollarSign size={14} className="text-yellow-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-400 truncate">
            {kpis.formattedRev}
          </div>
          <span className="text-[10px] text-slate-500 block">Receita somada/mês</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3 rounded-2xl bg-[#111728]/70 border border-[#1F293D] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, especialidade, empresa, CNPJ ou WhatsApp..."
            className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl pl-10 pr-9 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Stage Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase mr-1 shrink-0 flex items-center gap-1">
            <Filter size={11} /> Filtrar:
          </span>
          <button
            onClick={() => setSelectedStageFilter('TODOS')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              selectedStageFilter === 'TODOS'
                ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/20'
                : 'bg-[#0B0F17] text-slate-400 border border-[#1F293D] hover:bg-[#1E293B]'
            }`}
          >
            Todos ({members.length})
          </button>
          {KANBAN_STAGES.map((s) => {
            const count = members.filter((m) => m.status === s.id).length;
            const isSelected = selectedStageFilter === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedStageFilter(s.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/20'
                    : 'bg-[#0B0F17] text-slate-400 border border-[#1F293D] hover:bg-[#1E293B]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${s.badge}`} />
                <span>{s.title.split('.')[1]?.trim() || s.title}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* In-Page PDF Progress Modal */}
      {isGeneratingPdf && (
        <Modal
          isOpen={isGeneratingPdf}
          onClose={() => {}}
          title="Compilador de PDF de Alta Resolução"
          subtitle={pdfStatusMessage}
          icon={<Loader2 size={20} className="animate-spin text-yellow-400" />}
          size="md"
        >
          <div className="space-y-3 py-2">
            <div className="w-full h-3 bg-[#0B0F17] rounded-full overflow-hidden border border-[#1F293D]">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 via-amber-400 to-emerald-400 transition-all duration-300 rounded-full shadow-sm shadow-yellow-500/50"
                style={{ width: `${pdfProgressPercent}%` }}
              />
            </div>
            {pdfPageCountInfo && (
              <span className="text-xs text-slate-400 block text-right font-mono">
                {pdfPageCountInfo}
              </span>
            )}
          </div>
        </Modal>
      )}

      {/* VIEW MODE 1: KANBAN DRAG & DROP */}
      {viewMode === 'kanban' && isMounted && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex xl:grid xl:grid-cols-5 gap-4 sm:gap-5 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-none xl:overflow-visible min-h-[600px]">
            {KANBAN_STAGES.map((stage) => {
              const stageMembers = filteredMembers.filter((m) => m.status === stage.id);
              const stageRevenue = stageMembers.reduce((acc, m) => {
                if (!m.monthlyRevenue) return acc;
                const clean = m.monthlyRevenue.replace(/[^\d]/g, '');
                const val = parseFloat(clean);
                return acc + (isNaN(val) ? 0 : val > 10000000 ? val / 100 : val);
              }, 0);

              const formattedStageRev = new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                maximumFractionDigits: 0,
              }).format(stageRevenue);

              return (
                <div
                  key={stage.id}
                  className="w-[85vw] sm:w-[320px] xl:w-auto shrink-0 snap-start flex flex-col rounded-2xl bg-[#101626]/90 border border-[#1F293D] p-3.5 sm:p-4 shadow-xl backdrop-blur-md"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1F293D]">
                    <div className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full ${stage.badge} shadow-sm`} />
                      <h3 className="text-xs font-black text-slate-100 tracking-tight">{stage.title}</h3>
                    </div>
                    <Badge variant="outline" className="bg-[#0B0F17] text-xs font-bold border-[#1F293D]">
                      {stageMembers.length}
                    </Badge>
                  </div>

                  {/* Stage Revenue Sub-badge */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3 px-1">
                    <span>Faturamento na etapa:</span>
                    <span className="font-bold text-emerald-400">{formattedStageRev}</span>
                  </div>

                  {/* Droppable Stage Column */}
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 space-y-3 min-h-[420px] rounded-xl transition-colors p-1 ${
                          snapshot.isDraggingOver
                            ? 'bg-yellow-500/10 border-2 border-dashed border-yellow-500/50'
                            : ''
                        }`}
                      >
                        {stageMembers.map((member, index) => (
                          <Draggable key={member.id} draggableId={member.id} index={index}>
                            {(dragProvided, dragSnapshot) => {
                              const cardContent = (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  style={{
                                    ...dragProvided.draggableProps.style,
                                    zIndex: dragSnapshot.isDragging ? 999999 : undefined,
                                  }}
                                  onClick={() => setSelectedMember(member)}
                                  className={`p-4 rounded-xl bg-[#0D1322] border transition-shadow cursor-pointer group space-y-3 shadow-lg select-none ${
                                    dragSnapshot.isDragging
                                      ? 'border-yellow-400 shadow-2xl shadow-yellow-500/40 ring-2 ring-yellow-400/90 !opacity-100'
                                      : member.excludeFromBook
                                      ? 'border-dashed border-slate-700 opacity-60'
                                      : 'border-[#1F293D] hover:border-yellow-500/50 hover:shadow-yellow-500/5'
                                  }`}
                                >
                                  {/* Drag Handle & Member Info */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                      <div
                                        {...dragProvided.dragHandleProps}
                                        className="text-slate-500 group-hover:text-yellow-400 cursor-grab active:cursor-grabbing p-1 -ml-1.5 transition-colors shrink-0"
                                        title="Arrastar card para outra etapa"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <GripVertical size={16} />
                                      </div>

                                      {member.coverImage || member.avatar ? (
                                        <img
                                          src={member.coverImage || member.avatar}
                                          alt={member.name}
                                          className="w-9 h-9 rounded-xl object-cover object-center border border-yellow-500/30 shrink-0"
                                        />
                                      ) : (
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-300 text-slate-950 font-extrabold text-xs flex items-center justify-center shrink-0">
                                          {(member.name || 'M').charAt(0).toUpperCase()}
                                        </div>
                                      )}

                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-xs font-extrabold text-slate-100 group-hover:text-yellow-400 transition-colors truncate">
                                          {member.name}
                                        </h4>
                                        <p className="text-[11px] text-slate-400 truncate">
                                          {member.specialty}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Quick Action Icons */}
                                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedMember(member)}
                                        className="p-1.5 rounded-lg text-slate-500 hover:text-yellow-400 hover:bg-[#1F293D] transition-colors"
                                        title="Abrir e Editar Ficha"
                                      >
                                        <Pencil size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => toggleExcludeFromBook(member.id, e)}
                                        className={`p-1.5 rounded-lg transition-colors ${
                                          member.excludeFromBook
                                            ? 'text-slate-600 hover:text-yellow-400'
                                            : 'text-yellow-400/80 hover:text-yellow-300'
                                        }`}
                                        title={member.excludeFromBook ? 'Incluir no PDF Book' : 'Excluir do PDF Book'}
                                      >
                                        {member.excludeFromBook ? <EyeOff size={13} /> : <Eye size={13} />}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Company & Revenue */}
                                  <div className="space-y-1.5 text-xs text-slate-400 pt-1 border-t border-[#1F293D]/60">
                                    <div className="flex items-center gap-1.5">
                                      <Building size={12} className="text-yellow-400 shrink-0" />
                                      <span className="truncate text-[11px] font-medium text-slate-300">
                                        {member.tradeName || member.companyName || 'Empresa Própria'}
                                      </span>
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                      <span className="font-extrabold text-emerald-400 text-xs">
                                        {member.monthlyRevenue || 'R$ —'}
                                      </span>

                                      <div className="flex items-center gap-1">
                                        {member.phone && (
                                          <button
                                            type="button"
                                            onClick={(e) => openWhatsApp(member.phone, member.name, e)}
                                            className="text-emerald-400 hover:text-emerald-300 p-1 hover:bg-emerald-500/10 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold"
                                            title="Chamar no WhatsApp"
                                          >
                                            <MessageCircle size={13} />
                                            <span className="hidden sm:inline">Whats</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );

                              if (dragSnapshot.isDragging && typeof window !== 'undefined') {
                                return ReactDOM.createPortal(cardContent, document.body);
                              }
                              return cardContent;
                            }}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {stageMembers.length === 0 && (
                          <div className="h-36 border-2 border-dashed border-[#1F293D] rounded-2xl flex flex-col items-center justify-center text-xs text-slate-600 p-4 text-center">
                            <span className="font-medium">Nenhum mentorado</span>
                            <span className="text-[10px] text-slate-700 mt-1">Arraste um card para cá</span>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* VIEW MODE 2: GRID DE FICHAS EXECUTIVAS */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredMembers.map((member) => {
            const stage = KANBAN_STAGES.find((s) => s.id === member.status) || KANBAN_STAGES[0];

            return (
              <div
                key={member.id}
                onClick={() => setSelectedMember(member)}
                className="rounded-2xl bg-[#111728]/90 border border-[#1F293D] hover:border-yellow-500/50 p-5 shadow-xl hover:shadow-yellow-500/5 transition-all cursor-pointer group flex flex-col justify-between space-y-4"
              >
                {/* Header Profile */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {member.coverImage || member.avatar ? (
                      <img
                        src={member.coverImage || member.avatar}
                        alt={member.name}
                        className="w-14 h-14 rounded-2xl object-cover object-center border-2 border-yellow-500/30 shadow-md shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-yellow-500 to-amber-300 text-slate-950 font-black text-xl flex items-center justify-center shadow-md shrink-0">
                        {(member.name || 'M').charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <h3 className="text-sm font-extrabold text-slate-100 group-hover:text-yellow-400 transition-colors">
                        {member.name}
                      </h3>
                      <p className="text-xs text-yellow-400/90 font-semibold">{member.specialty}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {member.tradeName || member.companyName}
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border-yellow-500/30 text-yellow-400 bg-yellow-500/10 shrink-0"
                  >
                    {stage.title.split('.')[1]?.trim() || member.status}
                  </Badge>
                </div>

                {/* Info Snippets */}
                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-[#1F293D]/60">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Faturamento</span>
                    <span className="font-extrabold text-emerald-400">{member.monthlyRevenue || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Último Contato</span>
                    <span className="text-slate-300 font-medium">{member.lastContact || 'Recente'}</span>
                  </div>
                </div>

                {member.mainGoal && (
                  <p className="text-xs text-slate-400 line-clamp-2 italic leading-relaxed">
                    "{member.mainGoal}"
                  </p>
                )}

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-[#1F293D]/60 text-xs">
                  <span className="text-yellow-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Abrir e Editar Ficha</span>
                    <ChevronRight size={14} />
                  </span>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {member.phone && (
                      <button
                        type="button"
                        onClick={(e) => openWhatsApp(member.phone, member.name, e)}
                        className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                        title="Chamar no WhatsApp"
                      >
                        <MessageCircle size={15} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDownloadSingleMemberPdf(member.id)}
                      className="p-2 rounded-xl bg-[#0B0F17] hover:bg-[#1E293B] text-slate-300 border border-[#1F293D] transition-colors"
                      title="Baixar PDF"
                    >
                      <FileText size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredMembers.length === 0 && (
            <div className="col-span-full h-48 border-2 border-dashed border-[#1F293D] rounded-2xl flex flex-col items-center justify-center text-xs text-slate-500 space-y-2">
              <Users size={24} className="text-slate-600" />
              <span>Nenhum mentorado encontrado com os filtros atuais.</span>
            </div>
          )}
        </div>
      )}

      {/* Complete Interactive Mentee Sheet (Instant Edit on Open) */}
      <MenteeSheet
        member={selectedMember}
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        onSave={handleSaveMember}
        onDelete={handlePromptDeleteMember}
        onDownloadPdf={handleDownloadSingleMemberPdf}
        onToggleBook={toggleExcludeFromBook}
      />

      {/* Add New Member Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Cadastrar Novo Mentorado na Base"
          subtitle="Adicione informações cadastrais para gerar a ficha e o acompanhamento"
          icon={<Sparkles size={20} />}
          size="lg"
        >
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nome Completo do Mentorado</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Dr. Gabriel Miranda"
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 font-bold focus:outline-none focus:border-yellow-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Especialidade / Nicho</label>
                  <input
                    type="text"
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    placeholder="Ex: Cirurgião Plástico"
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/50"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Empresa / Clínica</label>
                  <input
                    type="text"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="Ex: Miranda Clinic LTDA"
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">E-mail Corporativo</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="gabriel@mirandaclinic.com"
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/50"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(maskPhone(e.target.value))}
                    placeholder="(11) 98765-4321"
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Faturamento Mensal Estimado</label>
                  <input
                    type="text"
                    value={newRevenue}
                    onChange={(e) => setNewRevenue(e.target.value)}
                    placeholder="Ex: R$ 120.000,00"
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-emerald-400 font-bold focus:outline-none focus:border-yellow-500/50"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Etapa Inicial no Kanban</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as Member['status'])}
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/50"
                  >
                    {KANBAN_STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#1F293D]">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-[#0B0F17] text-slate-300 text-xs font-semibold hover:bg-[#1E293B] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-yellow-500/20 hover:scale-105 transition-all"
              >
                Salvar e Abrir Ficha
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Styled Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTargetMember}
        title="Excluir Mentorado da Base"
        itemName={deleteTargetMember?.name}
        description={`Tem certeza que deseja remover ${deleteTargetMember?.name ? `"${deleteTargetMember.name}"` : 'este mentorado'} da base do Rocket Club? Os dados e histórico serão excluídos do sistema.`}
        confirmText="Sim, Excluir Mentorado"
        cancelText="Cancelar"
        onConfirm={handleConfirmDeleteMember}
        onCancel={() => setDeleteTargetMember(null)}
        isDeleting={isDeletingMember}
      />
    </div>
  );
}
