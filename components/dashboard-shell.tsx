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
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { CommandPalette } from '@/components/command-palette';
import { NotificationProvider } from '@/lib/notification-context';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col antialiased selection:bg-yellow-500 selection:text-slate-950">
        {/* Main Sidebar (Fixed Desktop + Slide-over Mobile) */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

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

        {/* Mobile Bottom Navigation Bar (Ultra-Convenient Thumb Navigation for Phones) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#131926]/95 backdrop-blur-2xl border-t border-[#1F293D] px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-pb">
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
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                  isActive
                    ? 'text-yellow-400 font-bold scale-105'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-yellow-400' : 'text-slate-400'} />
                <span className="text-[10px] mt-0.5 tracking-tight">{nav.name}</span>
              </Link>
            );
          })}

          {/* More / Menu Drawer Toggle on Bottom Bar */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-400 hover:text-yellow-400 transition-all"
          >
            <Menu size={18} />
            <span className="text-[10px] mt-0.5 tracking-tight">Mais</span>
          </button>
        </div>

        {/* Command Palette Overlay */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
        />
      </div>
    </NotificationProvider>
  );
}
