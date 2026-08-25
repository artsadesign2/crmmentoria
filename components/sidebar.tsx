'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Kanban,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Calendar,
  Settings,
  Rocket,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Target,
  Users,
  X,
} from 'lucide-react';
import { DEFAULT_TENANT, hasFeature } from '@/lib/tenant';

export const NAVIGATION_ITEMS = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    feature: 'dashboard' as const,
  },
  {
    name: 'CRM (Novos Leads)',
    href: '/crm',
    icon: Target,
    feature: 'crm' as any,
  },
  {
    name: 'Mentorados',
    href: '/mentorados',
    icon: Users,
    feature: 'mentorados' as any,
  },
  {
    name: 'Rocket Academy',
    href: '/academy',
    icon: GraduationCap,
    feature: 'academy' as const,
  },
  {
    name: 'Wiki & Conhecimento',
    href: '/wiki',
    icon: BookOpen,
    feature: 'wiki' as const,
  },
  {
    name: 'Financeiro',
    href: '/financial',
    icon: TrendingUp,
    feature: 'financial' as const,
  },
  {
    name: 'Eventos & Imersões',
    href: '/events',
    icon: Calendar,
    feature: 'events' as const,
  },
  {
    name: 'Configurações',
    href: '/settings',
    icon: Settings,
    feature: 'settings' as any,
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const [logoUrl, setLogoUrl] = useState(DEFAULT_TENANT.company?.logoUrl || DEFAULT_TENANT.logoUrl || '');
  const [iconUrl, setIconUrl] = useState(DEFAULT_TENANT.company?.iconUrl || DEFAULT_TENANT.iconUrl || '');
  const [tradeName, setTradeName] = useState(DEFAULT_TENANT.company?.tradeName || DEFAULT_TENANT.name);
  const tenant = DEFAULT_TENANT;

  useEffect(() => {
    try {
      const savedLogo = localStorage.getItem('rocket_club_company_logo');
      const savedIcon = localStorage.getItem('rocket_club_company_icon');
      const savedName = localStorage.getItem('rocket_club_company_tradename');
      if (savedLogo) setLogoUrl(savedLogo);
      if (savedIcon) setIconUrl(savedIcon);
      if (savedName) setTradeName(savedName);
    } catch (e) {}
  }, []);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity duration-300 animate-in fade-in"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar (Desktop fixed + Mobile Slide-over Drawer) */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen bg-[#131926]/95 backdrop-blur-2xl border-r border-[#1F293D] transition-all duration-300 flex flex-col justify-between ${
          // Mobile state
          mobileOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } ${
          // Desktop collapsed width
          collapsed ? 'lg:w-20' : 'lg:w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between h-20 px-4 border-b border-[#1F293D]">
            <Link
              href="/dashboard"
              onClick={onCloseMobile}
              className="flex items-center gap-3 overflow-hidden flex-1"
            >
              {collapsed ? (
                // Collapsed state: Icon Logo
                iconUrl ? (
                  <img
                    src={iconUrl}
                    alt="Ícone Marca"
                    className="w-10 h-10 object-contain rounded-xl shadow shrink-0 p-1 bg-slate-900 border border-yellow-500/20"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-yellow-500/20 shrink-0">
                    🚀
                  </div>
                )
              ) : (
                // Expanded state: Full Logo or Brand Name
                logoUrl ? (
                  <div className="flex items-center gap-2.5 max-w-[170px] overflow-hidden">
                    <img
                      src={logoUrl}
                      alt="Logo Empresa"
                      className="max-h-11 max-w-[160px] object-contain rounded-lg shadow-sm"
                    />
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-yellow-500/20 shrink-0">
                      🚀
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-base leading-tight tracking-tight text-slate-100 gold-gradient-text truncate">
                        {tradeName}
                      </span>
                      <span className="text-[10px] text-yellow-500/80 uppercase font-semibold tracking-wider">
                        Plano Enterprise
                      </span>
                    </div>
                  </>
                )
              )}
            </Link>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex w-7 h-7 rounded-lg bg-[#1F293D]/60 hover:bg-[#1F293D] text-slate-400 hover:text-slate-200 items-center justify-center transition-colors shrink-0 ml-1"
              title={collapsed ? 'Expandir Menu' : 'Recolher Menu'}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            {/* Mobile Close Drawer Button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-2 rounded-xl bg-[#0B0F17] text-slate-400 hover:text-slate-100 border border-[#1F293D] transition-colors"
              title="Fechar Menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Menu Items */}
          <nav className="p-3 space-y-1.5 mt-2 overflow-y-auto max-h-[calc(100vh-160px)]">
            {NAVIGATION_ITEMS.map((item) => {
              if (item.feature !== 'dashboard' && item.feature !== 'settings') {
                if (!hasFeature(tenant, item.feature)) return null;
              }

              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/5 text-yellow-400 border border-yellow-500/30 shadow-md shadow-yellow-500/5 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1F293D]/50'
                  }`}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon size={20} className={isActive ? 'text-yellow-400 shrink-0' : 'text-slate-400 shrink-0'} />
                  {(!collapsed || mobileOpen) && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer User Pill */}
        <div className="p-3 border-t border-[#1F293D]">
          <div
            className={`flex items-center gap-3 p-2.5 rounded-xl bg-[#0B0F17]/60 border border-[#1F293D] ${
              collapsed && !mobileOpen ? 'justify-center' : ''
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-300 text-slate-950 font-bold flex items-center justify-center text-sm shrink-0 shadow-md">
              M
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-200 truncate">Comandante Master</span>
                <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck size={12} /> ENTERPRISE
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
