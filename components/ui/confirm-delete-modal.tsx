'use client';

import React from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  itemName?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function ConfirmDeleteModal({
  isOpen,
  title = 'Confirmar Exclusão',
  itemName,
  description,
  confirmText = 'Excluir Definitivamente',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  isDeleting = false,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md bg-[#131926] border border-red-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative overflow-hidden">
        {/* Ambient glow accent */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Close Button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isDeleting}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
        >
          <X size={18} />
        </button>

        {/* Icon & Heading */}
        <div className="text-center space-y-3 pt-1">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
            <Trash2 size={26} className="text-red-400 animate-pulse" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-100 tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed px-2">
              {description || (
                <>
                  Tem certeza que deseja excluir{' '}
                  {itemName ? <strong className="text-slate-100">"{itemName}"</strong> : 'este registro'}?{' '}
                  Esta ação é irreversível e removerá as informações do ecossistema.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl bg-[#0B0F17] hover:bg-[#1F293D] text-slate-300 text-xs font-semibold border border-[#1F293D] transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-extrabold shadow-lg shadow-red-500/25 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {isDeleting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Excluindo...</span>
              </>
            ) : (
              <>
                <Trash2 size={14} />
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </Card>
    </div>
  );
}
