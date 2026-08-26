import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { COLOR_PALETTES, PaletteId, DEFAULT_PALETTE_ID } from '@/lib/theme-constants';
import { ThemeProvider } from '@/lib/theme-context';
import { AuthProvider } from '@/lib/auth-context';
import { ToastProvider } from '@/lib/toast-context';
import { ToastContainer } from '@/components/ui/toast-container';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'Rocket Club — SaaS Multi-Tenant para Mentorias & Comunidades',
  description: 'Plataforma All-in-One para gestão de membros, vendas, cursos, wiki e eventos.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionUser = cookieStore.get('rocket_session')?.value || null;
  const themeCookie = (cookieStore.get('rocket_theme')?.value as PaletteId) || null;

  const initialPaletteId: PaletteId =
    themeCookie && COLOR_PALETTES[themeCookie] ? themeCookie : DEFAULT_PALETTE_ID;
  const activePalette = COLOR_PALETTES[initialPaletteId] || COLOR_PALETTES[DEFAULT_PALETTE_ID];
  const isLight = activePalette.mode === 'light';

  return (
    <html
      lang="pt-BR"
      className={`${jakarta.variable} ${isLight ? 'theme-light' : 'dark theme-dark'}`}
      style={{
        backgroundColor: activePalette.tokens.background,
        color: activePalette.tokens.textPrimary,
        ['--primary-color' as any]: activePalette.tokens.primary,
        ['--primary-glow' as any]: activePalette.tokens.glow,
        ['--primary-gradient' as any]: activePalette.tokens.primaryGradient,
        ['--accent-color' as any]: activePalette.tokens.accent,
        ['--theme-bg' as any]: activePalette.tokens.background,
        ['--theme-surface' as any]: activePalette.tokens.surface,
        ['--theme-border' as any]: activePalette.tokens.surfaceBorder,
        ['--theme-text-primary' as any]: activePalette.tokens.textPrimary,
        ['--theme-text-secondary' as any]: activePalette.tokens.textSecondary,
        ['--theme-badge-bg' as any]: activePalette.tokens.badgeBg,
        ['--theme-badge-text' as any]: activePalette.tokens.badgeText,
        ['--theme-badge-border' as any]: activePalette.tokens.badgeBorder,
      }}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var sessionMatch = document.cookie.match(/(?:^|;\\s*)rocket_session=([^;]+)/);
                  var user = sessionMatch ? decodeURIComponent(sessionMatch[1]).trim() : (localStorage.getItem('rocket_active_user_id') || '').trim();
                  var themeMatch = document.cookie.match(/(?:^|;\\s*)rocket_theme=([^;]+)/);
                  var paletteId = (themeMatch && decodeURIComponent(themeMatch[1]).trim()) || (user && localStorage.getItem('rocket_club_color_palette_' + user)) || localStorage.getItem('rocket_club_color_palette') || 'rocket-gold';
                  
                  var palettes = {
                    'rocket-gold': { primary: '#EAB308', glow: 'rgba(234, 179, 8, 0.25)', gradient: 'linear-gradient(135deg, #FFE585 0%, #EAB308 50%, #CA8A04 100%)', accent: '#F59E0B', bg: '#0B0F17', surface: '#131926', border: '#1F293D', textPrimary: '#F8FAFC', textSecondary: '#94A3B8', badgeBg: 'rgba(234, 179, 8, 0.15)', badgeText: '#FDE047', badgeBorder: 'rgba(234, 179, 8, 0.35)', mode: 'dark' },
                    'hyper-emerald': { primary: '#10B981', glow: 'rgba(16, 185, 129, 0.25)', gradient: 'linear-gradient(135deg, #A7F3D0 0%, #10B981 50%, #047857 100%)', accent: '#34D399', bg: '#061410', surface: '#0A241C', border: '#144033', textPrimary: '#F0FDF4', textSecondary: '#86EFAC', badgeBg: 'rgba(16, 185, 129, 0.15)', badgeText: '#6EE7B7', badgeBorder: 'rgba(16, 185, 129, 0.35)', mode: 'dark' },
                    'galactic-indigo': { primary: '#6366F1', glow: 'rgba(99, 102, 241, 0.25)', gradient: 'linear-gradient(135deg, #C7D2FE 0%, #6366F1 50%, #4338CA 100%)', accent: '#8B5CF6', bg: '#0B0F22', surface: '#131A38', border: '#1F2C5C', textPrimary: '#F8FAFC', textSecondary: '#A5B4FC', badgeBg: 'rgba(99, 102, 241, 0.15)', badgeText: '#A5B4FC', badgeBorder: 'rgba(99, 102, 241, 0.35)', mode: 'dark' },
                    'rose-luxury': { primary: '#E11D48', glow: 'rgba(225, 29, 72, 0.2)', gradient: 'linear-gradient(135deg, #FECDD3 0%, #E11D48 50%, #9F1239 100%)', accent: '#F43F5E', bg: '#F8FAFC', surface: '#FFFFFF', border: '#E2E8F0', textPrimary: '#0F172A', textSecondary: '#475569', badgeBg: 'rgba(225, 29, 72, 0.12)', badgeText: '#BE123C', badgeBorder: 'rgba(225, 29, 72, 0.3)', mode: 'light' }
                  };
                  var active = palettes[paletteId] || palettes['rocket-gold'];
                  var root = document.documentElement;
                  root.style.setProperty('--primary-color', active.primary);
                  root.style.setProperty('--primary-glow', active.glow);
                  root.style.setProperty('--primary-gradient', active.gradient);
                  root.style.setProperty('--accent-color', active.accent);
                  root.style.setProperty('--theme-bg', active.bg);
                  root.style.setProperty('--theme-surface', active.surface);
                  root.style.setProperty('--theme-border', active.border);
                  root.style.setProperty('--theme-text-primary', active.textPrimary);
                  root.style.setProperty('--theme-text-secondary', active.textSecondary);
                  root.style.setProperty('--theme-badge-bg', active.badgeBg);
                  root.style.setProperty('--theme-badge-text', active.badgeText);
                  root.style.setProperty('--theme-badge-border', active.badgeBorder);
                  if (active.mode === 'light') {
                    root.classList.add('theme-light');
                    root.classList.remove('dark', 'theme-dark');
                  } else {
                    root.classList.add('dark', 'theme-dark');
                    root.classList.remove('theme-light');
                  }
                  root.style.backgroundColor = active.bg;
                  root.style.color = active.textPrimary;
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased selection:bg-[var(--primary-color)]/30 selection:text-[var(--primary-color)]">
        <ThemeProvider initialPaletteId={initialPaletteId}>
          <AuthProvider initialUserId={sessionUser}>
            <ToastProvider>
              {children}
              <ToastContainer />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
