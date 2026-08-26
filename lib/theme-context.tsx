'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  PaletteId,
  ColorPalette,
  COLOR_PALETTES,
  DEFAULT_PALETTE_ID,
} from './theme-constants';

export type { PaletteId, ColorPalette };
export { COLOR_PALETTES, DEFAULT_PALETTE_ID };

interface ThemeContextType {
  activePaletteId: PaletteId;
  activePalette: ColorPalette;
  isLightMode: boolean;
  setPalette: (paletteId: PaletteId) => void;
  resetToDefault: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSessionUser(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)rocket_session=([^;]+)/);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  try {
    return localStorage.getItem('rocket_active_user_id');
  } catch {}
  return null;
}

function getInitialPalette(fallback?: PaletteId): PaletteId {
  if (typeof window !== 'undefined') {
    try {
      const themeMatch = document.cookie.match(/(?:^|;\s*)rocket_theme=([^;]+)/);
      if (themeMatch && themeMatch[1]) {
        const decoded = decodeURIComponent(themeMatch[1]) as PaletteId;
        if (decoded && COLOR_PALETTES[decoded]) return decoded;
      }

      const user = getSessionUser();
      if (user) {
        const userSaved = localStorage.getItem(`rocket_club_color_palette_${user}`) as PaletteId;
        if (userSaved && COLOR_PALETTES[userSaved]) return userSaved;
      }
      const saved = localStorage.getItem('rocket_club_color_palette') as PaletteId;
      if (saved && COLOR_PALETTES[saved]) return saved;
    } catch (e) {}
  }
  return fallback || DEFAULT_PALETTE_ID;
}

export function ThemeProvider({
  children,
  initialPaletteId,
}: {
  children: React.ReactNode;
  initialPaletteId?: PaletteId;
}) {
  const [activePaletteId, setActivePaletteId] = useState<PaletteId>(() =>
    getInitialPalette(initialPaletteId)
  );

  const activePalette = COLOR_PALETTES[activePaletteId] || COLOR_PALETTES[DEFAULT_PALETTE_ID];
  const isLightMode = activePalette.mode === 'light';

  // Apply CSS Variables and Body classes on change
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const tokens = activePalette.tokens;

    root.style.setProperty('--primary-color', tokens.primary);
    root.style.setProperty('--primary-glow', tokens.glow);
    root.style.setProperty('--primary-gradient', tokens.primaryGradient);
    root.style.setProperty('--accent-color', tokens.accent);
    root.style.setProperty('--theme-bg', tokens.background);
    root.style.setProperty('--theme-surface', tokens.surface);
    root.style.setProperty('--theme-border', tokens.surfaceBorder);
    root.style.setProperty('--theme-text-primary', tokens.textPrimary);
    root.style.setProperty('--theme-text-secondary', tokens.textSecondary);
    root.style.setProperty('--theme-badge-bg', tokens.badgeBg);
    root.style.setProperty('--theme-badge-text', tokens.badgeText);
    root.style.setProperty('--theme-badge-border', tokens.badgeBorder);

    if (isLightMode) {
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-dark');
      root.classList.add('theme-light');
      root.classList.remove('dark', 'theme-dark');
    } else {
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
      root.classList.add('dark', 'theme-dark');
      root.classList.remove('theme-light');
    }

    document.body.style.backgroundColor = tokens.background;
    document.body.style.color = tokens.textPrimary;
  }, [activePaletteId, activePalette, isLightMode]);

  const setPalette = (id: PaletteId) => {
    if (!COLOR_PALETTES[id]) return;
    if (typeof document !== 'undefined') {
      document.cookie = `rocket_theme=${encodeURIComponent(id)}; path=/; max-age=31536000; SameSite=Lax`;
      document.body.classList.add('theme-transitioning');
      setTimeout(() => {
        document.body.classList.remove('theme-transitioning');
      }, 350);
    }
    setActivePaletteId(id);
    try {
      const user = getSessionUser();
      if (user) {
        localStorage.setItem(`rocket_club_color_palette_${user}`, id);
      }
      localStorage.setItem('rocket_club_color_palette', id);
    } catch (e) {}
  };

  const resetToDefault = () => {
    setPalette(DEFAULT_PALETTE_ID);
  };

  return (
    <ThemeContext.Provider
      value={{
        activePaletteId,
        activePalette,
        isLightMode,
        setPalette,
        resetToDefault,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    const fallbackPalette = COLOR_PALETTES[DEFAULT_PALETTE_ID];
    return {
      activePaletteId: DEFAULT_PALETTE_ID as PaletteId,
      activePalette: fallbackPalette,
      isLightMode: false,
      setPalette: () => {},
      resetToDefault: () => {},
    };
  }
  return context;
}
