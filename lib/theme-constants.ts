export type PaletteId = 'rocket-gold' | 'hyper-emerald' | 'galactic-indigo' | 'rose-luxury';

export interface ColorPalette {
  id: PaletteId;
  name: string;
  subtitle: string;
  mode: 'dark' | 'light';
  requiresLightBg: boolean;
  previewColors: string[];
  tokens: {
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
  };
}

export const COLOR_PALETTES: Record<PaletteId, ColorPalette> = {
  'rocket-gold': {
    id: 'rocket-gold',
    name: 'Rocket Gold (Cyberpunk Amber)',
    subtitle: 'Tema original Obsidian Dark com destaques dourados e alta saturação.',
    mode: 'dark',
    requiresLightBg: false,
    previewColors: ['#EAB308', '#CA8A04', '#0B0F17'],
    tokens: {
      primary: '#EAB308',
      primaryGradient: 'linear-gradient(135deg, #FFE585 0%, #EAB308 50%, #CA8A04 100%)',
      accent: '#F59E0B',
      background: '#0B0F17',
      surface: '#131926',
      surfaceBorder: '#1F293D',
      cardBg: 'rgba(19, 25, 38, 0.85)',
      textPrimary: '#F8FAFC',
      textSecondary: '#94A3B8',
      glow: 'rgba(234, 179, 8, 0.25)',
      badgeBg: 'rgba(234, 179, 8, 0.15)',
      badgeText: '#FDE047',
      badgeBorder: 'rgba(234, 179, 8, 0.35)',
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

export const DEFAULT_PALETTE_ID: PaletteId = 'rocket-gold';
