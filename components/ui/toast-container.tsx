'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast, ToastItem } from '@/lib/toast-context';
import { useTheme } from '@/lib/theme-context';

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const { isLightMode, activePalette } = useTheme();
  const duration = toast.duration ?? 8000;
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss(toast.id);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [toast.id, duration, onDismiss]);

  const config = {
    success: {
      icon: <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />,
      badgeBg: isLightMode ? 'bg-emerald-50 text-emerald-800' : 'bg-emerald-950/40 text-emerald-300',
      border: isLightMode ? 'border-emerald-200 shadow-emerald-500/10' : 'border-emerald-500/30 shadow-emerald-950/50',
      progressColor: 'bg-emerald-500',
      tag: 'Sucesso',
    },
    error: {
      icon: <AlertCircle size={18} className="text-red-400 shrink-0" />,
      badgeBg: isLightMode ? 'bg-red-50 text-red-800' : 'bg-red-950/40 text-red-300',
      border: isLightMode ? 'border-red-200 shadow-red-500/10' : 'border-red-500/30 shadow-red-950/50',
      progressColor: 'bg-red-500',
      tag: 'Erro',
    },
    warning: {
      icon: <AlertTriangle size={18} className="text-amber-400 shrink-0" />,
      badgeBg: isLightMode ? 'bg-amber-50 text-amber-800' : 'bg-amber-950/40 text-amber-300',
      border: isLightMode ? 'border-amber-200 shadow-amber-500/10' : 'border-amber-500/30 shadow-amber-950/50',
      progressColor: 'bg-amber-500',
      tag: 'Atenção',
    },
    info: {
      icon: <Info size={18} className="text-blue-400 shrink-0" />,
      badgeBg: isLightMode ? 'bg-blue-50 text-blue-800' : 'bg-blue-950/40 text-blue-300',
      border: isLightMode ? 'border-blue-200 shadow-blue-500/10' : 'border-blue-500/30 shadow-blue-950/50',
      progressColor: 'bg-blue-500',
      tag: 'Info',
    },
  }[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl p-4 shadow-2xl transition-all w-full max-w-sm sm:max-w-md ${config.border}`}
      style={{
        backgroundColor: isLightMode ? '#FFFFFF' : '#0E1422',
      }}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl border ${config.badgeBg} ${config.border}`}>
          {config.icon}
        </div>

        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-0.5">
            <h4
              className={`text-xs font-black tracking-tight truncate ${
                isLightMode ? 'text-slate-900' : 'text-slate-100'
              }`}
            >
              {toast.title}
            </h4>
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${config.badgeBg}`}>
              {config.tag}
            </span>
          </div>

          {toast.message && (
            <p
              className={`text-[11px] leading-relaxed line-clamp-3 ${
                isLightMode ? 'text-slate-600' : 'text-slate-300'
              }`}
            >
              {toast.message}
            </p>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
            isLightMode
              ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
              : 'text-slate-400 hover:text-slate-100 hover:bg-[#1A2234]'
          }`}
          title="Fechar mensagem (ou aguarde 8s)"
        >
          <X size={14} />
        </button>
      </div>

      {/* 8-second Countdown Progress Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-1 ${
          isLightMode ? 'bg-slate-100' : 'bg-[#151D2E]'
        }`}
      >
        <div
          className={`h-full transition-all ease-linear ${config.progressColor}`}
          style={{
            width: `${progress}%`,
          }}
        />
      </div>
    </motion.div>
  );
}

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  return (
    <div
      aria-live="assertive"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 pointer-events-none max-w-sm sm:max-w-md w-full px-3 sm:px-0"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastCard toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
