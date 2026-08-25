'use client';

import React from 'react';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { Modal } from './modal';
import { useTheme } from '@/lib/theme-context';

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
  const { isLightMode } = useTheme();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size="sm"
      hideHeader
      className="border-red-500/30"
    >
      <div className="text-center space-y-4 pt-2">
        {/* Animated Trash / Warning Icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-500 flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
          <Trash2 size={28} className="animate-pulse text-red-500" />
        </div>

        <div className="space-y-1.5">
          <h3 className={`text-lg font-black tracking-tight ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
            {title}
          </h3>
          <p className={`text-xs leading-relaxed px-2 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
            {description || (
              <>
                Tem certeza que deseja excluir{' '}
                {itemName ? (
                  <strong className={isLightMode ? 'text-slate-900 font-bold' : 'text-slate-100 font-bold'}>
                    "{itemName}"
                  </strong>
                ) : (
                  'este registro'
                )}
                ? Esta ação é irreversível e removerá os dados permanentemente.
              </>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-50 ${
              isLightMode
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                : 'bg-[#0B0F17] hover:bg-[#1F293D] text-slate-300 border-[#1F293D]'
            }`}
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
      </div>
    </Modal>
  );
}
