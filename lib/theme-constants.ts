export type PaletteId = 'rocket-gold' | 'hyper-emerald' | 'galactic-indigo' | 'rose-luxury';

export interface PaletteTokens {
  primary: string;
  primaryGradient: string;
  accent: string;
  background: string;
  surface: string;
  surfaceBorder: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  glow: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export interface ColorPalette {
  id: PaletteId;
  name: string;
  subtitle: string;
  mode: 'dark' | 'light';
  requiresLightBg: boolean;
  previewColors: string[];
  rawTokens: PaletteTokens;
  tokens: PaletteTokens;
}

export const RAW_COLOR_PALETTES: Record<PaletteId, {
  id: PaletteId;
  name: string;
  subtitle: string;
  mode: 'dark' | 'light';
  requiresLightBg: boolean;
  previewColors: string[];
  tokens: PaletteTokens;
}> = {
  'rocket-gold': {
    id: 'rocket-gold',
    name: 'Rocket Gold (Champagne Amber)',
    subtitle: 'Dourado nobre e sofisticado com iluminação suave e alto conforto visual.',
    mode: 'dark',
    requiresLightBg: false,
    previewColors: ['#F59E0B', '#D97706', '#0B0F17'],
    tokens: {
      primary: '#F59E0B',
      primaryGradient: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 50%, #D97706 100%)',
      accent: '#D97706',
      background: '#0B0F17',
      surface: '#111726',
      surfaceBorder: '#1E2738',
      cardBg: 'rgba(17, 23, 38, 0.85)',
      textPrimary: '#F8FAFC',
      textSecondary: '#94A3B8',
      glow: 'rgba(245, 158, 11, 0.16)',
      badgeBg: 'rgba(245, 158, 11, 0.10)',
      badgeText: '#FBBF24',
      badgeBorder: 'rgba(245, 158, 11, 0.25)',
    },
  },
  'hyper-emerald': {
    id: 'hyper-emerald',
    name: 'Hyper Emerald (Neon Matrix)',
    subtitle: 'Verde esmeralda futurista com fundo abissal profundo e contraste afiado.',
    mode: 'dark',
    requiresLightBg: false,
    previewColors: ['#10B981', '#059669', '#061410'],
    tokens: {
      primary: '#10B981',
      primaryGradient: 'linear-gradient(135deg, #A7F3D0 0%, #10B981 50%, #047857 100%)',
      accent: '#34D399',
      background: '#061410',
      surface: '#0A241C',
      surfaceBorder: '#144033',
      cardBg: 'rgba(10, 36, 28, 0.85)',
      textPrimary: '#F0FDF4',
      textSecondary: '#86EFAC',
      glow: 'rgba(16, 185, 129, 0.25)',
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      badgeText: '#6EE7B7',
      badgeBorder: 'rgba(16, 185, 129, 0.35)',
    },
  },
  'galactic-indigo': {
    id: 'galactic-indigo',
    name: 'Galactic Indigo (Cosmic Violet)',
    subtitle: 'Azul índigo e violeta cósmico com atmosfera moderna estilo SaaS enterprise.',
    mode: 'dark',
    requiresLightBg: false,
    previewColors: ['#6366F1', '#8B5CF6', '#0B0F22'],
    tokens: {
      primary: '#6366F1',
      primaryGradient: 'linear-gradient(135deg, #C7D2FE 0%, #6366F1 50%, #4338CA 100%)',
      accent: '#8B5CF6',
      background: '#0B0F22',
      surface: '#131A38',
      surfaceBorder: '#1F2C5C',
      cardBg: 'rgba(19, 26, 56, 0.85)',
      textPrimary: '#F8FAFC',
      textSecondary: '#A5B4FC',
      glow: 'rgba(99, 102, 241, 0.25)',
      badgeBg: 'rgba(99, 102, 241, 0.15)',
      badgeText: '#A5B4FC',
      badgeBorder: 'rgba(99, 102, 241, 0.35)',
    },
  },
  'rose-luxury': {
    id: 'rose-luxury',
    name: 'Rose Luxury & Champagne (Light Luxe)',
    subtitle: 'Paleta refinada com fundo claro pérola de alta elegância e contraste perfeito.',
    mode: 'light',
    requiresLightBg: true,
    previewColors: ['#E11D48', '#BE123C', '#F8FAFC'],
    tokens: {
      primary: '#E11D48',
      primaryGradient: 'linear-gradient(135deg, #FECDD3 0%, #E11D48 50%, #9F1239 100%)',
      accent: '#F43F5E',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceBorder: '#E2E8F0',
      cardBg: 'rgba(255, 255, 255, 0.95)',
      textPrimary: '#0F172A',
      textSecondary: '#475569',
      glow: 'rgba(225, 29, 72, 0.2)',
      badgeBg: 'rgba(225, 29, 72, 0.12)',
      badgeText: '#BE123C',
      badgeBorder: 'rgba(225, 29, 72, 0.3)',
    },
  },
};

// CSS-Variable based tokens guarantee 100% SSR Hydration Match
const CSS_VARIABLE_TOKENS: PaletteTokens = {
  primary: 'var(--primary-color)',
  primaryGradient: 'var(--primary-gradient)',
  accent: 'var(--accent-color)',
  background: 'var(--theme-bg)',
  surface: 'var(--theme-surface)',
  surfaceBorder: 'var(--theme-border)',
  cardBg: 'var(--theme-surface)',
  textPrimary: 'var(--theme-text-primary)',
  textSecondary: 'var(--theme-text-secondary)',
  glow: 'var(--primary-glow)',
  badgeBg: 'var(--theme-badge-bg)',
  badgeText: 'var(--theme-badge-text)',
  badgeBorder: 'var(--theme-badge-border)',
};

export const COLOR_PALETTES: Record<PaletteId, ColorPalette> = {
  'rocket-gold': {
    ...RAW_COLOR_PALETTES['rocket-gold'],
    rawTokens: RAW_COLOR_PALETTES['rocket-gold'].tokens,
    tokens: CSS_VARIABLE_TOKENS,
  },
  'hyper-emerald': {
    ...RAW_COLOR_PALETTES['hyper-emerald'],
    rawTokens: RAW_COLOR_PALETTES['hyper-emerald'].tokens,
    tokens: CSS_VARIABLE_TOKENS,
  },
  'galactic-indigo': {
    ...RAW_COLOR_PALETTES['galactic-indigo'],
    rawTokens: RAW_COLOR_PALETTES['galactic-indigo'].tokens,
    tokens: CSS_VARIABLE_TOKENS,
  },
  'rose-luxury': {
    ...RAW_COLOR_PALETTES['rose-luxury'],
    rawTokens: RAW_COLOR_PALETTES['rose-luxury'].tokens,
    tokens: CSS_VARIABLE_TOKENS,
  },
};

export const DEFAULT_PALETTE_ID: PaletteId = 'rocket-gold';
