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
  Target,
  Plus,
  Search,
  Filter,
  Users,
  Building,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  TrendingUp,
  Flame,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  X,
  UserCheck,
  ChevronRight,
  Clock,
  Briefcase,
  Layers,
  Check,
  GripVertical,
  MoveHorizontal,
  Pencil,
  Trash2,
  MessageCircle,
  Save,
  Send,
  History,
  Tag,
  Bot,
  Zap,
  Copy,
  Radio,
  LayoutGrid,
  List,
  ArrowUpRight,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lead, LEAD_STAGES, MOCK_LEADS, LeadLog } from '@/lib/mock-data';
import { useNotifications } from '@/lib/notification-context';
import { ConfirmDeleteModal } from '@/components/ui/confirm-delete-modal';
import { LeadSheet } from '@/components/lead-sheet';
import { maskPhone } from '@/lib/masks';

const WHATSAPP_TEMPLATES = [
  {
    id: 'diag',
    title: '1. Diagnóstico & Convite de Sessão',
    text: (name: string, company: string) =>
      `Olá ${name}! Aqui é da equipe executiva do Rocket Club. Analisamos o perfil da ${company} e identificamos um grande potencial de escala. Quando você tem 20 minutos para uma sessão de alinhamento com nosso Comandante? 🚀`,
  },
  {
    id: 'pitch',
    title: '2. Envio do Book Executivo',
    text: (name: string, company: string) =>
      `Olá ${name}! Segue o material executivo e a esteira de aceleração do Rocket Club preparada para a ${company}. Fique à vontade para conferir os cases de sucesso e o formato das imersões: https://rocketclub.com.br/apresentacao`,
  },
  {
    id: 'followup',
    title: '3. Follow-up de Proposta',
    text: (name: string, company: string) =>
      `Olá ${name}, tudo bem? Passando para saber se você conseguiu avaliar a proposta de mentoria para a ${company} e se deseja tirar alguma dúvida antes de fecharmos as vagas do lote atual.`,
  },
  {
    id: 'closing',
    title: '4. Boas-Vindas & Onboarding',
    text: (name: string, company: string) =>
      `Parabéns ${name}! 🎉 É uma honra ter a ${company} na tripulação Rocket Club! Seu acesso à plataforma e à Academy foi liberado. Vamos dar início ao seu onboarding. 🚀✨`,
  },
];

export default function CrmPage() {
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('TODOS');
  const [selectedPriority, setSelectedPriority] = useState<string>('TODAS');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('TODOS');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  // Sheet / Modal states
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [deleteTargetLead, setDeleteTargetLead] = useState<Lead | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppLead, setWhatsAppLead] = useState<Lead | null>(null);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [customWhatsAppMsg, setCustomWhatsAppMsg] = useState('');
  const [isAgentActive, setIsAgentActive] = useState(true);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // New Lead Form State
  const [newName, setNewName] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEstimatedValue, setNewEstimatedValue] = useState('25000');
  const [newSource, setNewSource] = useState<Lead['source']>('Instagram');
  const [newPriority, setNewPriority] = useState<Lead['priority']>('alta');
  const [newNotes, setNewNotes] = useState('');

  const { addNotification } = useNotifications();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // URL query parameter deep linking (?leadId=lead-1)
  useEffect(() => {
    if (typeof window !== 'undefined' && leads.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const leadId = params.get('leadId');
      if (leadId && !selectedLead) {
        const found = leads.find((l) => l.id === leadId);
        if (found) setSelectedLead(found);
      }
    }
  }, [leads, selectedLead]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q) ||
        l.specialty.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (l.cityState && l.cityState.toLowerCase().includes(q));

      const matchesSource = selectedSource === 'TODOS' || l.source === selectedSource;
      const matchesPriority = selectedPriority === 'TODAS' || l.priority === selectedPriority;
      const matchesStage = selectedStageFilter === 'TODOS' || l.stage === selectedStageFilter;

      return matchesSearch && matchesSource && matchesPriority && matchesStage;
    });
  }, [leads, searchQuery, selectedSource, selectedPriority, selectedStageFilter]);

  // Pipeline Executive Metrics
  const metrics = useMemo(() => {
    const total = leads.length;
    const activeLeads = leads.filter((l) => l.stage !== 'perdido');
    const totalPipelineValue = activeLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);
    const hotCount = leads.filter((l) => l.priority === 'alta' && l.stage !== 'perdido' && l.stage !== 'ganho').length;
    const wonCount = leads.filter((l) => l.stage === 'ganho').length;
    const conversionRate = total > 0 ? Math.round((wonCount / total) * 100) : 0;
    const avgTicket = activeLeads.length > 0 ? Math.round(totalPipelineValue / activeLeads.length) : 0;

    return {
      total,
      totalPipelineValue,
      hotCount,
      wonCount,
      conversionRate,
      avgTicket,
    };
  }, [leads]);

  // Drag and Drop Handler
  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const destStage = destination.droppableId as Lead['stage'];
    const draggedLead = leads.find((l) => l.id === draggableId);
    if (!draggedLead) return;

    const stageInfo = LEAD_STAGES.find((s) => s.id === destStage);

    // Auto-create log for timeline
    const stageLog: LeadLog = {
      id: `log-${Date.now()}`,
      type: 'note',
      title: `Oportunidade movida para "${stageInfo?.title || destStage}"`,
      description: `Lead movimentado no funil de vendas.`,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      author: 'Comandante Master',
    };

    const updatedLeads = leads.map((l) => {
      if (l.id === draggableId) {
        return {
          ...l,
          stage: destStage,
          lastContact: new Date().toISOString().split('T')[0],
          timelineLogs: [stageLog, ...(l.timelineLogs || [])],
        };
      }
      return l;
    });

    setLeads(updatedLeads);

    if (selectedLead && selectedLead.id === draggableId) {
      setSelectedLead({
        ...selectedLead,
        stage: destStage,
        lastContact: new Date().toISOString().split('T')[0],
        timelineLogs: [stageLog, ...(selectedLead.timelineLogs || [])],
      });
    }

    showToast(`Lead "${draggedLead.name}" movido para "${stageInfo?.title || destStage}"`);
  };

  const handleSaveLead = (updatedLead: Lead) => {
    setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
    setSelectedLead(updatedLead);
    showToast(`Ficha do lead "${updatedLead.name}" atualizada com sucesso!`);
  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newLeadItem: Lead = {
      id: `lead-${Date.now()}`,
      name: newName.trim(),
      company: newCompany.trim() || 'Empresa Própria',
      specialty: newSpecialty.trim() || 'Empresário / Negócios',
      email: newEmail.trim() || 'contato@prospect.com.br',
      phone: newPhone.trim() || '(11) 99999-0000',
      estimatedValue: parseFloat(newEstimatedValue) || 25000,
      source: newSource,
      priority: newPriority,
      stage: 'novo',
      notes: newNotes.trim() || 'Novo lead cadastrado no funil comercial do Rocket Club.',
      lastContact: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString().split('T')[0],
      assignedTo: 'Comandante Master',
      timelineLogs: [
        {
          id: `log-${Date.now()}`,
          type: 'note',
          title: 'Lead Cadastrado no Funil de Vendas',
          description: `Lead inserido com valor estimado de R$ ${(parseFloat(newEstimatedValue) || 25000).toLocaleString('pt-BR')}.`,
          createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          author: 'Comandante Master',
        },
      ],
    };

    setLeads([newLeadItem, ...leads]);
    setIsAddModalOpen(false);
    setSelectedLead(newLeadItem); // Immediately open rich sheet
    showToast('Novo lead cadastrado! Ficha executiva aberta para qualificação.');

    // Reset form
    setNewName('');
    setNewCompany('');
    setNewSpecialty('');
    setNewEmail('');
    setNewPhone('');
    setNewEstimatedValue('25000');
    setNewNotes('');
  };

  const handleDeleteLead = (lead: Lead) => {
    setDeleteTargetLead(lead);
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetLead) return;
    setLeads((prev) => prev.filter((l) => l.id !== deleteTargetLead.id));
    if (selectedLead?.id === deleteTargetLead.id) {
      setSelectedLead(null);
    }
    setDeleteTargetLead(null);
    showToast('Lead removido do pipeline comercial.');
  };

  const handleConvertToMember = async (lead: Lead) => {
    try {
      // 1. Send POST to /api/members to insert into database
      const memberPayload = {
        name: lead.name,
        companyName: lead.company,
        specialty: lead.specialty,
        email: lead.email,
        phone: lead.phone,
        monthlyRevenue: lead.currentRevenue || `R$ ${lead.estimatedValue.toLocaleString('pt-BR')}`,
        mainGoal: lead.targetGoal || 'Aceleração de escala e estruturação de time',
        biggestChallenge: lead.mainBottleneck || 'Escala de vendas e processos comerciais',
        status: 'azul', // starts in onboarding
        notes: `Convertido a partir do Lead CRM (${lead.source}). ${lead.notes}`,
      };

      await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberPayload),
      });

      // 2. Mark lead as 'ganho'
      const updatedLeads = leads.map((l) => (l.id === lead.id ? { ...l, stage: 'ganho' as const } : l));
      setLeads(updatedLeads);
      if (selectedLead && selectedLead.id === lead.id) {
        setSelectedLead({ ...selectedLead, stage: 'ganho' });
      }

      addNotification({
        sector: 'crm',
        type: 'success',
        title: `Novo Mentorado Convertido: ${lead.name}`,
        message: `${lead.name} (${lead.company}) agora faz parte da base ativa de mentorados Rocket Club! 🚀`,
        link: '/mentorados',
        actionText: 'Ver Ficha do Mentorado',
      });

      showToast(`🎉 "${lead.name}" convertido em Mentorado Oficial da base!`);
    } catch (err) {
      console.error('Erro ao converter lead em mentorado:', err);
      showToast('Erro ao sincronizar conversão com a base.', 'warning');
    }
  };

  const openQuickWhatsAppModal = (lead: Lead, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWhatsAppLead(lead);
    setSelectedTemplateIndex(0);
    setCustomWhatsAppMsg(WHATSAPP_TEMPLATES[0].text(lead.name, lead.company));
    setIsWhatsAppModalOpen(true);
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
              <Target size={14} className="mr-1.5" /> Pipeline Comercial & Novos Leads
            </Badge>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs font-semibold text-emerald-400">
              Disparador WhatsApp IA Integrado
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
            Funil de <span className="gold-gradient-text">Captação & Vendas High-Ticket</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-0.5">
            Gerencie novos prospects, qualifique diagnósticos BANT, envie mensagens via WhatsApp com 1 clique e converta oportunidades em mentorados.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* View Switcher: Kanban vs Table */}
          <div className="p-1 rounded-xl bg-[#111728] border border-[#1F293D] flex items-center gap-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'kanban'
                  ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid size={14} />
              <span>Quadro</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List size={14} />
              <span>Lista / Tabela</span>
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs shadow-lg shadow-yellow-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus size={16} />
            <span>Novo Lead</span>
          </button>
        </div>
      </div>

      {/* Pipeline Analytics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#111728]/80 border border-[#1F293D] backdrop-blur-md space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
            <span>Leads no Pipeline</span>
            <Users size={14} className="text-yellow-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-100">{metrics.total}</div>
          <span className="text-[10px] text-slate-500 block">Oportunidades em aberto</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#111728]/80 border border-emerald-500/30 backdrop-blur-md space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
            <span>Valor em Negociação</span>
            <DollarSign size={14} className="text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-400 truncate">
            R$ {metrics.totalPipelineValue.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-slate-500 block">Pipeline potencial ativo</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#111728]/80 border border-red-500/30 backdrop-blur-md space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
            <span>Leads Quentes</span>
            <Flame size={14} className="text-red-400 animate-pulse" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-red-400">{metrics.hotCount}</div>
          <span className="text-[10px] text-slate-500 block">Prioridade Alta</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#111728]/80 border border-[#1F293D] backdrop-blur-md space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
            <span>Taxa de Conversão</span>
            <TrendingUp size={14} className="text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400">{metrics.conversionRate}%</div>
          <span className="text-[10px] text-slate-500 block">{metrics.wonCount} convertidos</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#111728]/80 border border-yellow-500/30 backdrop-blur-md space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-yellow-400 text-[11px] font-extrabold">
            <span>Ticket Médio</span>
            <Sparkles size={14} className="text-yellow-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-100 truncate">
            R$ {metrics.avgTicket.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-slate-500 block">Por oportunidade</span>
        </div>
      </div>

      {/* WhatsApp AI Agent Status Bar */}
      <Card className="p-4 sm:p-5 bg-gradient-to-r from-emerald-950/40 via-[#111728] to-[#111728] border-emerald-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xl shrink-0 shadow-inner">
            <Bot size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold text-slate-100">
                Agente IA WhatsApp (Atendimento & Qualificação de Leads)
              </h3>
              <Badge
                variant="outline"
                className={`text-[10px] uppercase font-bold py-0.5 px-2 ${
                  isAgentActive
                    ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                    : 'border-slate-600 text-slate-400 bg-slate-800/40'
                }`}
              >
                {isAgentActive ? '🟢 Webhook Online & Integrado' : '⚪ Agente Pausado'}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Envie mensagens e diagnósticos estruturados em 1 clique utilizando templates de alta conversão para follow-ups.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
          <button
            type="button"
            onClick={() => setIsAgentActive(!isAgentActive)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              isAgentActive
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio size={14} className={isAgentActive ? 'text-emerald-400 animate-pulse' : ''} />
            <span>{isAgentActive ? 'Automação Ativa' : 'Pausada'}</span>
          </button>
        </div>
      </Card>

      {/* Filter & Search Bar */}
      <div className="p-3 rounded-2xl bg-[#111728]/80 border border-[#1F293D] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, empresa, especialidade, cidade ou WhatsApp..."
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

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 text-xs">
          <div className="flex items-center gap-1 bg-[#0B0F17] border border-[#1F293D] rounded-xl px-2.5 py-1 shrink-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Origem:</span>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value="TODOS" className="bg-[#111728]">Todas as Origens</option>
              <option value="Instagram" className="bg-[#111728]">Instagram</option>
              <option value="Indicação" className="bg-[#111728]">Indicação</option>
              <option value="Tráfego Pago" className="bg-[#111728]">Tráfego Pago</option>
              <option value="Evento Presencial" className="bg-[#111728]">Evento Presencial</option>
              <option value="WhatsApp Direct" className="bg-[#111728]">WhatsApp Direct</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-[#0B0F17] border border-[#1F293D] rounded-xl px-2.5 py-1 shrink-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Prioridade:</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value="TODAS" className="bg-[#111728]">Todas</option>
              <option value="alta" className="bg-[#111728]">🔥 Alta</option>
              <option value="media" className="bg-[#111728]">⚡ Média</option>
              <option value="baixa" className="bg-[#111728]">⏳ Baixa</option>
            </select>
          </div>
        </div>
      </div>

      {/* VIEW 1: KANBAN BOARD WITH DRAG AND DROP */}
      {viewMode === 'kanban' && isMounted && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex xl:grid xl:grid-cols-5 gap-4 sm:gap-5 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-none xl:overflow-visible min-h-[620px]">
            {LEAD_STAGES.map((stage) => {
              const stageLeads = filteredLeads.filter((l) => l.stage === stage.id);
              const stageValue = stageLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);

              return (
                <div
                  key={stage.id}
                  className="w-[85vw] sm:w-[320px] xl:w-auto shrink-0 snap-start flex flex-col rounded-2xl bg-[#101626]/95 border border-[#1F293D] p-3.5 sm:p-4 shadow-xl backdrop-blur-md"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1F293D]">
                    <div className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full ${stage.badge} shadow-sm`} />
                      <h3 className="text-xs font-black text-slate-100 tracking-tight">{stage.title}</h3>
                    </div>
                    <Badge variant="outline" className="bg-[#0B0F17] text-xs font-bold border-[#1F293D]">
                      {stageLeads.length}
                    </Badge>
                  </div>

                  {/* Stage Revenue Sub-badge */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3 px-1">
                    <span>Volume na etapa:</span>
                    <span className="font-bold text-emerald-400">
                      R$ {stageValue.toLocaleString('pt-BR')}
                    </span>
                  </div>

                  {/* Droppable Stage Column */}
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 space-y-3 min-h-[440px] rounded-xl transition-colors p-1 ${
                          snapshot.isDraggingOver
                            ? 'bg-yellow-500/10 border-2 border-dashed border-yellow-500/50'
                            : ''
                        }`}
                      >
                        {stageLeads.map((lead, index) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(dragProvided, dragSnapshot) => {
                              const cardContent = (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  style={{
                                    ...dragProvided.draggableProps.style,
                                    zIndex: dragSnapshot.isDragging ? 999999 : undefined,
                                  }}
                                  onClick={() => setSelectedLead(lead)}
                                  className={`p-4 rounded-xl bg-[#0D1322] border transition-all cursor-pointer group space-y-3 shadow-lg select-none ${
                                    dragSnapshot.isDragging
                                      ? 'border-yellow-400 shadow-2xl shadow-yellow-500/40 ring-2 ring-yellow-400/90 !opacity-100'
                                      : 'border-[#1F293D] hover:border-yellow-500/50 hover:shadow-yellow-500/5'
                                  }`}
                                >
                                  {/* Top Row: Drag Handle, Priority & Origin */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <div
                                        {...dragProvided.dragHandleProps}
                                        className="text-slate-500 group-hover:text-yellow-400 cursor-grab active:cursor-grabbing p-1 -ml-1 transition-colors shrink-0"
                                        title="Arrastar lead para outra etapa"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <GripVertical size={15} />
                                      </div>

                                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-300 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow">
                                        {lead.name.charAt(0)}
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-xs font-extrabold text-slate-100 group-hover:text-yellow-400 transition-colors truncate">
                                          {lead.name}
                                        </h4>
                                        <p className="text-[11px] text-slate-400 truncate">
                                          {lead.company}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Action Icons */}
                                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedLead(lead)}
                                        className="p-1.5 rounded-lg text-slate-500 hover:text-yellow-400 hover:bg-[#1F293D] transition-colors"
                                        title="Abrir Ficha Completa do Lead"
                                      >
                                        <Pencil size={13} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Specialty & Notes snippet */}
                                  <div className="text-[11px] text-slate-400 space-y-1">
                                    <div className="flex items-center gap-1.5 text-slate-300 font-semibold truncate">
                                      <Briefcase size={12} className="text-yellow-400 shrink-0" />
                                      <span className="truncate">{lead.specialty}</span>
                                    </div>
                                    {lead.notes && (
                                      <p className="text-[10px] text-slate-500 line-clamp-2 bg-[#0B0F17]/60 p-2 rounded-lg border border-[#1F293D]/60 leading-relaxed">
                                        {lead.notes}
                                      </p>
                                    )}
                                  </div>

                                  {/* Value & WhatsApp Action */}
                                  <div className="flex items-center justify-between pt-2 border-t border-[#1F293D]/60 text-xs">
                                    <span className="font-extrabold text-emerald-400">
                                      R$ {lead.estimatedValue.toLocaleString('pt-BR')}
                                    </span>

                                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                      {lead.phone && (
                                        <button
                                          type="button"
                                          onClick={(e) => openQuickWhatsAppModal(lead, e)}
                                          className="text-emerald-400 hover:text-emerald-300 px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold"
                                          title="Disparar mensagem inteligente via WhatsApp"
                                        >
                                          <MessageCircle size={13} />
                                          <span>Whats</span>
                                        </button>
                                      )}
                                      <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                                        <Clock size={10} /> {new Date(lead.lastContact).toLocaleDateString('pt-BR')}
                                      </span>
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

                        {stageLeads.length === 0 && (
                          <div className="h-36 border-2 border-dashed border-[#1F293D] rounded-2xl flex flex-col items-center justify-center text-xs text-slate-600 p-4 text-center">
                            <span className="font-medium">Nenhum lead nesta etapa</span>
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

      {/* VIEW 2: EXECUTIVE TABLE / GRID VIEW */}
      {viewMode === 'table' && (
        <Card className="overflow-hidden border-[#1F293D] bg-[#101626]/95 backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0B0F17] text-slate-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-[#1F293D]">
                <tr>
                  <th className="py-3.5 px-4">Lead / Empresa</th>
                  <th className="py-3.5 px-4">Especialidade / Nicho</th>
                  <th className="py-3.5 px-4">Etapa no Funil</th>
                  <th className="py-3.5 px-4">Valor Proposta</th>
                  <th className="py-3.5 px-4">Origem</th>
                  <th className="py-3.5 px-4">Último Contato</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F293D]/60">
                {filteredLeads.map((lead) => {
                  const stage = LEAD_STAGES.find((s) => s.id === lead.stage);
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="hover:bg-[#131A2B] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-300 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                            {lead.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-100 group-hover:text-yellow-400 transition-colors block">
                              {lead.name}
                            </span>
                            <span className="text-[11px] text-slate-500">{lead.company}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-semibold">{lead.specialty}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant="outline" className="text-[10px] font-bold py-0.5 px-2 bg-[#0B0F17] border-[#1F293D]">
                          <span className={`w-2 h-2 rounded-full ${stage?.badge || 'bg-slate-500'} mr-1.5`} />
                          <span>{stage?.title.split('.')[1]?.trim() || lead.stage}</span>
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-black text-emerald-400">
                        R$ {lead.estimatedValue.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-semibold text-slate-400 bg-[#0B0F17] px-2 py-0.5 rounded-lg border border-[#1F293D]">
                          {lead.source}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-500 font-mono">
                        {new Date(lead.lastContact).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {lead.phone && (
                            <button
                              type="button"
                              onClick={(e) => openQuickWhatsAppModal(lead, e)}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                              title="Chamar no WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedLead(lead)}
                            className="px-3 py-1.5 rounded-lg bg-[#0B0F17] hover:bg-yellow-500 hover:text-slate-950 text-slate-300 text-xs font-bold border border-[#1F293D] transition-all flex items-center gap-1"
                          >
                            <span>Ficha</span>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* LEAD EXECUTIVE SHEET / SLIDE-OVER */}
      <LeadSheet
        lead={selectedLead}
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onSave={handleSaveLead}
        onDelete={handleDeleteLead}
        onConvertToMember={handleConvertToMember}
      />

      {/* Quick WhatsApp Smart Dispatcher Modal */}
      {isWhatsAppModalOpen && whatsAppLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-xl bg-[#111728] border-emerald-500/40 p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-[#1F293D]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shrink-0">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-sm flex items-center gap-2">
                    <span>Disparador Inteligente WhatsApp</span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-[10px]">
                      Lead CRM
                    </Badge>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Lead: <strong className="text-slate-200">{whatsAppLead.name}</strong> • {whatsAppLead.company} ({whatsAppLead.phone})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Template Selector Pills */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Escolha o Modelo de Mensagem / Momento da Negociação:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {WHATSAPP_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplateIndex(idx);
                      setCustomWhatsAppMsg(tmpl.text(whatsAppLead.name, whatsAppLead.company));
                    }}
                    className={`p-2.5 rounded-xl text-left text-xs font-semibold border transition-all ${
                      selectedTemplateIndex === idx
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md ring-1 ring-emerald-500'
                        : 'bg-[#0B0F17] text-slate-400 border-[#1F293D] hover:bg-[#1E293B] hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <Zap size={13} className={selectedTemplateIndex === idx ? 'text-emerald-400' : 'text-slate-500'} />
                      <span>{tmpl.title}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Editable Message Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Mensagem Personalizada:
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">
                  Pronto para envio com dados reais
                </span>
              </div>
              <textarea
                rows={5}
                value={customWhatsAppMsg}
                onChange={(e) => setCustomWhatsAppMsg(e.target.value)}
                className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl p-3.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 leading-relaxed resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#1F293D]">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(customWhatsAppMsg);
                  showToast('Mensagem copiada para a área de transferência!');
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0B0F17] hover:bg-[#1E293B] text-slate-300 text-xs font-bold border border-[#1F293D] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Copy size={14} />
                <span>Copiar Mensagem</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsWhatsAppModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#0B0F17] text-slate-400 hover:text-slate-200 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cleanPhone = (whatsAppLead.phone || '').replace(/\D/g, '');
                    const encoded = encodeURIComponent(customWhatsAppMsg);
                    window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, '_blank');
                    setIsWhatsAppModalOpen(false);

                    // Add log in timeline
                    const autoLog: LeadLog = {
                      id: `log-${Date.now()}`,
                      type: 'whatsapp',
                      title: `Disparo WhatsApp (${WHATSAPP_TEMPLATES[selectedTemplateIndex]?.title})`,
                      description: customWhatsAppMsg,
                      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
                      author: 'Agente IA WhatsApp',
                    };

                    const updatedLeads = leads.map((l) =>
                      l.id === whatsAppLead.id
                        ? {
                            ...l,
                            lastContact: new Date().toISOString().split('T')[0],
                            timelineLogs: [autoLog, ...(l.timelineLogs || [])],
                          }
                        : l
                    );
                    setLeads(updatedLeads);
                    showToast('WhatsApp disparado e registrado no histórico!');
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Send size={15} />
                  <span>Enviar no WhatsApp</span>
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Add New Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-lg bg-[#111728] border-yellow-500/30 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F293D]">
                <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                  <Sparkles size={18} className="text-yellow-400" />
                  <span>Cadastrar Nova Oportunidade no Funil</span>
                </h3>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-extrabold mb-1">Nome Completo do Prospect</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Dr. Leonardo Martins"
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 font-bold focus:outline-none focus:border-yellow-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Empresa / Negócio</label>
                    <input
                      type="text"
                      value={newCompany}
                      onChange={(e) => setNewCompany(e.target.value)}
                      placeholder="Ex: Martins Group"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Especialidade / Nicho</label>
                    <input
                      type="text"
                      value={newSpecialty}
                      onChange={(e) => setNewSpecialty(e.target.value)}
                      placeholder="Ex: E-commerce High-Ticket"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">WhatsApp / Telefone</label>
                    <input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(maskPhone(e.target.value))}
                      placeholder="(11) 98888-7777"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Valor Proposta (R$)</label>
                    <input
                      type="number"
                      value={newEstimatedValue}
                      onChange={(e) => setNewEstimatedValue(e.target.value)}
                      placeholder="25000"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2 text-emerald-400 font-black focus:outline-none focus:border-yellow-500/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Origem do Lead</label>
                    <select
                      value={newSource}
                      onChange={(e) => setNewSource(e.target.value as Lead['source'])}
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2 text-slate-100 font-semibold focus:outline-none focus:border-yellow-500/40"
                    >
                      <option value="Instagram">Instagram</option>
                      <option value="Indicação">Indicação</option>
                      <option value="Tráfego Pago">Tráfego Pago</option>
                      <option value="Evento Presencial">Evento Presencial</option>
                      <option value="WhatsApp Direct">WhatsApp Direct</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Prioridade</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as Lead['priority'])}
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2 text-slate-100 font-semibold focus:outline-none focus:border-yellow-500/40"
                    >
                      <option value="alta">🔥 Alta</option>
                      <option value="media">⚡ Média</option>
                      <option value="baixa">⏳ Baixa</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Anotações Iniciais do Diagnóstico</label>
                  <textarea
                    rows={2}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Desafios relatados, faturamento aproximado e objetivo..."
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40 resize-none"
                  />
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
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 text-slate-950 font-black text-xs shadow-md shadow-yellow-500/20 hover:scale-105 transition-all"
                >
                  Criar e Abrir Ficha 🚀
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTargetLead}
        title="Excluir Oportunidade do Funil"
        itemName={deleteTargetLead?.name}
        description={`Tem certeza que deseja remover permanentemente o lead "${deleteTargetLead?.name}" do funil comercial?`}
        confirmText="Sim, Excluir Lead"
        cancelText="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetLead(null)}
      />
    </div>
  );
}
