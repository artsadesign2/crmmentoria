'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  MdSearch,
  MdNotifications,
  MdPerson,
  MdLogout,
  MdBusiness,
  MdDoneAll,
  MdDeleteOutline,
  MdTrackChanges,
  MdPeopleAlt,
  MdTrendingUp,
  MdSchool,
  MdCalendarMonth,
  MdMenuBook,
  MdErrorOutline,
  MdCheckCircle,
  MdInfoOutline,
  MdAccessTime,
  MdOpenInNew,
  MdClose,
  MdShield,
  MdVpnKey,
  MdMailOutline,
  MdPhone,
  MdSave,
  MdCheck,
  MdAutoAwesome,
  MdSettings as SettingsIcon,
  MdMenu,
  MdBolt,
  MdLock,
  MdVisibility,
  MdVisibilityOff,
  MdHowToReg,
  MdRocketLaunch,
} from 'react-icons/md';
import { DEFAULT_TENANT } from '@/lib/tenant';
import { useNotifications } from '@/lib/notification-context';
import { NotificationSector } from '@/lib/notifications';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { MenuToggle } from '@/components/menu-toggle';
import { toast } from '@/lib/toast-context';
import { ROLE_HIERARCHIES, UserRole } from '@/lib/permissions';
import { PasswordStrengthMeter } from '@/components/password-strength-meter';
import { Member, INITIAL_MEMBERS } from '@/lib/mock-data';

interface TopbarProps {
  onOpenCommandPalette: () => void;
  onOpenMobileMenu?: () => void;
}

export function Topbar({ onOpenCommandPalette, onOpenMobileMenu }: TopbarProps) {
  const tenant = DEFAULT_TENANT;
  const { currentUser, currentRole, isMaster, switchRoleSimulation, switchMenteeSimulation, updateUser, logout } = useAuth();
  const { isLightMode, activePalette } = useTheme();

  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } =
    useNotifications();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedSector, setSelectedSector] = useState<string>('TODOS');

  const [membersList, setMembersList] = useState<Member[]>(INITIAL_MEMBERS);
  const [menteeSearchQuery, setMenteeSearchQuery] = useState('');
  const [isSimulatingLoading, setIsSimulatingLoading] = useState(false);

  const [profileName, setProfileName] = useState(currentUser.name);
  const [profileEmail, setProfileEmail] = useState(currentUser.email);
  const [profilePhone, setProfilePhone] = useState(currentUser.phone || '(11) 98888-9999');
  const [profilePassword, setProfilePassword] = useState('');
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [tenantName, setTenantName] = useState(DEFAULT_TENANT.company?.tradeName || DEFAULT_TENANT.name);
  const [mounted, setMounted] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const savedName = localStorage.getItem('rocket_club_company_tradename');
      if (savedName) setTenantName(savedName);
      const cachedMembers = localStorage.getItem('rocket_club_cached_members');
      if (cachedMembers) setMembersList(JSON.parse(cachedMembers));
    } catch (e) {}
  }, []);

  // Lazy load fresh members list only when the profile modal is opened
  useEffect(() => {
    if (!isProfileOpen) return;
    fetch('/api/members')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.members) && data.members.length > 0) {
          setMembersList(data.members);
        }
      })
      .catch(() => {});
  }, [isProfileOpen]);

  useEffect(() => {
    setProfileName(currentUser.name);
    setProfileEmail(currentUser.email);
    if (currentUser.phone) setProfilePhone(currentUser.phone);
  }, [currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updates: Partial<typeof currentUser> = {
      name: profileName,
      email: profileEmail,
      phone: profilePhone,
    };
    if (profilePassword.trim()) {
      updates.password = profilePassword.trim();
    }

    // Só declara sucesso depois que o servidor confirma.
    const result = await updateUser(currentUser.id, updates);
    if (!result.success) {
      toast.error('Erro ao salvar perfil', result.error || 'Não foi possível atualizar seus dados.');
      return;
    }

    setProfilePassword('');
    setShowProfilePassword(false);
    setProfileSaved(true);
    toast.success('Perfil atualizado com sucesso!', 'Suas alterações cadastrais e credenciais foram salvas.');
    setTimeout(() => setProfileSaved(false), 3000);
  };

  // Close notifications dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotifOpen]);

  const filteredNotifications = notifications.filter((n) => {
    if (selectedSector === 'TODOS') return true;
    return n.sector === selectedSector;
  });

  const getSectorIcon = (sector: NotificationSector) => {
    switch (sector) {
      case 'crm':
        return <MdTrackChanges size={15} className="text-blue-400" />;
      case 'mentorados':
        return <MdPeopleAlt size={15} className="text-yellow-400" />;
      case 'financial':
        return <MdTrendingUp size={15} className="text-emerald-400" />;
      case 'academy':
        return <MdSchool size={15} className="text-purple-400" />;
      case 'events':
        return <MdCalendarMonth size={15} className="text-indigo-400" />;
      case 'wiki':
        return <MdMenuBook size={15} className="text-amber-400" />;
    }
  };

  const getSectorBadge = (sector: NotificationSector) => {
    const labels: Record<NotificationSector, string> = {
      crm: 'CRM & Vendas',
      mentorados: 'Mentorados',
      financial: 'Financeiro',
      academy: 'Academy',
      events: 'Eventos',
      wiki: 'Wiki',
    };
    return labels[sector] || sector;
  };

  const roleInfo = ROLE_HIERARCHIES[currentRole] || ROLE_HIERARCHIES['Usuário'];
  const handleLogout = () => {
    // O cookie de sessão é httpOnly: só o servidor consegue limpá-lo.
    void logout();
  };

  return (
    <header
      className={`sticky top-0 z-30 h-16 sm:h-20 px-3 sm:px-6 flex items-center justify-between border-b backdrop-blur-xl transition-colors ${
        isLightMode
          ? 'bg-white/90 border-slate-200 shadow-sm'
          : 'bg-[#0B0F17]/90 border-[#1F293D]'
      }`}
    >
      {/* Left: Mobile Toggle & Brand */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/*
          `lg:hidden`, e não `md:hidden`.

          A barra lateral só ancora em `lg`. Com o botão sumindo em `md`, o
          tablet ficava numa faixa de 768px a 1023px sem barra fixa e sem
          hamburguer no topo — a navegação inteira dependia da barra de baixo.
        */}
        {onOpenMobileMenu && <MenuToggle aberto={false} onClick={onOpenMobileMenu} />}

        {/*
          Escondido no celular.

          Com os controles da direita em 44px, o chip do plano truncava para
          "ENTE" — um rótulo cortado ocupa o mesmo espaço e não informa nada. A
          marca já aparece no cabeçalho da gaveta, que é onde alguém procura
          por ela.
        */}
        <div
          className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold max-w-[160px] sm:max-w-[240px] truncate ${
            isLightMode
              ? 'bg-slate-100 text-slate-700 border-slate-200'
              : 'bg-[#111728] text-slate-300 border-[#1F293D]'
          }`}
        >
          <MdBusiness size={15} style={{ color: activePalette.tokens.primary }} className="shrink-0" />
          <span className="truncate hidden xs:inline">{tenantName}</span>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0"
            style={{
              backgroundColor: activePalette.tokens.badgeBg,
              color: activePalette.tokens.primary,
            }}
          >
            {tenant.plan}
          </span>
        </div>
      </div>

      {/* Right Actions: Command Palette, Mentee Mode, Notifications, User Profile & Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Mentee View Trigger for Master */}
        {isMaster && (
          <button
            onClick={() => switchMenteeSimulation()}
            className={`min-h-[44px] px-3 sm:py-2 sm:min-h-0 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shadow-sm ${
              isLightMode
                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border-amber-500/30'
                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40'
            }`}
            title="Acessar com a Visão do Mentorado para Manutenção"
          >
            <MdRocketLaunch size={15} className="text-amber-400 shrink-0" />
            <span className="hidden md:inline">Visão do Mentorado</span>
          </button>
        )}

        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className={`min-h-[44px] min-w-[44px] justify-center px-3 sm:py-2 sm:min-h-0 sm:min-w-0 sm:justify-start sm:px-4 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all ${
            isLightMode
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200 hover:text-slate-900'
              : 'bg-[#111728] hover:bg-[#1A2234] text-slate-400 border-[#1F293D] hover:text-slate-200'
          }`}
        >
          <MdSearch size={16} style={{ color: activePalette.tokens.primary }} />
          <span className="hidden sm:inline">Buscar no sistema...</span>
          <kbd className={`hidden md:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${isLightMode ? 'bg-slate-200 border-slate-300 text-slate-700' : 'bg-[#0B0F17] border-[#1F293D] text-slate-400'}`}>
            Ctrl+K
          </kbd>
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className={`relative w-11 h-11 sm:w-10 sm:h-10 rounded-xl border transition-all flex items-center justify-center ${
              isNotifOpen
                ? 'shadow-md'
                : isLightMode
                ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                : 'bg-[#0B0F17]/60 border-[#1F293D] text-slate-400 hover:text-slate-200'
            }`}
            style={
              isNotifOpen
                ? {
                    backgroundColor: activePalette.tokens.badgeBg,
                    borderColor: activePalette.tokens.badgeBorder,
                    color: activePalette.tokens.primary,
                  }
                : {}
            }
            title="Central de Notificações"
          >
            <MdNotifications size={18} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full text-slate-950 text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-md animate-pulse"
                style={{ backgroundColor: activePalette.tokens.primary }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isNotifOpen && (
            <div
              className={`fixed sm:absolute right-2 sm:right-0 top-16 sm:top-full mt-2 w-[calc(100vw-16px)] sm:w-[440px] max-w-lg border rounded-3xl shadow-2xl overflow-hidden z-50 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] sm:max-h-[580px] ${
                isLightMode ? 'bg-white border-slate-200' : 'bg-[#131926] border-[#1F293D]'
              }`}
            >
              {/* Header */}
              <div
                className={`p-4 border-b flex items-center justify-between ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0F17] border-[#1F293D]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-bold"
                    style={{
                      backgroundColor: activePalette.tokens.badgeBg,
                      color: activePalette.tokens.primary,
                      border: `1px solid ${activePalette.tokens.badgeBorder}`,
                    }}
                  >
                    <MdNotifications size={18} />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                      <span>Central de Alertas</span>
                      {unreadCount > 0 && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            backgroundColor: activePalette.tokens.badgeBg,
                            color: activePalette.tokens.primary,
                          }}
                        >
                          {unreadCount} novas
                        </span>
                      )}
                    </h3>
                    <p className={`text-[11px] ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      Notificações em tempo real dos setores chave
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors ${
                        isLightMode ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-[#1F293D] text-slate-400'
                      }`}
                      title="Marcar todas como lidas"
                    >
                      <MdDoneAll size={18} />
                    </button>
                  )}
                  <button
                    onClick={clearAll}
                    className={`p-1.5 rounded-lg hover:text-red-400 transition-colors ${
                      isLightMode ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-[#1F293D] text-slate-400'
                    }`}
                    title="Limpar todas as notificações"
                  >
                    <MdDeleteOutline size={17} />
                  </button>
                </div>
              </div>

              {/* Sector Filter Chips */}
              <div
                className={`px-3 py-2 border-b flex items-center gap-1.5 overflow-x-auto text-[11px] ${
                  isLightMode ? 'bg-slate-100/60 border-slate-200' : 'bg-[#0B0F17]/60 border-[#1F293D]'
                }`}
              >
                {['TODOS', 'crm', 'mentorados', 'financial', 'academy', 'events'].map((sec) => {
                  const isSel = selectedSector === sec;
                  return (
                    <button
                      key={sec}
                      onClick={() => setSelectedSector(sec)}
                      className={`px-2.5 py-1 rounded-xl font-bold transition-all shrink-0 uppercase border ${
                        isSel
                          ? 'shadow-sm'
                          : isLightMode
                          ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          : 'bg-[#131926] text-slate-400 hover:bg-[#1F293D] border-[#1F293D]'
                      }`}
                      style={
                        isSel
                          ? {
                              backgroundColor: activePalette.tokens.primary,
                              color: isLightMode ? '#FFFFFF' : '#0B0F17',
                              borderColor: activePalette.tokens.primary,
                            }
                          : {}
                      }
                    >
                      {sec === 'TODOS' ? 'Todos' : sec}
                    </button>
                  );
                })}
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={`p-3.5 rounded-2xl transition-all cursor-pointer space-y-2 relative group border ${
                      notif.read
                        ? isLightMode
                          ? 'bg-slate-50 border-slate-200 opacity-70'
                          : 'bg-[#0B0F17]/30 border-transparent opacity-75'
                        : isLightMode
                        ? 'bg-white border-slate-300 shadow-sm'
                        : 'bg-[#172236]/70 border-slate-700 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                            isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-[#0B0F17] border-[#1F293D]'
                          }`}
                        >
                          {getSectorIcon(notif.sector)}
                        </div>
                        <Badge variant="outline" className="text-[10px] py-0 px-2 uppercase font-bold">
                          {getSectorBadge(notif.sector)}
                        </Badge>
                        {!notif.read && (
                          <span
                            className="w-2 h-2 rounded-full animate-pulse"
                            style={{ backgroundColor: activePalette.tokens.primary }}
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                        <MdAccessTime size={12} />
                        <span>{notif.createdAt}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notif.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                          title="Remover notificação"
                        >
                          <MdClose size={14} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className={`text-xs font-bold ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                        {notif.title}
                      </h4>
                      <p className={`text-[11px] leading-relaxed mt-0.5 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                        {notif.message}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <Link
                        href={notif.link}
                        onClick={() => {
                          markAsRead(notif.id);
                          setIsNotifOpen(false);
                        }}
                        className="text-[11px] font-bold flex items-center gap-1 hover:underline"
                        style={{ color: activePalette.tokens.primary }}
                      >
                        <span>{notif.actionText || 'Acessar módulo'}</span>
                        <MdOpenInNew size={12} />
                      </Link>

                      {!notif.read && (
                        <span className="text-[10px] text-slate-500 font-semibold">Clique para marcar lida</span>
                      )}
                    </div>
                  </div>
                ))}

                {filteredNotifications.length === 0 && (
                  <div className="p-8 text-center space-y-2 text-slate-500">
                    <MdCheckCircle size={32} className="mx-auto text-emerald-400 opacity-60" />
                    <p className={`text-xs font-semibold ${isLightMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      Tudo em dia!
                    </p>
                    <p className="text-[11px]">Nenhum alerta pendente para o setor selecionado.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                className={`p-3 border-t flex items-center justify-between text-[11px] ${
                  isLightMode ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-[#0B0F17] border-[#1F293D] text-slate-400'
                }`}
              >
                <span>ScaleMentors Smart Notifications</span>
                <button
                  onClick={() => setIsNotifOpen(false)}
                  className={`font-semibold hover:underline ${isLightMode ? 'text-slate-800' : 'text-slate-200'}`}
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Action Button */}
        <div className={`flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 border-l ${isLightMode ? 'border-slate-200' : 'border-[#1F293D]'}`}>
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex min-h-[44px] items-center gap-1.5 px-2.5 sm:min-h-0 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold border transition-all"
            style={{
              backgroundColor: activePalette.tokens.badgeBg,
              color: activePalette.tokens.primary,
              borderColor: activePalette.tokens.badgeBorder,
            }}
          >
            <MdPerson size={16} />
            <span className="hidden sm:inline">{mounted ? currentUser.name.split(' ')[0] : 'Usuário'}</span>
            <span className="px-1 py-0.2 rounded text-[9px] font-black uppercase" style={{ backgroundColor: roleInfo.color + '30', color: roleInfo.color }}>
              {mounted ? currentRole : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-11 h-11 sm:w-9 sm:h-9 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors"
            title="Sair da Conta"
          >
            <MdLogout size={16} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: PERFIL DO USUÁRIO & SIMULAÇÃO (PREMIUM STANDARDIZED MODAL)           */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        title={currentUser.name}
        subtitle={`${currentRole} • Plano Enterprise • ${tenant.name}`}
        icon={<MdPerson size={22} />}
        badge={
          <Badge variant="outline" className={roleInfo.badge}>
            Nível {roleInfo.rank} de 5
          </Badge>
        }
        size="lg"
      >
        <div className="space-y-6">
          {/* Profile Saved Alert */}
          {profileSaved && (
            <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <MdCheckCircle size={18} />
              <span>Perfil atualizado com sucesso!</span>
            </div>
          )}

          {/* Role Simulation Switcher in Profile */}
          <div
            className={`p-4 rounded-2xl border space-y-2.5 ${
              isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-[#0B0F17]/80 border-[#1F293D]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isLightMode ? 'text-slate-700' : 'text-yellow-400'}`}>
                ⚡ Testar Nível de Acesso (Simulação)
              </span>
              <span className="text-[10px] text-slate-400">Clique para alternar o modo ativo</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['Master', 'Administrador', 'Editor', 'Cliente', 'Usuário'] as UserRole[]).map((role) => {
                const isCurrent = currentRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => switchRoleSimulation(role)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      isCurrent
                        ? 'shadow-md scale-105'
                        : isLightMode
                        ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        : 'bg-[#131926] text-slate-400 border-[#1F293D] hover:bg-[#1F293D]'
                    }`}
                    style={
                      isCurrent
                        ? {
                            backgroundColor: activePalette.tokens.primary,
                            color: isLightMode ? '#FFFFFF' : '#0B0F17',
                            borderColor: activePalette.tokens.primary,
                          }
                        : {}
                    }
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mentee Impersonation & Maintenance Box (Master Only) */}
          {isMaster && (
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isLightMode ? 'bg-amber-50/70 border-amber-200' : 'bg-amber-950/20 border-amber-500/30'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <MdRocketLaunch size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-300">
                      Visão do Mentorado & Manutenção
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Acesse a experiência exata do aluno ou preste manutenção nas metas e portal
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSimulatingLoading}
                  onClick={async () => {
                    setIsSimulatingLoading(true);
                    await switchMenteeSimulation();
                    setIsSimulatingLoading(false);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center justify-center gap-1.5 shrink-0"
                >
                  <MdVisibility size={15} />
                  <span>Acessar Modo Mentorado</span>
                </button>
              </div>

              {/* Mentee Quick Picker */}
              <div className="space-y-2 pt-2.5 border-t border-amber-500/20">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-300">Ou logar como mentorado específico:</span>
                  <span className="text-[10px] text-amber-400/80 font-bold">{membersList.length} cadastrados</span>
                </div>

                <div className="relative">
                  <MdSearch size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar mentorado por nome ou empresa..."
                    value={menteeSearchQuery}
                    onChange={(e) => setMenteeSearchQuery(e.target.value)}
                    className={`w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border focus:outline-none ${
                      isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                    }`}
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {membersList
                    .filter((m) =>
                      m.name.toLowerCase().includes(menteeSearchQuery.toLowerCase()) ||
                      (m.companyName && m.companyName.toLowerCase().includes(menteeSearchQuery.toLowerCase()))
                    )
                    .slice(0, 8)
                    .map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        disabled={isSimulatingLoading}
                        onClick={async () => {
                          setIsSimulatingLoading(true);
                          await switchMenteeSimulation(m.id);
                          setIsSimulatingLoading(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left border transition-all ${
                          isLightMode
                            ? 'bg-white hover:bg-amber-100/50 border-slate-200 text-slate-800'
                            : 'bg-[#111728] hover:bg-amber-950/40 border-[#1F293D] text-slate-200 hover:border-amber-500/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black flex items-center justify-center shrink-0 border border-amber-500/30 overflow-hidden">
                            {m.avatar || m.coverImage ? (
                              <img src={m.avatar || m.coverImage} alt={m.name} className="w-full h-full object-cover" />
                            ) : (
                              m.name.charAt(0)
                            )}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold truncate text-slate-100">{m.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{m.companyName || m.specialty || 'Mentorado Rocket Club'}</div>
                          </div>
                        </div>
                        <span className="text-[10px] text-amber-300 font-bold px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 shrink-0 ml-2 hover:bg-amber-500 hover:text-slate-950 transition-colors">
                          Logar ➔
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Profile Edit Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nome do Usuário</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className={`w-full border rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none ${
                    isLightMode
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-slate-500'
                      : 'bg-[#0B0F17] border-[#1F293D] text-slate-100 focus:border-yellow-500/40'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">E-mail Principal</label>
                  <div className="relative">
                    <MdMailOutline size={16} className="absolute left-3 top-3 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className={`w-full border rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none ${
                        isLightMode
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">WhatsApp de Contato</label>
                  <div className="relative">
                    <MdPhone size={16} className="absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className={`w-full border rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none ${
                        isLightMode
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Troca de Senha do Perfil */}
              <div className={`pt-3 border-t space-y-2.5 ${isLightMode ? 'border-slate-200' : 'border-[#1F293D]'}`}>
                <div className="flex items-center justify-between">
                  <label className="block font-bold flex items-center gap-1.5" style={{ color: isLightMode ? '#334155' : '#E2E8F0' }}>
                    <MdLock size={16} style={{ color: activePalette.tokens.primary }} />
                    <span>Nova Senha de Acesso</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">
                    (Deixe em branco para manter a atual)
                  </span>
                </div>

                <div className="relative">
                  <input
                    type={showProfilePassword ? 'text' : 'password'}
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                    placeholder="Digite uma nova senha para sua conta..."
                    className={`w-full border rounded-xl pl-3.5 pr-10 py-2.5 focus:outline-none ${
                      isLightMode
                        ? 'bg-white border-slate-300 text-slate-900'
                        : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowProfilePassword(!showProfilePassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition-colors"
                    title={showProfilePassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showProfilePassword ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
                  </button>
                </div>

                {/* Medidor de Força de Senha */}
                {profilePassword && (
                  <PasswordStrengthMeter
                    password={profilePassword}
                    isLightMode={isLightMode}
                    showSuggestions={true}
                  />
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t ${isLightMode ? 'border-slate-200' : 'border-[#1F293D]'}`}>
              <Link
                href="/settings"
                onClick={() => setIsProfileOpen(false)}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  isLightMode
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    : 'bg-[#0B0F17] hover:bg-[#1F293D] text-slate-300 border-[#1F293D]'
                }`}
              >
                <SettingsIcon size={16} style={{ color: activePalette.tokens.primary }} />
                <span>Central de Configurações</span>
              </Link>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(false)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                    isLightMode
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      : 'bg-[#0B0F17] hover:bg-[#1F293D] text-slate-300 border-[#1F293D]'
                  }`}
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-1.5"
                  style={{
                    backgroundColor: activePalette.tokens.primary,
                    color: isLightMode ? '#FFFFFF' : '#0B0F17',
                  }}
                >
                  <MdSave size={16} />
                  <span>Salvar Perfil</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </Modal>
    </header>
  );
}
