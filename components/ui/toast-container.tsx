'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast, ToastItem } from '@/lib/toast-context';
import { useTheme } from '@/lib/theme-context';

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const { isLightMode } = useTheme();
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
      badgeBg: isLightMode ? 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      border: isLightMode ? 'border-emerald-300/70' : 'border-emerald-500/30',
      glow: 'rgba(16, 185, 129, 0.2)',
      progressColor: 'bg-emerald-500',
      tag: 'Sucesso',
    },
    error: {
      icon: <AlertCircle size={18} className="text-red-400 shrink-0" />,
      badgeBg: isLightMode ? 'bg-red-500/15 text-red-800 border-red-500/30' : 'bg-red-500/20 text-red-300 border-red-500/40',
      border: isLightMode ? 'border-red-300/70' : 'border-red-500/30',
      glow: 'rgba(239, 68, 68, 0.2)',
      progressColor: 'bg-red-500',
      tag: 'Erro',
    },
    warning: {
      icon: <AlertTriangle size={18} className="text-amber-400 shrink-0" />,
      badgeBg: isLightMode ? 'bg-amber-500/15 text-amber-800 border-amber-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      border: isLightMode ? 'border-amber-300/70' : 'border-amber-500/30',
      glow: 'rgba(245, 158, 11, 0.2)',
      progressColor: 'bg-amber-500',
      tag: 'Atenção',
    },
    info: {
      icon: <Info size={18} className="text-blue-400 shrink-0" />,
      badgeBg: isLightMode ? 'bg-blue-500/15 text-blue-800 border-blue-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      border: isLightMode ? 'border-blue-300/70' : 'border-blue-500/30',
      glow: 'rgba(59, 130, 246, 0.2)',
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
      className={`relative overflow-hidden rounded-2xl border backdrop-blur-2xl backdrop-saturate-150 p-4 transition-all w-full max-w-sm sm:max-w-md ${config.border}`}
      style={{
        backgroundColor: isLightMode ? 'rgba(255, 255, 255, 0.82)' : 'rgba(11, 15, 23, 0.80)',
        boxShadow: isLightMode
          ? `0 20px 45px -10px rgba(0, 0, 0, 0.12), 0 0 25px 0 ${config.glow}, inset 0 1px 1px 0 rgba(255, 255, 255, 0.9)`
          : `0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px 2px ${config.glow}, inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)`,
      }}
    >
      {/* Subtle glass reflection highlight on top */}
      <div
        className="absolute inset-x-0 top-0 h-[1px] pointer-events-none opacity-60"
        style={{
          background: isLightMode
            ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
        }}
      />

      {/* Subtle Ambient Glow Corner */}
      <div
        className="absolute -top-10 -left-10 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-30"
        style={{ backgroundColor: config.glow }}
      />

      <div className="flex items-start gap-3 relative z-10">
        <div className={`p-2 rounded-xl border backdrop-blur-md shadow-sm ${config.badgeBg}`}>
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
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${config.badgeBg}`}>
              {config.tag}
            </span>
          </div>

          {toast.message && (
            <p
              className={`text-[11px] leading-relaxed line-clamp-3 font-medium ${
                isLightMode ? 'text-slate-700' : 'text-slate-300'
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
              ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
              : 'text-slate-400 hover:text-slate-100 hover:bg-white/10'
          }`}
          title="Fechar mensagem (ou aguarde 8s)"
        >
          <X size={14} />
        </button>
      </div>

      {/* 8-second Countdown Progress Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-1 backdrop-blur-sm ${
          isLightMode ? 'bg-slate-200/50' : 'bg-black/40'
        }`}
      >
        <div
          className={`h-full transition-all ease-linear shadow-sm ${config.progressColor}`}
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
