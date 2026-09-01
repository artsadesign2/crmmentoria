'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Target,
  Users,
  GraduationCap,
  Menu,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Sidebar } from '@/components/sidebar';
import { MobileNav } from '@/components/mobile-nav';
import { MenuToggle } from '@/components/menu-toggle';
import { Topbar } from '@/components/topbar';
import { CommandPalette } from '@/components/command-palette';
import { NotificationProvider } from '@/lib/notification-context';
import { useTheme } from '@/lib/theme-context';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLightMode, activePalette } = useTheme();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <NotificationProvider>
      <div
        className={`min-h-screen flex flex-col antialiased transition-colors duration-300 ${
          isLightMode ? 'bg-[#F8FAFC] text-slate-900' : 'bg-[#0B0F17] text-slate-100'
        }`}
        style={{
          backgroundColor: activePalette.tokens.background,
          color: activePalette.tokens.textPrimary,
        }}
      >
        {/* Barra fixa do desktop */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Gaveta do celular, com entrada e saída próprias */}
        <MobileNav aberto={mobileMenuOpen} onFechar={() => setMobileMenuOpen(false)} />

        {/* Main Content Wrapper - Dynamic Margin on Desktop, 0 Margin on Mobile/Tablet */}
        <div
          className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
            sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
          } ml-0 pb-16 lg:pb-0`}
        >
          {/* Topbar Header */}
          <Topbar
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />

          {/* Main Page Content */}
          <main className="flex-1 p-3.5 sm:p-6 md:p-8 lg:p-10 max-w-[1750px] w-full mx-auto space-y-6 sm:space-y-8 overflow-x-hidden">
            {children}
          </main>
        </div>

        {/*
          Navegação inferior, ao alcance do polegar.

          Ela sai de cena quando a gaveta abre, em vez de disputar espaço com o
          fundo escurecido. Sem isso, os quatro atalhos ficariam clicáveis por
          cima de um modal — e a mesma tela teria duas navegações ativas ao
          mesmo tempo, cada uma cobrindo metade da outra.
        */}
        <motion.div
          className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-2xl border-t px-2 py-1 flex items-center justify-around shadow-2xl safe-area-pb ${
            isLightMode ? 'bg-white/95 border-slate-200' : 'bg-[#131926]/95 border-[#1F293D]'
          }`}
          style={{
            backgroundColor: activePalette.tokens.surface + 'f2',
            borderColor: activePalette.tokens.surfaceBorder,
          }}
          initial={false}
          animate={{ y: mobileMenuOpen ? '110%' : '0%' }}
          transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
        >
          {[
            { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
            { name: 'CRM', href: '/crm', icon: Target },
            { name: 'Mentorados', href: '/mentorados', icon: Users },
            { name: 'Academy', href: '/academy', icon: GraduationCap },
          ].map((nav) => {
            const isActive = pathname === nav.href || pathname.startsWith(nav.href + '/');
            const Icon = nav.icon;

            return (
              <Link
                key={nav.href}
                href={nav.href}
                prefetch={true}
                // 44px de altura mínima: é o alvo do guia da Apple e o mínimo
                // do WCAG 2.5.5. A barra tinha 30px, o que obriga a mirar.
                className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-3 transition-all ${
                  isActive ? 'font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                style={isActive ? { color: activePalette.tokens.primary } : {}}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  size={19}
                  style={isActive ? { color: activePalette.tokens.primary } : {}}
                  className={!isActive ? (isLightMode ? 'text-slate-500' : 'text-slate-400') : ''}
                />
                <span className="text-[10px] tracking-tight">{nav.name}</span>
              </Link>
            );
          })}

          {/* O controle do menu: mesmo botão para abrir e para fechar. */}
          <MenuToggle
            aberto={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((v) => !v)}
            variante="bar"
            rotulo="Menu"
          />
        </motion.div>

        {/* Command Palette Overlay */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
        />
      </div>
    </NotificationProvider>
  );
}
