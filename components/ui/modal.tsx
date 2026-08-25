'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
  closeOnEsc?: boolean;
  closeOnBackdrop?: boolean;
  className?: string;
  bodyClassName?: string;
  hideHeader?: boolean;
  hideCloseButton?: boolean;
}

const SIZE_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
  '2xl': 'max-w-3xl',
  '3xl': 'max-w-4xl',
  '4xl': 'max-w-5xl',
  full: 'max-w-[95vw] sm:max-w-[90vw]',
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  badge,
  children,
  footer,
  size = 'lg',
  closeOnEsc = true,
  closeOnBackdrop = true,
  className = '',
  bodyClassName = '',
  hideHeader = false,
  hideCloseButton = false,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const { isLightMode, activePalette } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const modalNode = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-black/80 backdrop-blur-md modal-backdrop-animate"
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full ${SIZE_CLASSES[size]} rounded-3xl shadow-2xl border transition-all modal-card-animate relative overflow-hidden flex flex-col max-h-[92vh] ${
          isLightMode
            ? 'bg-white text-slate-900 border-slate-200 shadow-slate-900/20'
            : 'bg-[#131926] text-slate-100 border-[#1F293D] shadow-2xl shadow-black'
        } ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top & Bottom Glows */}
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-30"
          style={{ background: activePalette.tokens.primary }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: activePalette.tokens.accent }}
        />

        {/* Modal Header */}
        {!hideHeader && (title || icon || badge) && (
          <div
            className={`p-5 sm:p-6 border-b flex items-start justify-between gap-4 shrink-0 relative z-10 ${
              isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0F17]/90 border-[#1F293D]'
            }`}
          >
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
              {icon && (
                <div
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md transition-transform"
                  style={{
                    backgroundColor: activePalette.tokens.badgeBg,
                    color: activePalette.tokens.primary,
                    border: `1px solid ${activePalette.tokens.badgeBorder}`,
                  }}
                >
                  {icon}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {typeof title === 'string' ? (
                    <h3
                      className={`text-base sm:text-lg font-bold tracking-tight truncate ${
                        isLightMode ? 'text-slate-900' : 'text-slate-100'
                      }`}
                    >
                      {title}
                    </h3>
                  ) : (
                    title
                  )}
                  {badge}
                </div>

                {subtitle && (
                  <p
                    className={`text-xs mt-0.5 leading-relaxed truncate sm:whitespace-normal ${
                      isLightMode ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className={`p-2 rounded-xl border transition-all shrink-0 ${
                  isLightMode
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 border-slate-200'
                    : 'bg-[#0B0F17] hover:bg-[#1F293D] text-slate-400 hover:text-slate-200 border-[#1F293D]'
                }`}
                title="Fechar janela (ESC)"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className={`p-5 sm:p-6 overflow-y-auto flex-1 relative z-10 ${bodyClassName}`}>
          {children}
        </div>

        {/* Modal Optional Footer */}
        {footer && (
          <div
            className={`p-4 sm:p-5 border-t flex items-center justify-end gap-3 shrink-0 relative z-10 ${
              isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0F17]/90 border-[#1F293D]'
            }`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
}
