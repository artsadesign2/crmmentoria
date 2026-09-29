'use client';

import React, { useEffect, useState } from 'react';
import { MdDownload, MdSmartphone, MdClose } from 'react-icons/md';
import { useTheme } from '@/lib/theme-context';

export function PwaInstaller() {
  const { activePalette } = useTheme();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isLocalhost) {
      // No localhost, desregistra Service Workers antigos para garantir carregamento instantâneo
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    } else if (process.env.NODE_ENV === 'production') {
      // Em produção, registra o Service Worker leve
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    }

    // Escutar evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('[PWA] Usuário aceitou a instalação do aplicativo');
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  if (!showInstallBanner) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm p-4 bg-[#0f172a]/95 backdrop-blur-md border border-yellow-500/40 rounded-2xl shadow-2xl text-slate-100 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 flex items-center justify-center shrink-0">
          <MdSmartphone size={22} />
        </div>
        <div>
          <h4 className="text-xs font-black text-slate-100">Instalar ScaleMentors App</h4>
          <p className="text-[10px] text-slate-400">Acesse suas mentorias e CRM direto na tela inicial</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-extrabold text-xs transition-all shadow-md shadow-yellow-500/20 shrink-0 flex items-center gap-1"
        >
          <MdDownload size={14} />
          <span>Instalar</span>
        </button>
        <button
          onClick={() => setShowInstallBanner(false)}
          className="p-1.5 text-slate-400 hover:text-slate-200"
          title="Fechar"
        >
          <MdClose size={16} />
        </button>
      </div>
    </div>
  );
}
