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
  EyeOff,
  Calendar,
  DollarSign,
  Camera,
  Activity,
  Award,
  Users,
  Send,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Member, KANBAN_STAGES } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { maskCpf, maskCnpj, maskPhone, maskRg } from '@/lib/masks';
import { useTheme } from '@/lib/theme-context';
import {
  getAllWhatsAppTemplates,
  sendWhatsAppWithTemplate,
  WhatsAppCustomTemplate,
  interpolateWhatsAppTemplate,
  INITIAL_DEFAULT_TEMPLATES,
} from '@/lib/whatsapp-automations';

interface MenteeSheetProps {
  member: (Member & { excludeFromBook?: boolean }) | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedMember: Member & { excludeFromBook?: boolean }) => Promise<void> | void;
  onDelete: (member: Member) => void;
  onDownloadPdf: (memberId: string) => void;
  onToggleBook: (memberId: string) => void;
}

export function MenteeSheet({
  member,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onDownloadPdf,
  onToggleBook,
}: MenteeSheetProps) {
  const { isLightMode, activePalette } = useTheme();
  const [formData, setFormData] = useState<Partial<Member & { excludeFromBook?: boolean }>>({});
  const [activeTab, setActiveTab] = useState<'profile' | 'contacts' | 'method' | 'achievements' | 'personal' | 'notes'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showAvatarPrompt, setShowAvatarPrompt] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState('');

  // WhatsApp Automation States
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<WhatsAppCustomTemplate[]>(INITIAL_DEFAULT_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('welcome');
  const [customMsg, setCustomMsg] = useState('');
  const [sessionDate, setSessionDate] = useState('amanhã');
  const [sessionTime, setSessionTime] = useState('15:00');
  const [sessionMeetUrl, setSessionMeetUrl] = useState('https://meet.google.com/rocket-club');
  const [renewalPlanDate, setRenewalPlanDate] = useState('no fim deste ciclo');
  const [renewalPlanDays, setRenewalPlanDays] = useState('15');
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsAppFeedback, setWhatsAppFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Animation States for Smooth Enter & Exit
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Sync state with open member and trigger entrance animation
  useEffect(() => {
    let animTimer: NodeJS.Timeout;
    if (isOpen && member) {
      setIsMounted(true);
      setFormData({ ...member });
      setAvatarUrlInput(member.coverImage || member.avatar || '');
      setIsDirty(false);
      setSaveSuccess(false);
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
  }, [isOpen, member]);

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

  const updateField = (field: keyof Member, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setSaveSuccess(false);
  };

  const handleBirthdateChange = (dateVal: string) => {
    updateField('birthdate', dateVal);
    if (dateVal) {
      const birthDate = new Date(dateVal);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let calculatedYears = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          calculatedYears--;
        }
        if (calculatedYears >= 0 && calculatedYears <= 120) {
          updateField('age', `${calculatedYears} anos`);
        }
      }
    }
  };

  // Sync available templates when opening modal
  useEffect(() => {
    if (showWhatsAppModal) {
      const list = getAllWhatsAppTemplates();
      setAvailableTemplates(list);
      if (list.length > 0 && (!selectedTemplateId || !list.some((t) => t.id === selectedTemplateId))) {
        setSelectedTemplateId(list[0].id);
      }
    }
  }, [showWhatsAppModal]);

  const handleSendWhatsAppAutomation = async () => {
    if (!formData.phone) {
      setWhatsAppFeedback({ success: false, message: 'Mentorado não possui número de WhatsApp informado.' });
      return;
    }
    setIsSendingWhatsApp(true);
    setWhatsAppFeedback(null);

    try {
      if (selectedTemplateId === 'custom_free') {
        const { sendEvolutionWhatsAppMessage } = await import('@/lib/evolution-api');
        const res = await sendEvolutionWhatsAppMessage(formData.phone, customMsg);
        if (res.success) {
          setWhatsAppFeedback({ success: true, message: 'Mensagem disparada com sucesso pelo WhatsApp! 🚀' });
        } else {
          setWhatsAppFeedback({ success: false, message: res.error || 'Erro ao disparar mensagem.' });
        }
        return;
      }

      const template = availableTemplates.find((t) => t.id === selectedTemplateId) || availableTemplates[0];
      const templateContent = customMsg.trim() ? customMsg : template?.content || '';

      const result = await sendWhatsAppWithTemplate(
        formData.phone,
        templateContent,
        {
          nome: formData.name || 'Mentorado',
          empresa: formData.companyName || 'sua empresa',
          especialidade: formData.specialty || 'Mentoria',
          data: sessionDate,
          horario: sessionTime,
          link: sessionMeetUrl,
          dataRenovacao: renewalPlanDate,
          diasRestantes: renewalPlanDays,
          tarefa: 'Meta Estratégica de Escala',
          status: 'Em andamento',
        }
      );

      if (result.success) {
        setWhatsAppFeedback({ success: true, message: 'Mensagem disparada com sucesso pelo WhatsApp! 🚀' });
      } else {
        setWhatsAppFeedback({ success: false, message: result.error || 'Erro ao disparar mensagem.' });
      }
    } catch (err: any) {
      setWhatsAppFeedback({ success: false, message: err.message || 'Erro inesperado no envio.' });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const getComputedPreview = () => {
    if (selectedTemplateId === 'custom_free') {
      return customMsg || 'Digite sua mensagem personalizada abaixo...';
    }
    const template = availableTemplates.find((t) => t.id === selectedTemplateId) || availableTemplates[0];
    if (!template) return customMsg || '';

    const content = customMsg.trim() ? customMsg : template.content;
    return interpolateWhatsAppTemplate(content, {
      nome: formData.name || 'Mentorado',
      empresa: formData.companyName || 'sua empresa',
      especialidade: formData.specialty || 'Mentoria',
      data: sessionDate,
      horario: sessionTime,
      link: sessionMeetUrl,
      dataRenovacao: renewalPlanDate,
      diasRestantes: renewalPlanDays,
      tarefa: 'Meta Estratégica de Escala',
      status: 'Em andamento',
    });
  };

  if (!isMounted || !member) return null;

  const handleFormSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const merged = { ...member, ...formData } as Member & { excludeFromBook?: boolean };
      await onSave(merged);
      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar mentorado:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const openWhatsApp = (phoneStr?: string, nameStr?: string) => {
    const cleanNumber = (phoneStr || '').replace(/\D/g, '');
    if (!cleanNumber) return;
    const text = encodeURIComponent(`Olá ${nameStr || 'Mentorado'}, tudo bem? Sou da equipe executiva do Rocket Club.`);
    window.open(`https://wa.me/55${cleanNumber}?text=${text}`, '_blank');
  };

  const currentStage = KANBAN_STAGES.find((s) => s.id === formData.status) || KANBAN_STAGES[0];

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
            <div className="relative group shrink-0">
              {formData.coverImage || formData.avatar ? (
                <img
                  src={formData.coverImage || formData.avatar}
                  alt={formData.name || 'Mentorado'}
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl object-cover object-center border-2 border-yellow-500/40 shadow-lg shadow-yellow-500/10"
                />
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-yellow-500 to-amber-300 text-slate-950 font-black text-xl sm:text-2xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
                  {(formData.name || 'M').charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowAvatarPrompt(!showAvatarPrompt)}
                className="absolute -bottom-1 -right-1 p-1 sm:p-1.5 rounded-lg bg-[#1E293B] hover:bg-yellow-500 text-slate-300 hover:text-slate-950 border border-[#334155] transition-all shadow-md"
                title="Alterar foto de perfil"
              >
                <Camera size={11} />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Nome do Mentorado"
                  className="text-base sm:text-xl font-extrabold text-slate-100 bg-transparent border-b border-transparent hover:border-[#1F293D] focus:border-yellow-500 focus:outline-none transition-colors w-full truncate"
                />
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap text-xs">
                <input
                  type="text"
                  value={formData.specialty || ''}
                  onChange={(e) => updateField('specialty', e.target.value)}
                  placeholder="Especialidade / Nicho"
                  className="text-xs text-yellow-400 font-semibold bg-transparent border-b border-transparent hover:border-[#1F293D] focus:border-yellow-500 focus:outline-none transition-colors max-w-[140px] sm:max-w-[200px] truncate"
                />
                <span className="text-slate-600 text-xs">•</span>
                <input
                  type="text"
                  value={formData.companyName || ''}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  placeholder="Empresa / Razão Social"
                  className="text-xs text-slate-400 bg-transparent border-b border-transparent hover:border-[#1F293D] focus:border-yellow-500 focus:outline-none transition-colors max-w-[140px] sm:max-w-[200px] truncate"
                />
              </div>
            </div>
          </div>

          {/* Quick Actions (PDF, WhatsApp, Book Toggle, Close) */}
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

            <button
              type="button"
              onClick={() => onDownloadPdf(member.id)}
              className="p-2 sm:p-2.5 rounded-xl bg-[#0B0F17] hover:bg-[#1F293D] text-slate-300 hover:text-slate-100 border border-[#1F293D] transition-colors"
              title="Baixar Ficha em PDF"
            >
              <FileText size={15} />
            </button>

            {formData.phone && (
              <button
                type="button"
                onClick={() => {
                  setWhatsAppFeedback(null);
                  setShowWhatsAppModal(true);
                }}
                className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all hover:scale-105 flex items-center gap-1.5"
                title="Disparar Automação no WhatsApp"
              >
                <MessageCircle size={15} />
                <span className="text-[11px] font-bold hidden sm:inline">WhatsApp</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onToggleBook(member.id)}
              className={`p-2 sm:p-2.5 rounded-xl border transition-colors ${
                formData.excludeFromBook
                  ? 'bg-slate-800/40 text-slate-500 border-slate-700'
                  : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
              }`}
              title={formData.excludeFromBook ? 'Incluir no Members Book' : 'Excluir do Members Book'}
            >
              {formData.excludeFromBook ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>

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

        {/* Avatar URL Input Dropdown */}
        {showAvatarPrompt && (
          <div className="p-3 bg-[#131A2B] border-b border-[#1F293D] flex items-center gap-2 animate-in fade-in duration-150">
            <input
              type="text"
              placeholder="Cole o link (URL) da foto de perfil..."
              value={avatarUrlInput}
              onChange={(e) => setAvatarUrlInput(e.target.value)}
              className="flex-1 bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-yellow-500"
            />
            <button
              type="button"
              onClick={() => {
                updateField('coverImage', avatarUrlInput);
                updateField('avatar', avatarUrlInput);
                setShowAvatarPrompt(false);
              }}
              className="px-3 py-1.5 rounded-xl bg-yellow-500 text-slate-950 font-bold text-xs shrink-0"
            >
              Aplicar Foto
            </button>
            <button
              type="button"
              onClick={() => setShowAvatarPrompt(false)}
              className="px-2 py-1.5 text-slate-400 hover:text-slate-200 text-xs shrink-0"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Status Stage Selection Grid (No horizontal scrolling, 100% responsive) */}
        <div className="px-3 sm:px-6 py-2 sm:py-2.5 border-b border-[#1F293D]/70 bg-[#0B0F17]/60">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 w-full">
            {KANBAN_STAGES.map((stage) => {
              const isSelected = formData.status === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => updateField('status', stage.id)}
                  className={`py-1.5 px-2 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 border text-center ${
                    isSelected
                      ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/60 shadow-md ring-1 ring-yellow-400'
                      : 'bg-[#111728] text-slate-400 border-[#1F293D] hover:bg-[#1E293B] hover:text-slate-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${stage.badge}`} />
                  <span className="truncate">{stage.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Navigation Grid */}
        <div className="px-3 sm:px-6 py-2 border-b border-[#1F293D] bg-[#0D121F] shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 w-full">
            {[
              { id: 'profile', label: '1. Atuação & PJ', icon: Briefcase },
              { id: 'contacts', label: '2. Contatos & Redes', icon: Phone },
              { id: 'method', label: '3. Método & Evolução', icon: Sparkles },
              { id: 'achievements', label: '4. Mural & Metas', icon: Award },
              { id: 'personal', label: '5. Vida Pessoal', icon: Heart },
              { id: 'notes', label: '6. Anotações', icon: Activity },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === (tab.id as any);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-2 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all border text-center truncate ${
                    isActive
                      ? 'shadow-md font-black'
                      : 'bg-[#111728]/80 border-[#1F293D] text-slate-400 hover:text-slate-200 hover:bg-[#1A2234]'
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: activePalette.tokens.primary,
                          color: isLightMode ? '#FFFFFF' : '#0B0F17',
                          borderColor: activePalette.tokens.primary,
                          boxShadow: `0 4px 15px ${activePalette.tokens.glow}`,
                        }
                      : {}
                  }
                >
                  <Icon size={13} className="shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Form Body with Direct Interactive Inputs */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: ATUAÇÃO PROFISSIONAL & PJ */}
          {activeTab === 'profile' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 sm:p-5 rounded-2xl bg-[#111728]/70 border border-[#1F293D] space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building size={14} /> Dados Corporativos & Contábeis
                  </h4>
                  <span className="text-[10px] text-slate-500">Edição instantânea</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Razão Social</label>
                    <input
                      type="text"
                      value={formData.companyName || ''}
                      onChange={(e) => updateField('companyName', e.target.value)}
                      placeholder="Ex: Alpha Tech Serviços Digitais LTDA"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Nome Fantasia / Marca</label>
                    <input
                      type="text"
                      value={formData.tradeName || ''}
                      onChange={(e) => updateField('tradeName', e.target.value)}
                      placeholder="Ex: Alpha Tech Digital"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">CNPJ</label>
                    <input
                      type="text"
                      value={formData.cnpj || ''}
                      onChange={(e) => updateField('cnpj', maskCnpj(e.target.value))}
                      placeholder="00.000.000/0001-00"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                      Registro Profissional (CRM/CRO/OAB/CRA)
                    </label>
                    <input
                      type="text"
                      value={formData.professionalRegister || ''}
                      onChange={(e) => updateField('professionalRegister', e.target.value)}
                      placeholder="Ex: CRM-SP 123456"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Faturamento Mensal Atual</label>
                    <input
                      type="text"
                      value={formData.monthlyRevenue || ''}
                      onChange={(e) => updateField('monthlyRevenue', e.target.value)}
                      placeholder="Ex: R$ 150.000,00"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-bold focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Endereço Comercial</label>
                    <input
                      type="text"
                      value={formData.commercialAddress || ''}
                      onChange={(e) => updateField('commercialAddress', e.target.value)}
                      placeholder="Ex: Av. Faria Lima, 3000 - São Paulo, SP"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#111728]/70 border border-[#1F293D] space-y-4">
                <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase size={14} className="text-yellow-400" /> Trajetória, Operação & Experiência Profissional
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Locais de Atuação</label>
                    <input
                      type="text"
                      value={formData.workLocations || ''}
                      onChange={(e) => updateField('workLocations', e.target.value)}
                      placeholder="Ex: São Paulo, Rio de Janeiro e Miami"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Carga Horária / Função</label>
                    <input
                      type="text"
                      value={formData.workDescriptionHours || ''}
                      onChange={(e) => updateField('workDescriptionHours', e.target.value)}
                      placeholder="Ex: CEO / 40h semanais"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Experiência Profissional</label>
                    <input
                      type="text"
                      value={formData.professionalExperience || ''}
                      onChange={(e) => updateField('professionalExperience', e.target.value)}
                      placeholder="Ex: 15 anos no setor, formação e histórico..."
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTATOS & MÍDIAS SOCIAIS */}
          {activeTab === 'contacts' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 sm:p-5 rounded-2xl bg-[#111728]/70 border border-[#1F293D] space-y-4">
                <h4 className="text-xs font-extrabold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone size={14} /> Contatos Diretos & Mensageria
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <Phone size={12} className="text-yellow-400" /> WhatsApp / Telefone
                      </label>
                      {formData.phone && (
                        <button
                          type="button"
                          onClick={() => openWhatsApp(formData.phone, formData.name)}
                          className="text-[10px] text-emerald-400 hover:underline font-bold flex items-center gap-1"
                        >
                          <MessageCircle size={11} /> Testar WhatsApp
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => updateField('phone', maskPhone(e.target.value))}
                      placeholder="(11) 99999-0000"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                      <Mail size={12} className="text-yellow-400" /> E-mail Corporativo
                    </label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="contato@empresa.com.br"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                      <Instagram size={12} className="text-pink-400" /> Instagram (@)
                    </label>
                    <input
                      type="text"
                      value={formData.instagram || ''}
                      onChange={(e) => updateField('instagram', e.target.value)}
                      placeholder="@perfil.oficial"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-yellow-400 font-semibold focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                      <Linkedin size={12} className="text-blue-400" /> LinkedIn
                    </label>
                    <input
                      type="text"
                      value={formData.linkedin || ''}
                      onChange={(e) => updateField('linkedin', e.target.value)}
                      placeholder="linkedin.com/in/usuario"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                      <Globe size={12} className="text-teal-400" /> Website Oficial
                    </label>
                    <input
                      type="text"
                      value={formData.website || ''}
                      onChange={(e) => updateField('website', e.target.value)}
                      placeholder="https://suaempresa.com.br"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                      <AlertTriangle size={12} className="text-red-400" /> Contato de Emergência
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyContact || ''}
                      onChange={(e) => updateField('emergencyContact', e.target.value)}
                      placeholder="Nome e Telefone de Emergência"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: APLICAÇÃO DO MÉTODO & EVOLUÇÃO (5 PILARES ROCKET) */}
          {activeTab === 'method' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Maturity Scorecard Banner */}
              <div
                className="p-5 rounded-2xl border space-y-3 relative overflow-hidden"
                style={{
                  backgroundColor: activePalette.tokens.surface,
                  borderColor: activePalette.tokens.surfaceBorder,
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shrink-0"
                      style={{
                        backgroundColor: activePalette.tokens.badgeBg,
                        color: activePalette.tokens.primary,
                        borderColor: activePalette.tokens.badgeBorder,
                        borderWidth: 1,
                      }}
                    >
                      🚀
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm sm:text-base font-extrabold text-slate-100">
                          Matriz de Maturidade Rocket Club
                        </h4>
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase"
                          style={{
                            backgroundColor: activePalette.tokens.badgeBg,
                            color: activePalette.tokens.primary,
                            border: `1px solid ${activePalette.tokens.badgeBorder}`,
                          }}
                        >
                          Nível de Escala
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Avaliação contínua dos 5 pilares do método de aceleração para escala previsível.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 5 Pillars Quick Visual Progress */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2">
                  {[
                    { name: '1. Oferta & Posicionamento', score: 8.5, color: 'text-amber-400', bg: 'bg-amber-400' },
                    { name: '2. Tráfego & Funis', score: 7.0, color: 'text-blue-400', bg: 'bg-blue-400' },
                    { name: '3. Comercial & Vendas', score: 8.0, color: 'text-emerald-400', bg: 'bg-emerald-400' },
                    { name: '4. Entrega & LTV', score: 9.0, color: 'text-purple-400', bg: 'bg-purple-400' },
                    { name: '5. Gestão & Escala', score: 6.5, color: 'text-rose-400', bg: 'bg-rose-400' },
                  ].map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#0B0F17] border border-[#1F293D] flex flex-col justify-between space-y-2"
                    >
                      <span className="text-[10px] font-bold text-slate-300 leading-tight truncate">
                        {p.name}
                      </span>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono font-black">
                          <span className={p.color}>Nota {p.score}</span>
                          <span className="text-slate-500">/ 10</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#1F293D] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${p.bg}`}
                            style={{ width: `${p.score * 10}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategic Pillars In-Depth Assessment */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#111728]/70 border border-[#1F293D] space-y-5">
                <h4
                  className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5"
                  style={{ color: activePalette.tokens.primary }}
                >
                  <Target size={14} /> Diagnóstico Estratégico do Negócio
                </h4>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                    <Target size={12} style={{ color: activePalette.tokens.primary }} /> Objetivo Principal no Ciclo
                  </label>
                  <input
                    type="text"
                    value={formData.mainGoal || ''}
                    onChange={(e) => updateField('mainGoal', e.target.value)}
                    placeholder="Ex: Escalar operação de R$ 80k para R$ 250k/mês e estruturar time comercial"
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-yellow-500/60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-red-400 mb-1.5 flex items-center gap-1">
                    <Flame size={12} /> Principal Gargalo / Desafio Atual
                  </label>
                  <textarea
                    rows={2}
                    value={formData.biggestChallenge || ''}
                    onChange={(e) => updateField('biggestChallenge', e.target.value)}
                    placeholder="O que está impedindo a empresa de crescer mais rápido agora?"
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 resize-none leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                      Frentes de Mentoria com Maior Foco
                    </label>
                    <input
                      type="text"
                      value={formData.mentorshipInterest || ''}
                      onChange={(e) => updateField('mentorshipInterest', e.target.value)}
                      placeholder="Ex: Tráfego perpétuo, contratação de Closer e SDR, DRE"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                      Disponibilidade Semanal de Execução
                    </label>
                    <input
                      type="text"
                      value={formData.weeklyAvailability || ''}
                      onChange={(e) => updateField('weeklyAvailability', e.target.value)}
                      placeholder="Ex: 10 horas semanais de dedicação estratégica"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: METAS, DESAFIOS & MURAL DE CONQUISTAS */}
          {activeTab === 'achievements' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Gamification Level & Rank Header */}
              <div
                className="p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                style={{
                  backgroundColor: activePalette.tokens.surface,
                  borderColor: activePalette.tokens.surfaceBorder,
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl shrink-0"
                    style={{
                      backgroundColor: activePalette.tokens.badgeBg,
                      color: activePalette.tokens.primary,
                      border: `1px solid ${activePalette.tokens.badgeBorder}`,
                      boxShadow: `0 8px 25px ${activePalette.tokens.glow}`,
                    }}
                  >
                    🏆
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-100">
                        Comandante Rocket (Nível 3)
                      </h3>
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase"
                        style={{
                          backgroundColor: activePalette.tokens.badgeBg,
                          color: activePalette.tokens.primary,
                          border: `1px solid ${activePalette.tokens.badgeBorder}`,
                        }}
                      >
                        1.850 XP
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Falta 650 XP para a patente <strong>Almirante de Frota</strong>.
                    </p>
                    <div className="w-48 sm:w-64 h-2 bg-[#0B0F17] rounded-full mt-2 overflow-hidden border border-[#1F293D]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: '74%',
                          backgroundColor: activePalette.tokens.primary,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Rocket Academy Consumption Link */}
                <div className="p-3 rounded-xl bg-[#0B0F17] border border-[#1F293D] flex items-center gap-3 self-stretch sm:self-auto">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0">
                    🎓
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-300">Rocket Academy</div>
                    <div className="text-xs font-black text-purple-400">14 de 18 aulas concluídas (78%)</div>
                  </div>
                </div>
              </div>

              {/* Mural de Conquistas (Badges Wall) */}
              <div className="p-5 rounded-2xl bg-[#111728]/70 border border-[#1F293D] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4
                      className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5"
                      style={{ color: activePalette.tokens.primary }}
                    >
                      <Award size={15} /> Mural de Conquistas & Insígnias do Mentorado
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Conquistas desbloqueadas durante a trajetória no ecossistema Rocket Club.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">5 / 6 Conquistados</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    {
                      id: '100k',
                      title: 'Primeiro 100k',
                      desc: 'Faturamento mensal de 6 dígitos batido no ciclo',
                      icon: '🥇',
                      unlocked: true,
                      date: '15/07/2026',
                    },
                    {
                      id: 'offer',
                      title: 'Oferta High Ticket Validada',
                      desc: 'Funil comercial gerando vendas com previsibilidade',
                      icon: '⚡',
                      unlocked: true,
                      date: '02/08/2026',
                    },
                    {
                      id: 'closer',
                      title: 'Closer de Elite',
                      desc: 'Taxa de fechamento comercial acima de 30%',
                      icon: '🎯',
                      unlocked: true,
                      date: '10/08/2026',
                    },
                    {
                      id: 'academy',
                      title: 'Academy Master',
                      desc: 'Mais de 75% dos cursos e módulos consumidos',
                      icon: '🎓',
                      unlocked: true,
                      date: '20/08/2026',
                    },
                    {
                      id: 'community',
                      title: 'Presença VIP Mastermind',
                      desc: 'Participação ativa nas imersões presenciais',
                      icon: '🌟',
                      unlocked: true,
                      date: '24/08/2026',
                    },
                    {
                      id: '500k',
                      title: 'Escala 500k+',
                      desc: 'Operação faturando meio milhão com processos',
                      icon: '🛸',
                      unlocked: false,
                      date: 'Em progresso',
                    },
                  ].map((badge) => (
                    <div
                      key={badge.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                        badge.unlocked
                          ? 'bg-[#0B0F17] border-yellow-500/30 hover:border-yellow-500/60 shadow-md'
                          : 'bg-[#0B0F17]/40 border-[#1F293D] opacity-60'
                      }`}
                    >
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 border ${
                          badge.unlocked
                            ? 'bg-yellow-500/15 border-yellow-500/40'
                            : 'bg-slate-800/40 border-slate-700'
                        }`}
                      >
                        {badge.icon}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-slate-100 truncate">
                            {badge.title}
                          </span>
                          {badge.unlocked && <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          {badge.desc}
                        </p>
                        <span className="text-[9px] font-mono text-slate-500 block">
                          {badge.unlocked ? `Conquistado em ${badge.date}` : '🔒 Bloqueado'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metas do Ciclo & Desafios Semanais */}
              <div className="p-5 rounded-2xl bg-[#111728]/70 border border-[#1F293D] space-y-4">
                <div className="flex items-center justify-between">
                  <h4
                    className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5"
                    style={{ color: activePalette.tokens.primary }}
                  >
                    <CheckCircle2 size={15} /> Metas Smart do Ciclo Atual
                  </h4>
                  <span className="text-[11px] text-slate-400">Checkpoints de Aceleração</span>
                </div>

                <div className="space-y-2">
                  {[
                    { title: 'Contratar e treinar 1 SDR para qualificação de leads', status: 'Concluída', xp: '+250 XP', done: true },
                    { title: 'Validar novo script de apresentação High Ticket no Zoom', status: 'Concluída', xp: '+200 XP', done: true },
                    { title: 'Testar 5 criativos em vídeo no Meta Ads com orçamento de R$ 100/dia', status: 'Em Andamento', xp: '+150 XP', done: false },
                    { title: 'Implementar DRE mensal com o financeiro', status: 'A Fazer', xp: '+300 XP', done: false },
                  ].map((goal, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#0B0F17] border border-[#1F293D] flex items-center justify-between gap-3 hover:border-slate-600 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                            goal.done
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                              : 'bg-transparent border-slate-600 text-transparent'
                          }`}
                        >
                          <Check size={12} />
                        </button>
                        <span
                          className={`text-xs font-semibold ${
                            goal.done ? 'text-slate-400 line-through' : 'text-slate-200'
                          }`}
                        >
                          {goal.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            goal.done
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {goal.status}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-md border border-yellow-500/20">
                          {goal.xp}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: VIDA PESSOAL & FAMÍLIA */}
          {activeTab === 'personal' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 sm:p-5 rounded-2xl bg-[#111728]/70 border border-[#1F293D] space-y-4">
                <h4 className="text-xs font-extrabold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={14} /> Dados Pessoais & Documentos
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Data de Nascimento</label>
                    <input
                      type="date"
                      value={formData.birthdate ? String(formData.birthdate).split('T')[0] : ''}
                      onChange={(e) => handleBirthdateChange(e.target.value)}
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                      Idade <span className="text-[10px] text-yellow-500/80 font-normal">(automático)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.age || ''}
                      onChange={(e) => updateField('age', e.target.value)}
                      placeholder="Ex: 38 anos"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Estado Civil</label>
                    <select
                      value={formData.maritalStatus || ''}
                      onChange={(e) => updateField('maritalStatus', e.target.value)}
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20 cursor-pointer"
                    >
                      <option value="" disabled className="bg-[#111728] text-slate-500">Selecione o estado civil...</option>
                      <option value="Solteiro(a)" className="bg-[#111728]">Solteiro(a)</option>
                      <option value="Casado(a)" className="bg-[#111728]">Casado(a)</option>
                      <option value="União Estável" className="bg-[#111728]">União Estável</option>
                      <option value="Divorciado(a)" className="bg-[#111728]">Divorciado(a)</option>
                      <option value="Separado(a)" className="bg-[#111728]">Separado(a)</option>
                      <option value="Viúvo(a)" className="bg-[#111728]">Viúvo(a)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">CPF</label>
                    <input
                      type="text"
                      value={formData.cpf || ''}
                      onChange={(e) => updateField('cpf', maskCpf(e.target.value))}
                      placeholder="000.000.000-00"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">RG</label>
                    <input
                      type="text"
                      value={formData.rg || ''}
                      onChange={(e) => updateField('rg', maskRg(e.target.value))}
                      placeholder="00.000.000-0"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Nacionalidade</label>
                    <input
                      type="text"
                      value={formData.nationality || ''}
                      onChange={(e) => updateField('nationality', e.target.value)}
                      placeholder="Ex: Brasileiro"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Cidade Natal</label>
                    <input
                      type="text"
                      value={formData.birthplace || ''}
                      onChange={(e) => updateField('birthplace', e.target.value)}
                      placeholder="Ex: São Paulo - SP"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Cidade de Residência</label>
                    <input
                      type="text"
                      value={formData.residence || ''}
                      onChange={(e) => updateField('residence', e.target.value)}
                      placeholder="Ex: São Paulo - SP"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#111728]/70 border border-[#1F293D] space-y-4">
                <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Heart size={14} className="text-pink-400" /> Família, Hobbies & Lifestyle
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Esportes & Atividades</label>
                    <input
                      type="text"
                      value={formData.sportsInfo || ''}
                      onChange={(e) => updateField('sportsInfo', e.target.value)}
                      placeholder="Ex: Beach Tennis, Corrida, Ciclismo"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Hobbies & Paixões</label>
                    <input
                      type="text"
                      value={formData.hobbies || ''}
                      onChange={(e) => updateField('hobbies', e.target.value)}
                      placeholder="Ex: Gastronomia, Viagens, Vinhos"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Cônjuge</label>
                    <input
                      type="text"
                      value={formData.spouseInfo || ''}
                      onChange={(e) => updateField('spouseInfo', e.target.value)}
                      placeholder="Ex: Camila Silva (Arquiteta)"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Filhos</label>
                    <input
                      type="text"
                      value={formData.childrenInfo || ''}
                      onChange={(e) => updateField('childrenInfo', e.target.value)}
                      placeholder="Ex: 2 filhos (Lucas, 8 anos e Beatriz, 5 anos)"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Pets / Outros Interesses</label>
                    <input
                      type="text"
                      value={formData.petsInfo || formData.interests || ''}
                      onChange={(e) => {
                        updateField('petsInfo', e.target.value);
                        updateField('interests', e.target.value);
                      }}
                      placeholder="Ex: 1 Golden Retriever (Thor), Apaixonado por Tecnologia e IA"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ANOTAÇÕES DO MENTOR */}
          {activeTab === 'notes' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 sm:p-5 rounded-2xl bg-[#111728]/70 border border-[#1F293D] space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity size={14} /> Observações & Prontuário do Mentorado
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Último contato:{' '}
                    <strong className="text-slate-200">{formData.lastContact || 'Hoje'}</strong>
                  </span>
                </div>

                <div>
                  <textarea
                    rows={8}
                    value={formData.notes || ''}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="Adicione anotações sobre as reuniões, plano de ação, entregáveis e próximos passos do mentorado..."
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl p-4 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/20 leading-relaxed font-sans"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar with Delete & Direct Action Links */}
        <div className="p-3.5 sm:p-5 border-t border-[#1F293D] bg-[#111728]/95 backdrop-blur-lg flex items-center justify-between gap-2 shrink-0 safe-area-pb">
          <button
            type="button"
            onClick={() => onDelete(member)}
            className="px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Excluir Mentorado</span>
            <span className="sm:hidden">Excluir</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#0B0F17] hover:bg-[#1E293D] text-slate-300 text-xs font-semibold transition-colors"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={() => handleFormSubmit()}
              disabled={isSaving}
              className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs shadow-lg shadow-yellow-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 sm:gap-2 disabled:opacity-50 shrink-0"
            >
              <Save size={14} />
              <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>
        {/* WhatsApp Automation Dispatch Modal */}
        {showWhatsAppModal && (
          <div
            className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowWhatsAppModal(false)}
          >
            <div
              className="bg-[#0F1626] border border-[#1F293D] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-[#1F293D] bg-[#141C30] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <MessageCircle size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-100 flex items-center gap-2">
                      Automações de WhatsApp
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        Evolution API
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Disparando para <strong className="text-slate-200">{formData.name}</strong> ({formData.phone})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                {/* Dynamic Templates Selector Grid */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Selecione o Template ou Ação:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-1 bg-[#0A0E1A] rounded-xl border border-[#1F293D]">
                    {availableTemplates.map((tmpl) => {
                      const isSelected = selectedTemplateId === tmpl.id;
                      return (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => {
                            setSelectedTemplateId(tmpl.id);
                            setCustomMsg('');
                            setWhatsAppFeedback(null);
                          }}
                          className={`p-2 rounded-lg text-left transition-all flex items-center gap-2 ${
                            isSelected
                              ? 'bg-gradient-to-r from-yellow-500 to-amber-400 text-slate-950 font-bold shadow-md'
                              : 'text-slate-300 hover:text-slate-100 hover:bg-[#131A2B]'
                          }`}
                        >
                          <span className="text-sm shrink-0">{tmpl.icon || '💬'}</span>
                          <span className="text-[11px] truncate leading-tight">{tmpl.title}</span>
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplateId('custom_free');
                        setWhatsAppFeedback(null);
                      }}
                      className={`p-2 rounded-lg text-left transition-all flex items-center gap-2 ${
                        selectedTemplateId === 'custom_free'
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-400 text-slate-950 font-bold shadow-md'
                          : 'text-slate-300 hover:text-slate-100 hover:bg-[#131A2B]'
                      }`}
                    >
                      <span className="text-sm shrink-0">✍️</span>
                      <span className="text-[11px] truncate leading-tight">Texto Livre</span>
                    </button>
                  </div>
                </div>

                {/* Conditional Parameter Inputs based on template tags */}
                {(() => {
                  const currentTmpl = availableTemplates.find((t) => t.id === selectedTemplateId);
                  const content = currentTmpl?.content || '';
                  const hasSessionTags = content.includes('{data}') || content.includes('{horario}') || content.includes('{link}');
                  const hasRenewalTags = content.includes('{dataRenovacao}') || content.includes('{diasRestantes}');

                  if (!hasSessionTags && !hasRenewalTags) return null;

                  return (
                    <div className="space-y-2 p-3 bg-[#0A0E1A] rounded-xl border border-[#1F293D]">
                      {hasSessionTags && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Data da Sessão
                            </label>
                            <input
                              type="text"
                              value={sessionDate}
                              onChange={(e) => setSessionDate(e.target.value)}
                              placeholder="Ex: 28/08 (Quinta)"
                              className="w-full bg-[#131A2B] border border-[#1F293D] rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-yellow-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Horário
                            </label>
                            <input
                              type="text"
                              value={sessionTime}
                              onChange={(e) => setSessionTime(e.target.value)}
                              placeholder="Ex: 15:00"
                              className="w-full bg-[#131A2B] border border-[#1F293D] rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-yellow-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Link da Call
                            </label>
                            <input
                              type="text"
                              value={sessionMeetUrl}
                              onChange={(e) => setSessionMeetUrl(e.target.value)}
                              placeholder="https://meet.google.com/..."
                              className="w-full bg-[#131A2B] border border-[#1F293D] rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-yellow-500"
                            />
                          </div>
                        </div>
                      )}

                      {hasRenewalTags && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Data de Término
                            </label>
                            <input
                              type="text"
                              value={renewalPlanDate}
                              onChange={(e) => setRenewalPlanDate(e.target.value)}
                              placeholder="Ex: 30/09/2026"
                              className="w-full bg-[#131A2B] border border-[#1F293D] rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-yellow-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Dias Restantes
                            </label>
                            <input
                              type="text"
                              value={renewalPlanDays}
                              onChange={(e) => setRenewalPlanDays(e.target.value)}
                              placeholder="Ex: 15"
                              className="w-full bg-[#131A2B] border border-[#1F293D] rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-yellow-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Message Preview / Live Editor */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Prévia da Mensagem (WhatsApp)
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">Variáveis aplicadas automaticamente</span>
                  </div>
                  <div className="p-3.5 bg-[#070A12] border border-emerald-500/20 rounded-xl relative">
                    <div className="bg-[#1F2C34] text-slate-100 p-3 rounded-lg rounded-tl-none max-w-full text-xs font-sans whitespace-pre-line leading-relaxed shadow-md border-l-4 border-emerald-500">
                      {getComputedPreview()}
                    </div>
                  </div>
                </div>

                {/* Custom Edit Option */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Personalizar texto antes de enviar (Opcional):
                  </label>
                  <textarea
                    rows={3}
                    value={customMsg}
                    onChange={(e) => setCustomMsg(e.target.value)}
                    placeholder="Se preencher aqui, este texto exato será enviado em vez do template padrão..."
                    className="w-full bg-[#0A0E1A] border border-[#1F293D] rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-yellow-500"
                  />
                </div>

                {/* Feedback Notification */}
                {whatsAppFeedback && (
                  <div
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
                      whatsAppFeedback.success
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : 'bg-red-500/10 text-red-300 border-red-500/30'
                    }`}
                  >
                    {whatsAppFeedback.success ? <Check size={16} /> : <AlertCircle size={16} />}
                    <span>{whatsAppFeedback.message}</span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-[#1F293D] bg-[#141C30] flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => openWhatsApp(formData.phone, formData.name)}
                  className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-[#0B0F17] hover:bg-[#1E293B] text-slate-400 hover:text-slate-200 border border-[#1F293D] text-xs font-bold transition-colors"
                >
                  Abrir no WhatsApp Web
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setShowWhatsAppModal(false)}
                    className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-semibold"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={handleSendWhatsAppAutomation}
                    disabled={isSendingWhatsApp}
                    className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSendingWhatsApp ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Disparando...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Disparar Mensagem Agora</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(sheetNode, document.body) : null;
}
