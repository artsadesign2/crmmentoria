'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // default 8000ms (8s)
  createdAt: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
  success: (title: string, message?: string, duration?: number) => string;
  error: (title: string, message?: string, duration?: number) => string;
  warning: (title: string, message?: string, duration?: number) => string;
  info: (title: string, message?: string, duration?: number) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Global dispatcher for non-hook calls
type ToastEmitter = (type: ToastType, title: string, message?: string, duration?: number) => string;
let globalToastEmitter: ToastEmitter | null = null;

export const toast = {
  success: (title: string, message?: string, duration: number = 8000) => {
    if (globalToastEmitter) return globalToastEmitter('success', title, message, duration);
    console.log('[Toast Success]', title, message);
    return '';
  },
  error: (title: string, message?: string, duration: number = 8000) => {
    if (globalToastEmitter) return globalToastEmitter('error', title, message, duration);
    console.error('[Toast Error]', title, message);
    return '';
  },
  warning: (title: string, message?: string, duration: number = 8000) => {
    if (globalToastEmitter) return globalToastEmitter('warning', title, message, duration);
    console.warn('[Toast Warning]', title, message);
    return '';
  },
  info: (title: string, message?: string, duration: number = 8000) => {
    if (globalToastEmitter) return globalToastEmitter('info', title, message, duration);
    console.info('[Toast Info]', title, message);
    return '';
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration: number = 8000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = {
        id,
        type,
        title,
        message,
        duration,
        createdAt: Date.now(),
      };

      setToasts((prev) => [newToast, ...prev].slice(0, 5)); // Keep maximum 5 active toasts
      return id;
    },
    []
  );

  const success = useCallback(
    (title: string, message?: string, duration: number = 8000) =>
      showToast('success', title, message, duration),
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string, duration: number = 8000) =>
      showToast('error', title, message, duration),
    [showToast]
  );

  const warning = useCallback(
    (title: string, message?: string, duration: number = 8000) =>
      showToast('warning', title, message, duration),
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string, duration: number = 8000) =>
      showToast('info', title, message, duration),
    [showToast]
  );

  // Register global emitter
  useEffect(() => {
    globalToastEmitter = showToast;
    return () => {
      globalToastEmitter = null;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        clearToasts,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
