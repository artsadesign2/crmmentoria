'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Bell,
  UserCheck,
  LogOut,
  Building2,
  CheckCheck,
  Trash2,
  Target,
  Users,
  TrendingUp,
  GraduationCap,
  Calendar,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Info,
  Clock,
  ExternalLink,
  X,
  Shield,
  Key,
  Mail,
  Phone,
  Save,
  Check,
  Sparkles,
  Settings as SettingsIcon,
  Menu,
  Zap,
} from 'lucide-react';
import { DEFAULT_TENANT } from '@/lib/tenant';
import { useNotifications } from '@/lib/notification-context';
import { NotificationSector } from '@/lib/notifications';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { ROLE_HIERARCHIES, UserRole } from '@/lib/permissions';

interface TopbarProps {
  onOpenCommandPalette: () => void;
  onOpenMobileMenu?: () => void;
}

export function Topbar({ onOpenCommandPalette, onOpenMobileMenu }: TopbarProps) {
  const tenant = DEFAULT_TENANT;
  const { currentUser, currentRole, switchRoleSimulation, updateUser } = useAuth();
  const { isLightMode, activePalette } = useTheme();

  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } =
    useNotifications();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedSector, setSelectedSector] = useState<string>('TODOS');

  // Profile Form State
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profileEmail, setProfileEmail] = useState(currentUser.email);
  const [profilePhone, setProfilePhone] = useState(currentUser.phone || '(11) 98888-9999');
  const [profileSaved, setProfileSaved] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProfileName(currentUser.name);
    setProfileEmail(currentUser.email);
    if (currentUser.phone) setProfilePhone(currentUser.phone);
  }, [currentUser]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser(currentUser.id, {
      name: profileName,
      email: profileEmail,
      phone: profilePhone,
    });
    setProfileSaved(true);
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
        return <Target size={14} className="text-blue-400" />;
      case 'mentorados':
        return <Users size={14} className="text-yellow-400" />;
      case 'financial':
        return <TrendingUp size={14} className="text-emerald-400" />;
      case 'academy':
        return <GraduationCap size={14} className="text-purple-400" />;
      case 'events':
        return <Calendar size={14} className="text-indigo-400" />;
      case 'wiki':
        return <BookOpen size={14} className="text-amber-400" />;
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

  return (
    <header
      className={`h-16 sm:h-20 backdrop-blur-xl border-b px-3.5 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors ${
        isLightMode
          ? 'bg-white/85 border-slate-200 text-slate-900'
          : 'bg-[#131926]/85 border-[#1F293D] text-slate-100'
      }`}
    >
      {/* Left: Mobile Hamburger & Tenant Context */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className={`lg:hidden p-2 rounded-xl border transition-colors ${
              isLightMode
                ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                : 'bg-[#0B0F17] hover:bg-[#1F293D] text-slate-300 border-[#1F293D]'
            }`}
            title="Abrir Menu de Navegação"
          >
            <Menu size={20} />
          </button>
        )}

        {/* Organization / Tenant Badge */}
        <div
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-medium max-w-[140px] sm:max-w-none truncate ${
            isLightMode
              ? 'bg-slate-50 text-slate-700 border-slate-200'
              : 'bg-[#1F293D]/60 text-slate-300 border-[#1F293D]'
          }`}
        >
          <Building2 size={14} style={{ color: activePalette.tokens.primary }} className="shrink-0" />
          <span className="truncate hidden xs:inline">{tenant.name}</span>
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

      {/* Right: Actions, Global Search & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border transition-all text-xs w-9 sm:w-60 md:w-64 justify-center sm:justify-between group shadow-inner ${
            isLightMode
              ? 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300'
              : 'bg-[#0B0F17]/80 border-[#1F293D] text-slate-400 hover:text-slate-200 hover:border-slate-600'
          }`}
          title="Buscar no ecossistema (Ctrl + K)"
        >
          <div className="flex items-center gap-2">
            <Search
              size={14}
              style={{ color: activePalette.tokens.primary }}
              className="group-hover:scale-110 transition-transform shrink-0"
            />
            <span className="hidden sm:inline">Buscar no ecossistema...</span>
          </div>
          <kbd
            className={`hidden sm:inline px-1.5 py-0.5 rounded text-[10px] font-mono border ${
              isLightMode
                ? 'bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-[#1F293D] text-slate-300 border-slate-700'
            }`}
          >
            Ctrl K
          </kbd>
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl border transition-all flex items-center justify-center ${
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
            <Bell size={17} />
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
                    <Bell size={16} />
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
                      <CheckCheck size={16} />
                    </button>
                  )}
                  <button
                    onClick={clearAll}
                    className={`p-1.5 rounded-lg hover:text-red-400 transition-colors ${
                      isLightMode ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-[#1F293D] text-slate-400'
                    }`}
                    title="Limpar todas as notificações"
                  >
                    <Trash2 size={15} />
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
                        <Clock size={11} />
                        <span>{notif.createdAt}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notif.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                          title="Remover notificação"
                        >
                          <X size={12} />
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
                        <ExternalLink size={11} />
                      </Link>

                      {!notif.read && (
                        <span className="text-[10px] text-slate-500 font-semibold">Clique para marcar lida</span>
                      )}
                    </div>
                  </div>
                ))}

                {filteredNotifications.length === 0 && (
                  <div className="p-8 text-center space-y-2 text-slate-500">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-400 opacity-60" />
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
                <span>Rocket Club Smart Notifications</span>
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
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold border transition-all"
            style={{
              backgroundColor: activePalette.tokens.badgeBg,
              color: activePalette.tokens.primary,
              borderColor: activePalette.tokens.badgeBorder,
            }}
          >
            <UserCheck size={14} />
            <span className="hidden sm:inline">{currentUser.name.split(' ')[0]}</span>
            <span className="px-1 py-0.2 rounded text-[9px] font-black uppercase" style={{ backgroundColor: roleInfo.color + '30', color: roleInfo.color }}>
              {currentRole}
            </span>
          </button>

          <a
            href="/login"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors"
            title="Sair da Conta"
          >
            <LogOut size={15} />
          </a>
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
        icon={<UserCheck size={20} />}
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
              <CheckCircle2 size={16} />
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
                    <Mail size={14} className="absolute left-3 top-3 text-slate-500" />
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
                    <Phone size={14} className="absolute left-3 top-3 text-slate-500" />
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
                <SettingsIcon size={14} style={{ color: activePalette.tokens.primary }} />
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
                  <Save size={14} />
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
