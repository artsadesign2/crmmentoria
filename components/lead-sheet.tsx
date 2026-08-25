'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Save,
  Building,
  Phone,
  Mail,
  Instagram,
  Linkedin,
  Globe,
  MapPin,
  Heart,
  Briefcase,
  Target,
  Flame,
  AlertTriangle,
  FileText,
  Trash2,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  Clock,
  User,
  Shield,
  Eye,
  Calendar,
  DollarSign,
  UserCheck,
  Send,
  Plus,
  History,
  Zap,
  Copy,
  Tag,
  ChevronRight,
  TrendingUp,
  Award,
  Users,
  Check,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { Lead, LEAD_STAGES, LeadLog } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { maskPhone } from '@/lib/masks';

interface LeadSheetProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedLead: Lead) => Promise<void> | void;
  onDelete: (lead: Lead) => void;
  onConvertToMember: (lead: Lead) => void;
}

const WHATSAPP_TEMPLATES = [
  {
    id: 'diag',
    title: '1. Diagnóstico & Sessão Estratégica',
    text: (name: string, company: string) =>
      `Olá ${name}! Aqui é da equipe executiva do Rocket Club. Analisamos o perfil da ${company} e identificamos grande potencial de escala. Quando você tem 20 minutos para uma sessão de alinhamento com nosso Comandante? 🚀`,
  },
  {
    id: 'pitch',
    title: '2. Envio do Book Executivo',
    text: (name: string, company: string) =>
      `Olá ${name}! Segue o material executivo e a esteira de aceleração do Rocket Club preparada para a ${company}. Confira os cases de sucesso e as imersões: https://rocketclub.com.br/apresentacao`,
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
      `Parabéns ${name}! 🎉 É uma honra ter a ${company} na tripulação Rocket Club! Seu acesso à plataforma e à Academy foi liberado. Vamos iniciar seu onboarding agora mesmo. 🚀✨`,
  },
];

export function LeadSheet({
  lead,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onConvertToMember,
}: LeadSheetProps) {
  const [formData, setFormData] = useState<Partial<Lead>>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'diagnostic' | 'timeline' | 'whatsapp'>('overview');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Animation States for Smooth Enter & Exit
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // New Timeline Log Form State
  const [logType, setLogType] = useState<LeadLog['type']>('whatsapp');
  const [logTitle, setLogTitle] = useState('');
  const [logDescription, setLogDescription] = useState('');
  const [isAddingLog, setIsAddingLog] = useState(false);

  // WhatsApp Dispatcher State inside Sheet
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [customWhatsAppMsg, setCustomWhatsAppMsg] = useState('');
  const [copiedMsg, setCopiedMsg] = useState(false);

  // Mount and Entrance Animation
  useEffect(() => {
    let animTimer: NodeJS.Timeout;
    if (isOpen && lead) {
      setIsMounted(true);
      setFormData({ ...lead });
      setIsDirty(false);
      setSaveSuccess(false);
      setCustomWhatsAppMsg(WHATSAPP_TEMPLATES[0].text(lead.name, lead.company));
      animTimer = setTimeout(() => {
        setIsVisible(true);
      }, 20);
    } else {
      setIsVisible(false);
      animTimer = setTimeout(() => {
        setIsMounted(false);
      }, 300);
    }
    return () => clearTimeout(animTimer);
  }, [isOpen, lead]);

  // Smooth Exit Animation Handler
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsMounted(false);
      onClose();
    }, 280);
  };

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMounted && isVisible) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMounted, isVisible]);

  if (!isMounted || !lead) return null;

  const updateField = (field: keyof Lead, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setSaveSuccess(false);
  };

  const handleFormSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const merged = { ...lead, ...formData } as Lead;
      await onSave(merged);
      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar lead:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logDescription.trim()) return;

    const newLog: LeadLog = {
      id: `log-${Date.now()}`,
      type: logType,
      title: logTitle.trim() || getDefaultLogTitle(logType),
      description: logDescription.trim(),
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      author: 'Comandante Master',
    };

    const updatedLogs = [newLog, ...(formData.timelineLogs || lead.timelineLogs || [])];
    updateField('timelineLogs', updatedLogs);
    updateField('lastContact', new Date().toISOString().split('T')[0]);

    setLogTitle('');
    setLogDescription('');
    setIsAddingLog(false);
  };

  const getDefaultLogTitle = (type: LeadLog['type']) => {
    switch (type) {
      case 'call': return 'Ligação Realizada';
      case 'whatsapp': return 'Mensagem WhatsApp Enviada';
      case 'meeting': return 'Reunião de Alinhamento / Fechamento';
      case 'email': return 'E-mail Comercial Enviado';
      default: return 'Nota Interna Registrada';
    }
  };

  const getLogTypeBadge = (type: LeadLog['type']) => {
    switch (type) {
      case 'call':
        return { label: 'Ligação', icon: Phone, bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      case 'whatsapp':
        return { label: 'WhatsApp', icon: MessageCircle, bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'meeting':
        return { label: 'Reunião / Call', icon: Calendar, bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      case 'email':
        return { label: 'E-mail', icon: Mail, bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      default:
        return { label: 'Anotação', icon: FileText, bg: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
    }
  };

  const openWhatsApp = (phoneStr?: string, nameStr?: string) => {
    const cleanNumber = (phoneStr || '').replace(/\D/g, '');
    if (!cleanNumber) return;
    const text = encodeURIComponent(customWhatsAppMsg || `Olá ${nameStr || 'Lead'}, tudo bem? Sou da equipe executiva do Rocket Club.`);
    window.open(`https://wa.me/55${cleanNumber}?text=${text}`, '_blank');
  };

  const currentStage = LEAD_STAGES.find((s) => s.id === formData.stage) || LEAD_STAGES[0];

  const sheetNode = (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-[9999] overflow-hidden bg-black/80 backdrop-blur-md flex justify-end transition-opacity duration-300 ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        className={`w-full max-w-4xl bg-[#0D121F] border-l border-[#1F293D] shadow-2xl flex flex-col h-full max-h-screen text-slate-100 transform transition-transform duration-300 ease-out ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        } relative`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Luxury Header */}
        <div className="p-3.5 sm:p-6 border-b border-[#1F293D] bg-[#111728]/95 backdrop-blur-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-yellow-500 to-amber-300 text-slate-950 font-black text-xl sm:text-2xl flex items-center justify-center shadow-lg shadow-yellow-500/20 shrink-0">
              {(formData.name || 'L').charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Nome do Lead / Prospect"
                  className="text-base sm:text-xl font-extrabold text-slate-100 bg-transparent border-b border-transparent hover:border-[#1F293D] focus:border-yellow-500 focus:outline-none transition-colors w-full truncate"
                />
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap text-xs">
                <input
                  type="text"
                  value={formData.company || ''}
                  onChange={(e) => updateField('company', e.target.value)}
                  placeholder="Empresa / Negócio"
                  className="text-xs text-yellow-400 font-semibold bg-transparent border-b border-transparent hover:border-[#1F293D] focus:border-yellow-500 focus:outline-none transition-colors max-w-[140px] sm:max-w-[180px] truncate"
                />
                <span className="text-slate-600 text-xs">•</span>
                <input
                  type="text"
                  value={formData.specialty || ''}
                  onChange={(e) => updateField('specialty', e.target.value)}
                  placeholder="Nicho / Especialidade"
                  className="text-xs text-slate-400 bg-transparent border-b border-transparent hover:border-[#1F293D] focus:border-yellow-500 focus:outline-none transition-colors max-w-[140px] sm:max-w-[180px] truncate"
                />
                <span className="text-slate-600 text-xs">•</span>
                <span className="text-xs text-emerald-400 font-black">
                  R$ {(formData.estimatedValue || 0).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-end shrink-0">
            {isDirty && (
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 animate-pulse mr-1">
                ● Não salvo
              </span>
            )}
            {saveSuccess && (
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-400 flex items-center gap-1 mr-1">
                <CheckCircle2 size={13} /> Salvo!
              </span>
            )}

            {formData.phone && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('whatsapp');
                }}
                className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                title="Abrir WhatsApp IA"
              >
                <MessageCircle size={15} />
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="p-2 sm:p-2.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-[#1F293D] transition-colors"
              title="Fechar (Esc)"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Funnel Stage Selector Bar (Responsive Grid, No Scroll) */}
        <div className="bg-[#0B0F17]/60 px-3 sm:px-6 py-2 sm:py-2.5 border-b border-[#1F293D]">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 w-full">
            {LEAD_STAGES.map((s) => {
              const isCurrent = formData.stage === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => updateField('stage', s.id)}
                  className={`py-1.5 px-2 rounded-xl text-[10px] sm:text-[11px] font-extrabold transition-all flex items-center justify-center gap-1.5 border text-center ${
                    isCurrent
                      ? 'bg-yellow-500 text-slate-950 border-yellow-400 shadow-md shadow-yellow-500/20 font-black'
                      : 'bg-[#111728] text-slate-400 hover:bg-[#1A2234] hover:text-slate-200 border-[#1F293D]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${s.badge}`} />
                  <span className="truncate">{s.title.split('.')[1]?.trim() || s.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Navigation (Responsive Grid, No Scroll) */}
        <div className="px-3 sm:px-6 py-2 border-b border-[#1F293D] bg-[#0D121F] shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 w-full">
            {[
              { id: 'overview', label: '1. Visão Geral', icon: Building },
              { id: 'diagnostic', label: '2. Diagnóstico & BANT', icon: Target },
              { id: 'timeline', label: `3. Linha do Tempo (${formData.timelineLogs?.length || lead.timelineLogs?.length || 0})`, icon: History },
              { id: 'whatsapp', label: '4. WhatsApp IA', icon: MessageCircle },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-2 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all border text-center truncate ${
                    isActive
                      ? 'bg-yellow-500 text-slate-950 border-yellow-400 shadow-md shadow-yellow-500/20 font-black'
                      : 'bg-[#111728]/80 border-[#1F293D] text-slate-400 hover:text-slate-200 hover:bg-[#1A2234]'
                  }`}
                >
                  <Icon size={13} className="shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Contents Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: VISÃO GERAL */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Core Financial & Priority Highlight */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[#111728] border border-yellow-500/30 space-y-1">
                  <span className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider block">
                    Valor da Oportunidade
                  </span>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">R$</span>
                    <input
                      type="number"
                      value={formData.estimatedValue || ''}
                      onChange={(e) => updateField('estimatedValue', parseFloat(e.target.value) || 0)}
                      placeholder="25000"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl pl-9 pr-3 py-2 text-emerald-400 font-black text-lg focus:outline-none focus:border-yellow-500/50"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#111728] border border-[#1F293D] space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Origem do Lead
                  </span>
                  <select
                    value={formData.source || 'Instagram'}
                    onChange={(e) => updateField('source', e.target.value)}
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2.5 text-xs text-slate-200 font-bold focus:outline-none focus:border-yellow-500/50"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Tráfego Pago">Tráfego Pago</option>
                    <option value="Evento Presencial">Evento Presencial</option>
                    <option value="WhatsApp Direct">WhatsApp Direct</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div className="p-4 rounded-2xl bg-[#111728] border border-[#1F293D] space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Prioridade de Atendimento
                  </span>
                  <select
                    value={formData.priority || 'alta'}
                    onChange={(e) => updateField('priority', e.target.value)}
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2.5 text-xs text-slate-200 font-bold focus:outline-none focus:border-yellow-500/50"
                  >
                    <option value="alta">🔥 Alta (Fechamento Imediato)</option>
                    <option value="media">⚡ Média (Follow-up Ativo)</option>
                    <option value="baixa">⏳ Baixa (Nutrição)</option>
                  </select>
                </div>
              </div>

              {/* Contact Information Fields */}
              <div className="p-5 rounded-2xl bg-[#111728]/80 border border-[#1F293D] space-y-4">
                <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <User size={14} className="text-yellow-400" /> Dados de Contato Direto
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1.5">Telefone / WhatsApp</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.phone || ''}
                        onChange={(e) => updateField('phone', maskPhone(e.target.value))}
                        placeholder="(11) 99999-9999"
                        className="flex-1 bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 font-bold focus:outline-none focus:border-yellow-500/40"
                      />
                      {formData.phone && (
                        <button
                          type="button"
                          onClick={() => openWhatsApp(formData.phone, formData.name)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40 font-bold flex items-center gap-1.5 shrink-0"
                          title="Abrir WhatsApp Web"
                        >
                          <MessageCircle size={14} />
                          <span className="hidden sm:inline">Chamar</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1.5">E-mail Profissional</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="contato@empresa.com.br"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 font-semibold focus:outline-none focus:border-yellow-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1.5">Cargo / Posição</label>
                    <input
                      type="text"
                      value={formData.role || ''}
                      onChange={(e) => updateField('role', e.target.value)}
                      placeholder="Ex: CEO & Fundador, Sócio Diretor"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1.5">Localização (Cidade - UF)</label>
                    <input
                      type="text"
                      value={formData.cityState || ''}
                      onChange={(e) => updateField('cityState', e.target.value)}
                      placeholder="Ex: São Paulo - SP"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                    />
                  </div>
                </div>
              </div>

              {/* Internal Diagnostic Summary */}
              <div className="p-5 rounded-2xl bg-[#111728]/80 border border-[#1F293D] space-y-3">
                <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={14} className="text-yellow-400" /> Resumo do Diagnóstico Comercial
                </h4>
                <textarea
                  rows={4}
                  value={formData.notes || ''}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Anotações gerais sobre o perfil do lead, dores relatadas, momento de faturamento e expectativas..."
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl p-3.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/50 leading-relaxed resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: DIAGNÓSTICO & BANT */}
          {activeTab === 'diagnostic' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-5 rounded-2xl bg-[#111728]/90 border border-yellow-500/30 space-y-5">
                <div className="flex items-center justify-between border-b border-[#1F293D] pb-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                      <Target size={16} className="text-yellow-400" />
                      <span>Matriz de Qualificação BANT & Diagnóstico de Escala</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Avalie se o prospect possui o perfil executivo e financeiro para a mentoria do Rocket Club.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1F293D] space-y-2">
                    <label className="block text-slate-300 font-extrabold flex items-center gap-1.5">
                      <DollarSign size={14} className="text-emerald-400" /> Faturamento Médio Mensal Atual
                    </label>
                    <input
                      type="text"
                      value={formData.currentRevenue || ''}
                      onChange={(e) => updateField('currentRevenue', e.target.value)}
                      placeholder="Ex: R$ 150.000,00/mês"
                      className="w-full bg-[#111728] border border-[#1F293D] rounded-xl px-3.5 py-2 text-slate-100 font-bold focus:outline-none focus:border-yellow-500/40"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1F293D] space-y-2">
                    <label className="block text-slate-300 font-extrabold flex items-center gap-1.5">
                      <Users size={14} className="text-blue-400" /> Tamanho do Time / Colaboradores
                    </label>
                    <input
                      type="text"
                      value={formData.teamSize || ''}
                      onChange={(e) => updateField('teamSize', e.target.value)}
                      placeholder="Ex: 8 colaboradores fixos + 2 agências"
                      className="w-full bg-[#111728] border border-[#1F293D] rounded-xl px-3.5 py-2 text-slate-100 font-semibold focus:outline-none focus:border-yellow-500/40"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1F293D] space-y-2 sm:col-span-2">
                    <label className="block text-slate-300 font-extrabold flex items-center gap-1.5">
                      <Flame size={14} className="text-red-400" /> Principal Gargalo / Trava de Crescimento
                    </label>
                    <textarea
                      rows={2}
                      value={formData.mainBottleneck || ''}
                      onChange={(e) => updateField('mainBottleneck', e.target.value)}
                      placeholder="Ex: Dependência da fundadora nas vendas, CAC elevado e falta de processo comercial de escala..."
                      className="w-full bg-[#111728] border border-[#1F293D] rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40 resize-none leading-relaxed"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1F293D] space-y-2 sm:col-span-2">
                    <label className="block text-slate-300 font-extrabold flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-emerald-400" /> Meta de Faturamento para os Próximos 12 Meses
                    </label>
                    <input
                      type="text"
                      value={formData.targetGoal || ''}
                      onChange={(e) => updateField('targetGoal', e.target.value)}
                      placeholder="Ex: Alcançar R$ 500k/mês e abrir operação no exterior"
                      className="w-full bg-[#111728] border border-[#1F293D] rounded-xl px-3.5 py-2 text-slate-100 font-semibold focus:outline-none focus:border-yellow-500/40"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1F293D] space-y-2">
                    <label className="block text-slate-300 font-extrabold flex items-center gap-1.5">
                      <Award size={14} className="text-yellow-400" /> Decisão & Sócios
                    </label>
                    <input
                      type="text"
                      value={formData.hasPartners || ''}
                      onChange={(e) => updateField('hasPartners', e.target.value)}
                      placeholder="Ex: 100% decisor único ou Tem sócio"
                      className="w-full bg-[#111728] border border-[#1F293D] rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1F293D] space-y-2">
                    <label className="block text-slate-300 font-extrabold flex items-center gap-1.5">
                      <Clock size={14} className="text-amber-400" /> Nível de Urgência
                    </label>
                    <select
                      value={formData.urgencyLevel || 'imediato'}
                      onChange={(e) => updateField('urgencyLevel', e.target.value)}
                      className="w-full bg-[#111728] border border-[#1F293D] rounded-xl px-3 py-2 text-slate-100 font-bold focus:outline-none focus:border-yellow-500/40"
                    >
                      <option value="imediato">🔥 Imediato (Início neste mês)</option>
                      <option value="30_dias">⚡ Próximos 30 dias</option>
                      <option value="pesquisando">⏳ Apenas pesquisando opções</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TIMELINE & HISTÓRICO */}
          {activeTab === 'timeline' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Add Interaction Button / Form */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#111728] border border-[#1F293D] space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Plus size={15} className="text-yellow-400" /> Registrar Ponto de Contato
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingLog(!isAddingLog)}
                    className="px-3 py-1.5 rounded-xl bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 text-xs font-bold transition-colors"
                  >
                    {isAddingLog ? 'Recolher' : '+ Novo Registro'}
                  </button>
                </div>

                {isAddingLog && (
                  <form onSubmit={handleCreateLog} className="space-y-3 pt-2 border-t border-[#1F293D] text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Tipo de Interação</label>
                        <select
                          value={logType}
                          onChange={(e) => setLogType(e.target.value as any)}
                          className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2 text-slate-100 font-bold focus:outline-none focus:border-yellow-500/40"
                        >
                          <option value="whatsapp">💬 Conversa no WhatsApp</option>
                          <option value="call">📞 Ligação Realizada</option>
                          <option value="meeting">🤝 Reunião / Call de Fechamento</option>
                          <option value="email">📧 E-mail Comercial</option>
                          <option value="note">📝 Anotação Interna</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Título do Evento</label>
                        <input
                          type="text"
                          value={logTitle}
                          onChange={(e) => setLogTitle(e.target.value)}
                          placeholder="Ex: Call de alinhamento com sócios"
                          className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Descrição & Acordos do Contato</label>
                      <textarea
                        rows={3}
                        required
                        value={logDescription}
                        onChange={(e) => setLogDescription(e.target.value)}
                        placeholder="Descreva os pontos tratados, objeções levantadas e próximos passos..."
                        className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl p-3 text-slate-100 focus:outline-none focus:border-yellow-500/40 resize-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingLog(false)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#0B0F17] text-slate-400 text-xs font-semibold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-yellow-500 text-slate-950 font-bold text-xs hover:bg-yellow-400 transition-colors flex items-center gap-1.5"
                      >
                        <Send size={13} /> Salvar Histórico
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Timeline Feed */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Linha do Tempo Cronológica
                </span>

                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#1F293D]">
                  {(formData.timelineLogs || lead.timelineLogs || []).map((log) => {
                    const badge = getLogTypeBadge(log.type);
                    const Icon = badge.icon;

                    return (
                      <div key={log.id} className="relative group">
                        {/* Dot indicator */}
                        <div className="absolute -left-6 top-3 w-5 h-5 rounded-full bg-[#111728] border-2 border-yellow-400 flex items-center justify-center text-yellow-400 text-[10px] shadow-sm">
                          <div className="w-2 h-2 rounded-full bg-yellow-400" />
                        </div>

                        <div className="p-4 rounded-2xl bg-[#111728]/90 border border-[#1F293D] space-y-2 hover:border-yellow-500/30 transition-all">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 ${badge.bg}`}>
                                <Icon size={12} className="mr-1" />
                                {badge.label}
                              </Badge>
                              <h5 className="text-xs font-bold text-slate-100">{log.title}</h5>
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                              <Clock size={11} /> {log.createdAt}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                            {log.description}
                          </p>

                          <div className="text-[10px] text-slate-500 font-semibold pt-1 border-t border-[#1F293D]/60 flex items-center justify-between">
                            <span>Registrado por: <strong>{log.author}</strong></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {(!formData.timelineLogs || formData.timelineLogs.length === 0) && (
                    <div className="p-8 rounded-2xl border-2 border-dashed border-[#1F293D] text-center text-xs text-slate-500 space-y-1">
                      <p className="font-bold text-slate-400">Nenhum histórico registrado ainda</p>
                      <p>Adicione acima os pontos de contato para manter a equipe comercial alinhada.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: WHATSAPP IA & TEMPLATES */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-5 rounded-2xl bg-[#111728] border border-emerald-500/30 space-y-5">
                <div className="flex items-center justify-between border-b border-[#1F293D] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shrink-0">
                      <MessageCircle size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-100">Disparador Inteligente WhatsApp</h4>
                      <p className="text-xs text-slate-400">
                        Destinatário: <strong className="text-slate-200">{formData.name}</strong> • {formData.phone}
                      </p>
                    </div>
                  </div>

                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                    🟢 Webhook Online
                  </Badge>
                </div>

                {/* Templates Selector */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Selecione o Modelo Validado de Alta Conversão:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {WHATSAPP_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => {
                          setSelectedTemplateIndex(idx);
                          setCustomWhatsAppMsg(tmpl.text(formData.name || 'Lead', formData.company || 'Empresa'));
                        }}
                        className={`p-3 rounded-xl text-left text-xs font-semibold border transition-all ${
                          selectedTemplateIndex === idx
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md ring-1 ring-emerald-500'
                            : 'bg-[#0B0F17] text-slate-400 border-[#1F293D] hover:bg-[#1A2234] hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold">
                          <Zap size={14} className={selectedTemplateIndex === idx ? 'text-emerald-400' : 'text-slate-500'} />
                          <span>{tmpl.title}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Textarea */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Texto da Mensagem:
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      Variáveis preenchidas automaticamente
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    value={customWhatsAppMsg}
                    onChange={(e) => setCustomWhatsAppMsg(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl p-3.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500/50 leading-relaxed resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#1F293D]">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(customWhatsAppMsg);
                      setCopiedMsg(true);
                      setTimeout(() => setCopiedMsg(false), 2500);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0B0F17] hover:bg-[#1E293B] text-slate-300 text-xs font-bold border border-[#1F293D] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedMsg ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copiedMsg ? 'Mensagem Copiada!' : 'Copiar Texto'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      openWhatsApp(formData.phone, formData.name);
                      // Auto-log interaction in timeline
                      const autoLog: LeadLog = {
                        id: `log-${Date.now()}`,
                        type: 'whatsapp',
                        title: `Disparo WhatsApp (${WHATSAPP_TEMPLATES[selectedTemplateIndex]?.title})`,
                        description: customWhatsAppMsg,
                        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
                        author: 'Agente IA WhatsApp',
                      };
                      const updatedLogs = [autoLog, ...(formData.timelineLogs || lead.timelineLogs || [])];
                      updateField('timelineLogs', updatedLogs);
                      updateField('lastContact', new Date().toISOString().split('T')[0]);
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Send size={15} />
                    <span>Enviar no WhatsApp & Registrar Log 🚀</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Executive Footer */}
        <div className="p-3.5 sm:p-5 border-t border-[#1F293D] bg-[#111728]/95 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 safe-area-pb">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onConvertToMember(formData as Lead)}
              className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 sm:gap-2"
            >
              <UserCheck size={15} />
              <span>Converter em Mentorado 🚀</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => onDelete(formData as Lead)}
              className="px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <Trash2 size={14} />
              <span>Excluir</span>
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#0B0F17] hover:bg-[#1E293B] text-slate-300 text-xs font-semibold transition-colors"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={() => handleFormSubmit()}
              disabled={isSaving}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs shadow-lg shadow-yellow-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save size={14} />
              <span>{isSaving ? 'Salvando...' : 'Salvar Lead'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(sheetNode, document.body) : null;
}
