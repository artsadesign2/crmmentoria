'use client';

import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Download,
  Copy,
  Check,
  MessageCircle,
  PartyPopper,
  Gift,
  Award,
  Share2,
  QrCode,
  Calendar,
  Building,
  RefreshCw,
  Eye,
  Edit3,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/lib/theme-context';
import { toast } from '@/lib/toast-context';
import { sendEvolutionWhatsAppMessage } from '@/lib/evolution-api';
import { DEFAULT_TENANT } from '@/lib/tenant';

export interface BirthdayMemberData {
  id: string;
  name: string;
  companyName: string;
  avatar?: string;
  birthdate?: string;
  day: number;
  month: number;
  monthName: string;
  monthShort: string;
  phone: string;
  specialty?: string;
}

interface BirthdayCardModalProps {
  member: BirthdayMemberData | null;
  isOpen: boolean;
  onClose: () => void;
  brandName?: string;
}

type CardStyle = 'THEME' | 'GOLD' | 'EMERALD' | 'INDIGO' | 'ROSE';

export function BirthdayCardModal({
  member,
  isOpen,
  onClose,
  brandName = DEFAULT_TENANT.company.tradeName || 'ROCKET CLUB',
}: BirthdayCardModalProps) {
  const { isLightMode, activePalette } = useTheme();
  const cardRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');
  const [selectedStyle, setSelectedStyle] = useState<CardStyle>('THEME');
  const [copiedText, setCopiedText] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  // Editable fields for custom card design
  const [customTitle, setCustomTitle] = useState('FELIZ ANIVERSÁRIO! 🎉');
  const [customSubtitle, setCustomSubtitle] = useState('Desejamos mais um ciclo de conquistas extraordinárias!');
  const [customMessage, setCustomMessage] = useState(
    member
      ? `Parabéns ${member.name}! 🎉 Desejamos a você um novo ciclo de muito sucesso, grandes conquistas e voos ainda mais altos à frente da ${member.companyName}. É um grande orgulho ter você na tripulação do Rocket Club! 🚀✨`
      : ''
  );

  // Update text if member changes
  React.useEffect(() => {
    if (member) {
      setCustomMessage(
        `Parabéns ${member.name}! 🎉 Desejamos a você um novo ciclo de muito sucesso, grandes conquistas e voos ainda mais altos à frente da ${member.companyName}. É um grande orgulho ter você na tripulação do Rocket Club! 🚀✨`
      );
    }
  }, [member]);

  if (!member) return null;

  // Resolve palette tokens based on chosen style
  const getStyleTokens = () => {
    switch (selectedStyle) {
      case 'GOLD':
        return {
          primary: '#EAB308',
          glow: 'rgba(234, 179, 8, 0.35)',
          gradient: 'linear-gradient(135deg, #FFE585 0%, #EAB308 50%, #CA8A04 100%)',
          bg: '#080B12',
          surface: '#0F1422',
          border: 'rgba(234, 179, 8, 0.4)',
          text: '#F8FAFC',
          badgeBg: 'rgba(234, 179, 8, 0.15)',
        };
      case 'EMERALD':
        return {
          primary: '#10B981',
          glow: 'rgba(16, 185, 129, 0.35)',
          gradient: 'linear-gradient(135deg, #A7F3D0 0%, #10B981 50%, #047857 100%)',
          bg: '#040F0C',
          surface: '#081E18',
          border: 'rgba(16, 185, 129, 0.4)',
          text: '#F0FDF4',
          badgeBg: 'rgba(16, 185, 129, 0.15)',
        };
      case 'INDIGO':
        return {
          primary: '#6366F1',
          glow: 'rgba(99, 102, 241, 0.35)',
          gradient: 'linear-gradient(135deg, #C7D2FE 0%, #6366F1 50%, #4338CA 100%)',
          bg: '#080B1A',
          surface: '#101633',
          border: 'rgba(99, 102, 241, 0.4)',
          text: '#F8FAFC',
          badgeBg: 'rgba(99, 102, 241, 0.15)',
        };
      case 'ROSE':
        return {
          primary: '#E11D48',
          glow: 'rgba(225, 29, 72, 0.35)',
          gradient: 'linear-gradient(135deg, #FECDD3 0%, #E11D48 50%, #9F1239 100%)',
          bg: '#140508',
          surface: '#220A10',
          border: 'rgba(225, 29, 72, 0.4)',
          text: '#FFF1F2',
          badgeBg: 'rgba(225, 29, 72, 0.15)',
        };
      case 'THEME':
      default:
        return {
          primary: activePalette.rawTokens.primary,
          glow: activePalette.rawTokens.glow,
          gradient: activePalette.rawTokens.primaryGradient,
          bg: isLightMode ? '#0F172A' : '#0B0F17',
          surface: isLightMode ? '#1E293B' : '#131926',
          border: activePalette.rawTokens.primary + '50',
          text: '#F8FAFC',
          badgeBg: activePalette.rawTokens.badgeBg,
        };
    }
  };

  const styleConfig = getStyleTokens();

  // Download high-resolution PNG using html2canvas
  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);

    try {
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default || html2canvasModule;

      const canvas = await html2canvas(cardRef.current, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: styleConfig.bg,
        logging: false,
      });

      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      const cleanName = member.name.replace(/\s+/g, '-').toLowerCase();
      link.download = `card-aniversario-${cleanName}.png`;
      link.href = image;
      link.click();

      toast.success('Card de Aniversário baixado em alta resolução!');
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      toast.error('Não foi possível gerar a imagem do card.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Direct safe WhatsApp message dispatch
  const handleSendWhatsApp = async () => {
    setIsSendingWhatsApp(true);
    try {
      const res = await sendEvolutionWhatsAppMessage(member.phone, customMessage);
      if (res.success) {
        toast.success(
          res.isTestRedirected
            ? 'Mensagem enviada com sucesso no WhatsApp de teste (11995302672)!'
            : 'Mensagem de parabéns enviada com sucesso!'
        );
        onClose();
      } else {
        toast.warning(res.error || 'Falha ao enviar WhatsApp.');
      }
    } catch (e) {
      toast.error('Erro ao conectar ao serviço de WhatsApp.');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Homenagem de Aniversário • ${member.name}`}
      subtitle={`Dia ${member.day} de ${member.monthName} • ${member.companyName}`}
      icon={<Gift size={20} />}
    >
      <div className="space-y-6 text-left">
        {/* Navigation Mode Tabs */}
        <div className="flex items-center justify-between gap-3 border-b border-[#1F293D] pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#131926]'
              }`}
            >
              <Eye size={14} />
              <span>Card Visual (Flyer Oficial)</span>
            </button>

            <button
              onClick={() => setActiveTab('edit')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'edit'
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#131926]'
              }`}
            >
              <Edit3 size={14} />
              <span>Editar Texto & Disparo</span>
            </button>
          </div>

          {/* Style Swatches */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase hidden sm:inline">Tema:</span>
            {[
              { id: 'THEME', label: 'Atual', color: activePalette.rawTokens.primary },
              { id: 'GOLD', label: 'Gold', color: '#EAB308' },
              { id: 'EMERALD', label: 'Matrix', color: '#10B981' },
              { id: 'INDIGO', label: 'Indigo', color: '#6366F1' },
              { id: 'ROSE', label: 'Rose', color: '#E11D48' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStyle(st.id as CardStyle)}
                className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                  selectedStyle === st.id ? 'scale-125 border-white shadow-lg ring-2 ring-white/30' : 'border-slate-800 opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: st.color }}
                title={`Estilo: ${st.label}`}
              />
            ))}
          </div>
        </div>

        {/* Tab 1: Visual Card Preview Container */}
        {activeTab === 'preview' ? (
          <div className="space-y-4">
            <div className="flex justify-center p-2 sm:p-4 bg-[#05070D] rounded-3xl border border-[#1F293D] overflow-hidden">
              {/* THE OFFICIAL LUXURY BIRTHDAY FLYER TEMPLATE */}
              <div
                ref={cardRef}
                className="w-full max-w-[480px] p-6 sm:p-8 rounded-3xl relative shadow-2xl overflow-hidden text-center space-y-6 select-none border-2"
                style={{
                  backgroundColor: styleConfig.bg,
                  backgroundImage: `radial-gradient(circle at 50% 0%, ${styleConfig.primary}25 0%, transparent 60%), radial-gradient(circle at 50% 100%, ${styleConfig.primary}15 0%, transparent 50%)`,
                  borderColor: styleConfig.border,
                  boxShadow: `0 20px 60px -15px ${styleConfig.glow}`,
                }}
              >
                {/* Ornamental Layered Border Frames */}
                <div
                  className="absolute inset-2.5 border rounded-2xl pointer-events-none"
                  style={{ borderColor: styleConfig.primary + '35' }}
                />
                <div
                  className="absolute inset-4 border border-dashed rounded-xl pointer-events-none opacity-40"
                  style={{ borderColor: styleConfig.primary }}
                />

                {/* Corner Accent Ornaments */}
                <div
                  className="absolute top-4 left-4 w-3 h-3 border-t-2 border-l-2"
                  style={{ borderColor: styleConfig.primary }}
                />
                <div
                  className="absolute top-4 right-4 w-3 h-3 border-t-2 border-r-2"
                  style={{ borderColor: styleConfig.primary }}
                />
                <div
                  className="absolute bottom-4 left-4 w-3 h-3 border-b-2 border-l-2"
                  style={{ borderColor: styleConfig.primary }}
                />
                <div
                  className="absolute bottom-4 right-4 w-3 h-3 border-b-2 border-r-2"
                  style={{ borderColor: styleConfig.primary }}
                />

                {/* Header: Brand & Community */}
                <div className="space-y-1.5 relative z-10 pt-2">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl">🚀</span>
                    <span
                      className="font-black text-sm uppercase tracking-[0.25em]"
                      style={{
                        background: styleConfig.gradient,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {brandName}
                    </span>
                  </div>
                  <span className="text-[9px] uppercase tracking-[0.3em] font-extrabold text-slate-400 block">
                    Comunidade de Líderes & Aceleração
                  </span>
                </div>

                {/* Honoree Avatar Showcase */}
                <div className="relative inline-block mx-auto z-10 my-1">
                  <div
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl p-1.5 shadow-2xl relative mx-auto overflow-hidden border-2"
                    style={{
                      backgroundColor: styleConfig.surface,
                      borderColor: styleConfig.primary,
                      boxShadow: `0 8px 30px ${styleConfig.glow}`,
                    }}
                  >
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-full h-full object-cover rounded-2xl"
                      />
                    ) : (
                      <div
                        className="w-full h-full rounded-2xl flex items-center justify-center font-black text-3xl"
                        style={{
                          backgroundColor: styleConfig.badgeBg,
                          color: styleConfig.primary,
                        }}
                      >
                        {member.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Birthday Crown / Star Badge */}
                  <div
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1 border whitespace-nowrap"
                    style={{
                      backgroundColor: styleConfig.primary,
                      color: '#080B12',
                      borderColor: '#FFFFFF60',
                    }}
                  >
                    <span>⭐</span>
                    <span>Mentorado VIP</span>
                  </div>
                </div>

                {/* Main Headline & Honoree Details */}
                <div className="space-y-2 relative z-10">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-extrabold uppercase tracking-widest"
                    style={{
                      backgroundColor: styleConfig.badgeBg,
                      color: styleConfig.primary,
                      borderColor: styleConfig.primary + '50',
                    }}
                  >
                    <PartyPopper size={12} />
                    <span>{customTitle}</span>
                  </div>

                  <h3
                    className="text-2xl sm:text-3xl font-black tracking-tight leading-tight pt-1"
                    style={{ color: styleConfig.text }}
                  >
                    {member.name}
                  </h3>

                  <div className="space-y-0.5">
                    <p
                      className="text-xs sm:text-sm font-bold uppercase tracking-wide"
                      style={{ color: styleConfig.primary }}
                    >
                      {member.companyName}
                    </p>
                    {member.specialty && (
                      <p className="text-[11px] text-slate-400 font-medium">
                        {member.specialty}
                      </p>
                    )}
                  </div>
                </div>

                {/* Celebratory Message Quote */}
                <div
                  className="p-4 rounded-2xl border relative z-10 text-center"
                  style={{
                    backgroundColor: styleConfig.surface + 'cc',
                    borderColor: styleConfig.primary + '30',
                  }}
                >
                  <p className="text-xs text-slate-200 leading-relaxed font-sans italic">
                    "{customSubtitle}"
                  </p>
                </div>

                {/* Footer Badges & Date */}
                <div className="pt-2 border-t flex items-center justify-between gap-3 text-left relative z-10"
                  style={{ borderColor: styleConfig.primary + '30' }}
                >
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                      Data Comemorativa
                    </span>
                    <span
                      className="text-xs font-black flex items-center gap-1"
                      style={{ color: styleConfig.primary }}
                    >
                      <Calendar size={13} /> {member.day} de {member.monthName}
                    </span>
                  </div>

                  <div className="text-right space-y-0.5">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                      Homenagem Oficial
                    </span>
                    <span className="text-xs font-bold text-slate-200 flex items-center justify-end gap-1">
                      <span>Tripulação {brandName}</span>
                      <span>🚀</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions for Flyer */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCard}
                  disabled={isDownloading}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  style={{
                    backgroundColor: activePalette.rawTokens.primary,
                    color: isLightMode ? '#FFFFFF' : '#0B0F17',
                    boxShadow: `0 4px 15px ${activePalette.rawTokens.glow}`,
                  }}
                >
                  <Download size={15} />
                  <span>{isDownloading ? 'Gerando PNG...' : 'Baixar Card em Alta Resolução (PNG)'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className="px-3 py-2 rounded-xl bg-[#131926] border border-[#1F293D] text-xs font-bold text-slate-300 hover:text-slate-100 flex items-center gap-1.5"
              >
                <Edit3 size={14} />
                <span>Personalizar Textos</span>
              </button>
            </div>
          </div>
        ) : (
          /* Tab 2: Custom Text Editor & Direct WhatsApp Dispatch */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#0B0F17] border border-[#1F293D] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Edit3 size={14} style={{ color: activePalette.rawTokens.primary }} />
                  <span>Campos do Card & Mensagem WhatsApp:</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomTitle('FELIZ ANIVERSÁRIO! 🎉');
                    setCustomSubtitle('Desejamos mais um ciclo de conquistas extraordinárias!');
                    setCustomMessage(
                      `Parabéns ${member.name}! 🎉 Desejamos a você um novo ciclo de muito sucesso, grandes conquistas e voos ainda mais altos à frente da ${member.companyName}. É um grande orgulho ter você na tripulação do Rocket Club! 🚀✨`
                    );
                    toast.info('Textos restaurados para o padrão.');
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
                >
                  <RefreshCw size={12} />
                  <span>Restaurar Padrão</span>
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Título de Destaque no Card:
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full bg-[#131926] border border-[#1F293D] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Frase de Efeito no Card:
                  </label>
                  <input
                    type="text"
                    value={customSubtitle}
                    onChange={(e) => setCustomSubtitle(e.target.value)}
                    className="w-full bg-[#131926] border border-[#1F293D] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Texto Completo para Disparo WhatsApp:
                  </label>
                  <textarea
                    rows={4}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full bg-[#131926] border border-[#1F293D] rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-yellow-500 resize-none leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Actions for WhatsApp Tab */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1F293D]">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(customMessage);
                  setCopiedText(true);
                  setTimeout(() => setCopiedText(false), 2500);
                  toast.success('Mensagem copiada para a área de transferência!');
                }}
                className="px-3.5 py-2.5 rounded-xl bg-[#0B0F17] border border-[#1F293D] text-xs font-bold text-slate-300 hover:text-slate-100 flex items-center gap-1.5"
              >
                {copiedText ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedText ? 'Copiado!' : 'Copiar Texto WhatsApp'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="px-3.5 py-2.5 rounded-xl bg-[#131926] hover:bg-[#1E293B] text-slate-300 text-xs font-bold flex items-center gap-1.5"
                >
                  <Eye size={14} />
                  <span>Ver Card Visual</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  disabled={isSendingWhatsApp}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <MessageCircle size={15} />
                  <span>{isSendingWhatsApp ? 'Enviando...' : 'Enviar no WhatsApp (Modo Seguro)'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
