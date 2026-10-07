'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTheme } from '@/lib/theme-context';

function NavigationProgressBarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { activePalette } = useTheme();

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const finishTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentUrlRef = useRef(pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ''));

  // Update current URL ref
  useEffect(() => {
    currentUrlRef.current = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
  }, [pathname, searchParams]);

  // Finish navigation when pathname or searchParams change
  useEffect(() => {
    if (isLoading) {
      // Jump to 100%
      setProgress(100);
      if (timerRef.current) clearInterval(timerRef.current);

      finishTimerRef.current = setTimeout(() => {
        setIsLoading(false);
        setVisible(false);
        setTimeout(() => setProgress(0), 300);
      }, 250);
    }

    return () => {
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    };
  }, [pathname, searchParams]);

  // Intercept all internal link clicks across the entire app
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      const targetAttr = target.getAttribute('target');
      const download = target.getAttribute('download');

      // Ignore external, new tab, downloads, or same-page anchors
      if (
        !href ||
        href.startsWith('http') ||
        href.startsWith('//') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#') ||
        targetAttr === '_blank' ||
        download !== null ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey ||
        e.defaultPrevented
      ) {
        return;
      }

      // Check if it's pointing to the exact same page
      const current = currentUrlRef.current;
      if (href === current || href === pathname) {
        return;
      }

      // Start top loading bar immediately
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
      if (timerRef.current) clearInterval(timerRef.current);

      setVisible(true);
      setIsLoading(true);
      setProgress(20);

      // Incrementally simulate progress while page is compiling / loading
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 88) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 88;
          }
          const jump = Math.max(2, Math.floor((90 - prev) * 0.15));
          return prev + jump;
        });
      }, 150);

      // Safety timeout: reset if navigation never finishes after 8s
      setTimeout(() => {
        setIsLoading(false);
        setVisible(false);
        setProgress(0);
        if (timerRef.current) clearInterval(timerRef.current);
      }, 8000);
    };

    document.addEventListener('click', handleClick, { capture: true });

    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
      if (timerRef.current) clearInterval(timerRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    };
  }, [pathname]);

  if (!visible && progress === 0) return null;

  const primaryColor = activePalette?.tokens?.primary || '#EAB308';
  const glowColor = activePalette?.tokens?.glow || 'rgba(234, 179, 8, 0.4)';

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[999999] pointer-events-none transition-opacity duration-300"
      style={{
        opacity: visible ? 1 : 0,
      }}
    >
      {/* Barra de Progresso Singela */}
      <div
        className="h-[2.5px] transition-all ease-out"
        style={{
          width: `${progress}%`,
          backgroundColor: primaryColor,
          boxShadow: `0 0 10px ${primaryColor}, 0 0 4px ${primaryColor}`,
          transitionDuration: progress === 100 ? '200ms' : '180ms',
        }}
      />

      {/* Brilho indicador no ponto principal */}
      <div
        className="absolute top-0 w-20 h-[3px] blur-[2px] transition-all ease-out"
        style={{
          left: `calc(${progress}% - 80px)`,
          background: `linear-gradient(90deg, transparent, ${primaryColor}, #FFFFFF)`,
          opacity: progress > 10 && progress < 100 ? 0.9 : 0,
        }}
      />
    </div>
  );
}

export function NavigationProgressBar() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressBarContent />
    </Suspense>
  );
}
