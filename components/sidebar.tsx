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
  Trophy,
  Award,
  LogOut,
} from 'lucide-react';
import { DEFAULT_TENANT, hasFeature } from '@/lib/tenant';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { ROLE_HIERARCHIES, RolePermissions } from '@/lib/permissions';

export const NAVIGATION_ITEMS: {
  name: string;
  href: string;
  icon: any;
  feature?: string;
  permissionKey: keyof RolePermissions;
}[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    permissionKey: 'viewDashboard',
  },
  {
    name: 'Portal do Mentorado',
    href: '/portal',
    icon: Rocket,
    permissionKey: 'viewMembers',
  },
  {
    name: 'CRM (Novos Leads)',
    href: '/crm',
    icon: Target,
    permissionKey: 'viewCRM',
  },
  {
    name: 'Mentorados',
    href: '/mentorados',
    icon: Users,
    permissionKey: 'viewMembers',
  },
  {
    name: 'Leaderboard & Ranking',
    href: '/leaderboard',
    icon: Trophy,
    permissionKey: 'viewMembers',
  },
  {
    name: 'Certificados Digitais',
    href: '/certificates',
    icon: Award,
    permissionKey: 'viewMembers',
  },
  {
    name: 'Rocket Academy',
    href: '/academy',
    icon: GraduationCap,
    permissionKey: 'viewAcademy',
  },
  {
    name: 'Wiki & Conhecimento',
    href: '/wiki',
    icon: BookOpen,
    permissionKey: 'viewWiki',
  },
  {
    name: 'Financeiro',
    href: '/financial',
    icon: TrendingUp,
    permissionKey: 'viewFinancial',
  },
  {
    name: 'Eventos & Imersões',
    href: '/events',
    icon: Calendar,
    permissionKey: 'viewEvents',
  },
  {
    name: 'Configurações',
    href: '/settings',
    icon: Settings,
    permissionKey: 'viewSettings',
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
  const { currentUser, currentRole, canAccessModule, isMaster } = useAuth();
  const { isLightMode, activePalette } = useTheme();

  const [logoUrl, setLogoUrl] = useState(DEFAULT_TENANT.company?.logoUrl || DEFAULT_TENANT.logoUrl || '');
  const [iconUrl, setIconUrl] = useState(DEFAULT_TENANT.company?.iconUrl || DEFAULT_TENANT.iconUrl || '');
  const [tradeName, setTradeName] = useState(DEFAULT_TENANT.company?.tradeName || DEFAULT_TENANT.name);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const savedLogo = localStorage.getItem('rocket_club_company_logo');
      const savedIcon = localStorage.getItem('rocket_club_company_icon');
      const savedName = localStorage.getItem('rocket_club_company_tradename');
      if (savedLogo) setLogoUrl(savedLogo);
      if (savedIcon) setIconUrl(savedIcon);
      if (savedName) setTradeName(savedName);
    } catch (e) {}
  }, []);

  const roleInfo = ROLE_HIERARCHIES[currentRole] || ROLE_HIERARCHIES['Usuário'];
  const isCollapsedDesktop = collapsed && !mobileOpen;

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

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen transition-all duration-300 flex flex-col justify-between border-r ${
          isLightMode
            ? 'bg-white/95 text-slate-800 border-slate-200'
            : 'bg-[#131926]/95 text-slate-100 border-[#1F293D]'
        } backdrop-blur-2xl ${
          // Mobile drawer state
          mobileOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } ${
          // Desktop collapsed width
          collapsed ? 'lg:w-20' : 'lg:w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="flex flex-col">
          <div
            className={`flex items-center h-20 relative border-b ${
              isLightMode ? 'border-slate-200' : 'border-[#1F293D]'
            } ${isCollapsedDesktop ? 'justify-center px-0' : 'justify-between px-4'}`}
          >
            <Link
              href="/dashboard"
              onClick={onCloseMobile}
              className={`flex items-center gap-3 ${
                isCollapsedDesktop ? 'justify-center w-full' : 'overflow-hidden flex-1'
              }`}
            >
              {isCollapsedDesktop ? (
                // Collapsed state: Perfectly centered icon with zero horizontal clipping
                iconUrl ? (
                  <img
                    src={iconUrl}
                    alt="Ícone Marca"
                    className="w-11 h-11 object-contain rounded-xl shadow-md shrink-0 p-1 bg-slate-900 border"
                    style={{ borderColor: activePalette.tokens.primary + '40' }}
                  />
                ) : (
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shrink-0"
                    style={{
                      backgroundColor: activePalette.tokens.primary,
                      color: isLightMode ? '#FFFFFF' : '#0B0F17',
                      boxShadow: `0 4px 15px ${activePalette.tokens.glow}`,
                    }}
                  >
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
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shrink-0"
                      style={{
                        backgroundColor: activePalette.tokens.primary,
                        color: isLightMode ? '#FFFFFF' : '#0B0F17',
                      }}
                    >
                      🚀
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-base leading-tight tracking-tight theme-gradient-text truncate">
                        {tradeName}
                      </span>
                      <span
                        className="text-[10px] uppercase font-bold tracking-wider"
                        style={{ color: activePalette.tokens.primary }}
                      >
                        SaaS Enterprise
                      </span>
                    </div>
                  </>
                )
              )}
            </Link>

            {/* Desktop Collapse Toggle */}
            {isCollapsedDesktop ? (
              // Edge floating toggle button when collapsed (Smooth, modern and never squishes logo)
              <button
                onClick={onToggleCollapse}
                className={`hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full items-center justify-center transition-all z-50 border shadow-xl hover:scale-110 active:scale-95 ${
                  isLightMode
                    ? 'bg-white border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-400'
                    : 'bg-[#131926] border-[#1F293D] text-slate-300 hover:text-white hover:border-yellow-500/50'
                }`}
                title="Expandir Menu Lateral"
              >
                <ChevronRight size={14} />
              </button>
            ) : (
              // In-header toggle button when expanded
              <button
                onClick={onToggleCollapse}
                className={`hidden lg:flex w-7 h-7 rounded-lg items-center justify-center transition-colors shrink-0 ml-1 ${
                  isLightMode
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                    : 'bg-[#1F293D]/60 hover:bg-[#1F293D] text-slate-400 hover:text-slate-200'
                }`}
                title="Recolher Menu Lateral"
              >
                <ChevronLeft size={16} />
              </button>
            )}

            {/* Mobile Close Drawer Button */}
            <button
              onClick={onCloseMobile}
              className={`lg:hidden p-2 rounded-xl border transition-colors ${
                isLightMode
                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                  : 'bg-[#0B0F17] text-slate-400 hover:text-slate-100 border-[#1F293D]'
              }`}
              title="Fechar Menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Menu Items */}
          <nav
            className={`mt-2 overflow-y-auto max-h-[calc(100vh-160px)] ${
              isCollapsedDesktop
                ? 'px-2 py-3 space-y-2 flex flex-col items-center'
                : 'p-3 space-y-1.5'
            }`}
          >
            {NAVIGATION_ITEMS.map((item) => {
              // Check RBAC permission for this role
              if (!canAccessModule(item.permissionKey) && !isMaster) {
                return null;
              }

              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              if (isCollapsedDesktop) {
                // Collapsed Item: Square Centered Icon Button with Floating Tooltip
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all relative group shrink-0 ${
                      isActive
                        ? 'font-bold shadow-lg'
                        : isLightMode
                        ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-[#1F293D]/60 border border-transparent'
                    }`}
                    style={
                      isActive
                        ? {
                            backgroundColor: activePalette.tokens.badgeBg,
                            color: activePalette.tokens.primary,
                            border: `1px solid ${activePalette.tokens.badgeBorder}`,
                            boxShadow: `0 4px 15px ${activePalette.tokens.glow}`,
                          }
                        : {}
                    }
                  >
                    <Icon
                      size={20}
                      className="transition-transform group-hover:scale-110"
                      style={isActive ? { color: activePalette.tokens.primary } : {}}
                    />

                    {/* Floating Luxury Tooltip on Hover */}
                    <div
                      className={`absolute left-full ml-3.5 px-3 py-1.5 rounded-xl shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200 z-50 whitespace-nowrap flex items-center gap-2 border text-xs font-bold ${
                        isLightMode
                          ? 'bg-slate-900 text-white border-slate-700'
                          : 'bg-[#0D121F] text-slate-100 border-[#1F293D]'
                      }`}
                    >
                      <span>{item.name}</span>
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: activePalette.tokens.primary }}
                      />
                    </div>
                  </Link>
                );
              }

              // Expanded Item: Full Width Button with Icon + Label
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'shadow-md'
                      : isLightMode
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1F293D]/50'
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: activePalette.tokens.badgeBg,
                          color: activePalette.tokens.primary,
                          border: `1px solid ${activePalette.tokens.badgeBorder}`,
                          boxShadow: `0 4px 15px ${activePalette.tokens.glow}`,
                        }
                      : {}
                  }
                >
                  <Icon
                    size={18}
                    className="shrink-0"
                    style={isActive ? { color: activePalette.tokens.primary } : {}}
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer User Pill & Logout */}
        <div className={`p-3 border-t space-y-2 ${isLightMode ? 'border-slate-200' : 'border-[#1F293D]'}`}>
          {isCollapsedDesktop ? (
            // Collapsed Footer: Centered Avatar with Floating User Info Tooltip
            <div className="relative group flex justify-center py-1">
              <div
                className="w-11 h-11 rounded-2xl font-bold flex items-center justify-center text-sm shrink-0 shadow-md cursor-pointer transition-transform group-hover:scale-105"
                style={{
                  backgroundColor: roleInfo.color + '25',
                  color: roleInfo.color,
                  border: `1px solid ${roleInfo.color}60`,
                }}
              >
                {currentUser.name.charAt(0)}
              </div>

              {/* Floating User Info Tooltip on Hover */}
              <div
                className={`absolute left-full ml-3.5 bottom-1 px-3 py-2 rounded-xl shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200 z-50 whitespace-nowrap border ${
                  isLightMode
                    ? 'bg-slate-900 text-white border-slate-700'
                    : 'bg-[#0D121F] text-slate-100 border-[#1F293D]'
                }`}
              >
                <div className="text-xs font-bold">{currentUser.name}</div>
                <div
                  className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1 mt-0.5"
                  style={{ color: roleInfo.color }}
                >
                  <ShieldCheck size={11} /> {currentRole}
                </div>
              </div>
            </div>
          ) : (
            // Expanded Footer: Card with Full User Info & Logout Button
            <div
              className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border ${
                isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0F17]/60 border-[#1F293D]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  className="w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 shadow-md"
                  style={{
                    backgroundColor: roleInfo.color + '25',
                    color: roleInfo.color,
                    border: `1px solid ${roleInfo.color}60`,
                  }}
                >
                  {mounted ? currentUser.name.charAt(0) : 'U'}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className={`text-xs font-semibold truncate ${isLightMode ? 'text-slate-900' : 'text-slate-200'}`}>
                    {mounted ? currentUser.name : 'Usuário'}
                  </span>
                  <span
                    className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1"
                    style={{ color: roleInfo.color }}
                  >
                    <ShieldCheck size={10} /> {mounted ? currentRole : ''}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  document.cookie = 'rocket_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
                  try {
                    localStorage.removeItem('rocket_active_user_id');
                  } catch {}
                  window.location.href = '/login';
                }}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/15 transition-colors shrink-0"
                title="Sair da Conta"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
