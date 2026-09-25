'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Smartphone,
  Laptop,
} from 'lucide-react';

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CalendarSyncModal({ isOpen, onClose }: CalendarSyncModalProps) {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/calendar/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setSettings(data.settings);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRegenerateToken = async () => {
    if (!confirm('Deseja gerar um novo link de calendário? O link anterior deixará de funcionar.')) return;
    setRegenerating(true);
    try {
      const res = await fetch('/api/calendar/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate_token' }),
      });
      const data = await res.json();
      if (data.ok) setSettings(data.settings);
    } catch (err) {
      console.error(err);
    } finally {
      setRegenerating(false);
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
            className="w-full max-w-xl bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#1E293B]/40">
              <div className="flex items-center space-x-2">
                <Calendar size={18} className="text-yellow-400" />
                <h3 className="text-sm font-bold text-white">Sincronização com Google Agenda & iCal</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-6">
              <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center space-x-2 text-yellow-400 text-xs font-bold">
                  <Sparkles size={14} />
                  <span>Sincronização Automática em Tempo Real (100% Gratuita)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ao assinar este link, todas as tarefas com data limite criadas no Rocket Club aparecerão instantaneamente na sua agenda e da sua equipe (Google Calendar, celular, iPhone, Outlook).
                </p>
              </div>

              {/* Caixa do Link */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400">
                  Seu Link Seguro de Calendário (iCal / WebCal)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={settings?.feedUrl || 'Carregando link...'}
                    className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 font-mono focus:outline-none select-all"
                  />
                  <button
                    onClick={() => handleCopyUrl(settings?.feedUrl)}
                    className="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors shrink-0"
                  >
                    {copied ? <Check size={14} className="text-emerald-950" /> : <Copy size={14} />}
                    <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Passo a Passo para Google Agenda */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Laptop size={14} className="text-yellow-400" />
                  <span>Como Adicionar no Google Agenda (Passo a Passo de 30 segundos):</span>
                </h4>
                <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <li>
                    Acesse o seu <a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="text-yellow-400 hover:underline font-semibold">Google Calendar</a> no computador.
                  </li>
                  <li>
                    Na barra lateral esquerda, ao lado de <strong>"Outras agendas"</strong>, clique no botão <strong>"+"</strong>.
                  </li>
                  <li>
                    Selecione a opção <strong>"Do URL"</strong> (From URL).
                  </li>
                  <li>
                    Cole o link copiado acima no campo e clique em <strong>"Adicionar agenda"</strong>.
                  </li>
                  <li>
                    Pronto! Todas as tarefas e prazos do Rocket Club estarão sincronizados na sua agenda.
                  </li>
                </ol>
              </div>

              {/* Botão de Regenerar Token */}
              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={handleRegenerateToken}
                  disabled={regenerating}
                  className="text-slate-500 hover:text-red-400 flex items-center space-x-1.5 transition-colors"
                >
                  <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
                  <span>Gerar novo link seguro</span>
                </button>

                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
