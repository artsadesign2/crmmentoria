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
} from 'lucide-react';
import { DEFAULT_TENANT } from '@/lib/tenant';
import { useNotifications } from '@/lib/notification-context';
import { NotificationSector } from '@/lib/notifications';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface TopbarProps {
  onOpenCommandPalette: () => void;
  onOpenMobileMenu?: () => void;
}

export function Topbar({ onOpenCommandPalette, onOpenMobileMenu }: TopbarProps) {
  const tenant = DEFAULT_TENANT;
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } =
    useNotifications();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedSector, setSelectedSector] = useState<string>('TODOS');

  // Profile Form State
  const [profileName, setProfileName] = useState('Comandante Master');
  const [profileEmail, setProfileEmail] = useState('master@rocketclub.com');
  const [profilePhone, setProfilePhone] = useState('(11) 98888-9999');
  const [profileSaved, setProfileSaved] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const savedName = localStorage.getItem('rocket_profile_name');
      const savedEmail = localStorage.getItem('rocket_profile_email');
      const savedPhone = localStorage.getItem('rocket_profile_phone');
      if (savedName) setProfileName(savedName);
      if (savedEmail) setProfileEmail(savedEmail);
      if (savedPhone) setProfilePhone(savedPhone);
    } catch (e) {}
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('rocket_profile_name', profileName);
      localStorage.setItem('rocket_profile_email', profileEmail);
      localStorage.setItem('rocket_profile_phone', profilePhone);
    } catch (e) {}
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

  return (
    <header className="h-16 sm:h-20 bg-[#131926]/85 backdrop-blur-xl border-b border-[#1F293D] px-3.5 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Hamburger & Tenant Context */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Mobile Hamburger Button */}
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl bg-[#0B0F17] hover:bg-[#1F293D] text-slate-300 hover:text-yellow-400 border border-[#1F293D] transition-colors"
            title="Abrir Menu de Navegação"
          >
            <Menu size={20} />
          </button>
        )}

        {/* Organization / Tenant Badge */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#1F293D]/60 border border-[#1F293D] text-slate-300 text-xs font-medium max-w-[140px] sm:max-w-none truncate">
          <Building2 size={14} className="text-yellow-400 shrink-0" />
          <span className="truncate hidden xs:inline">{tenant.name}</span>
          <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-[10px] font-bold uppercase shrink-0">
            {tenant.plan}
          </span>
        </div>
      </div>

      {/* Right: Actions, Global Search & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Command Palette Trigger (Responsive) */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-[#0B0F17]/80 border border-[#1F293D] text-slate-400 hover:text-slate-200 hover:border-yellow-500/30 transition-all text-xs w-9 sm:w-60 md:w-64 justify-center sm:justify-between group shadow-inner"
          title="Buscar no ecossistema (Ctrl + K)"
        >
          <div className="flex items-center gap-2">
            <Search size={14} className="text-yellow-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="hidden sm:inline">Buscar no ecossistema...</span>
          </div>
          <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-[#1F293D] text-slate-300 text-[10px] font-mono border border-slate-700">
            Ctrl K
          </kbd>
        </button>

        {/* Notifications Popover Trigger */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl border transition-all flex items-center justify-center ${
              isNotifOpen
                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400 shadow-md shadow-yellow-500/10'
                : 'bg-[#0B0F17]/60 border-[#1F293D] hover:border-yellow-500/30 text-slate-400 hover:text-yellow-400'
            }`}
            title="Central de Notificações"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-400 text-slate-950 text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-md animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel (Responsive) */}
          {isNotifOpen && (
            <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-full mt-2 w-[calc(100vw-16px)] sm:w-[440px] max-w-lg bg-[#131926] border border-[#1F293D] rounded-3xl shadow-2xl overflow-hidden z-50 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] sm:max-h-[580px]">
              {/* Header */}
              <div className="p-4 bg-[#0B0F17] border-b border-[#1F293D] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 flex items-center justify-center">
                    <Bell size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <span>Central de Alertas</span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 text-[10px] font-bold">
                          {unreadCount} novas
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-400">Notificações em tempo real dos setores chave</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="p-1.5 rounded-lg hover:bg-[#1F293D] text-slate-400 hover:text-yellow-400 transition-colors text-xs flex items-center gap-1"
                      title="Marcar todas como lidas"
                    >
                      <CheckCheck size={16} />
                    </button>
                  )}
                  <button
                    onClick={clearAll}
                    className="p-1.5 rounded-lg hover:bg-[#1F293D] text-slate-400 hover:text-red-400 transition-colors"
                    title="Limpar todas as notificações"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Sector Filter Chips */}
              <div className="px-3 py-2 bg-[#0B0F17]/60 border-b border-[#1F293D] flex items-center gap-1.5 overflow-x-auto text-[11px]">
                {['TODOS', 'crm', 'mentorados', 'financial', 'academy', 'events'].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setSelectedSector(sec)}
                    className={`px-2.5 py-1 rounded-xl font-bold transition-all shrink-0 uppercase ${
                      selectedSector === sec
                        ? 'bg-yellow-500 text-slate-950 shadow-sm'
                        : 'bg-[#131926] text-slate-400 hover:bg-[#1F293D] hover:text-slate-200 border border-[#1F293D]'
                    }`}
                  >
                    {sec === 'TODOS' ? 'Todos' : sec}
                  </button>
                ))}
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto divide-y divide-[#1F293D]/60 p-2 space-y-1">
                {filteredNotifications.map((notif) => {
                  return (
                    <div
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={`p-3.5 rounded-2xl transition-all cursor-pointer space-y-2 relative group ${
                        notif.read
                          ? 'bg-[#0B0F17]/30 hover:bg-[#1F293D]/30 opacity-75'
                          : 'bg-[#172236]/70 border border-yellow-500/20 hover:border-yellow-500/40 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-[#0B0F17] flex items-center justify-center shrink-0 border border-[#1F293D]">
                            {getSectorIcon(notif.sector)}
                          </div>
                          <Badge variant="outline" className="text-[10px] py-0 px-2 uppercase font-bold">
                            {getSectorBadge(notif.sector)}
                          </Badge>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
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
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-yellow-400 transition-colors">
                          {notif.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
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
                          className="text-[11px] font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 hover:underline"
                        >
                          <span>{notif.actionText || 'Acessar módulo'}</span>
                          <ExternalLink size={11} />
                        </Link>

                        {!notif.read && (
                          <span className="text-[10px] text-slate-500 font-semibold">Clique para marcar lida</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredNotifications.length === 0 && (
                  <div className="p-8 text-center space-y-2 text-slate-500">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-400 opacity-60" />
                    <p className="text-xs font-semibold text-slate-300">Tudo em dia!</p>
                    <p className="text-[11px]">Nenhum alerta pendente para o setor selecionado.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 bg-[#0B0F17] border-t border-[#1F293D] flex items-center justify-between text-[11px] text-slate-400">
                <span>Rocket Club Smart Notifications</span>
                <button
                  onClick={() => setIsNotifOpen(false)}
                  className="font-semibold text-slate-300 hover:text-yellow-400 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Action Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 border-l border-[#1F293D]">
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20 transition-all text-xs font-semibold"
          >
            <UserCheck size={14} />
            <span className="hidden sm:inline">Perfil</span>
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

      {/* Interactive Perfil do Comandante Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-xl bg-[#131926] p-5 sm:p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 border-[#1F293D] max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#1F293D]">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-yellow-500 to-amber-300 text-slate-950 font-black text-xl sm:text-2xl flex items-center justify-center shadow-lg shadow-yellow-500/20 shrink-0">
                  {profileName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-100">{profileName}</h2>
                    <Badge variant="default" className="text-[9px] uppercase font-bold">
                      Master Admin
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Shield size={13} className="text-yellow-400" />
                    <span>Plano Enterprise • {tenant.name}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsProfileOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Saved Alert */}
            {profileSaved && (
              <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>Perfil salvo e atualizado com sucesso no navegador!</span>
              </div>
            )}

            {/* Profile Edit Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nome do Comandante / Administrador</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40 font-semibold"
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
                        className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl pl-9 pr-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">WhatsApp de Suporte</label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-3 text-slate-500" />
                      <input
                        type="text"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl pl-9 pr-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Organization & Infrastructure Info Box */}
              <div className="p-4 rounded-2xl bg-[#0B0F17]/80 border border-[#1F293D] space-y-2.5 text-slate-300">
                <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider block">
                  Infraestrutura & Tenant
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#131926] border border-[#1F293D]/60">
                    <span className="text-slate-400">Banco de Dados:</span>
                    <span className="font-bold text-emerald-400">Neon DB (Online)</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#131926] border border-[#1F293D]/60">
                    <span className="text-slate-400">Segurança 2FA:</span>
                    <span className="font-bold text-yellow-400">Ativa</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#1F293D]">
                <Link
                  href="/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0B0F17] hover:bg-[#1F293D] text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <SettingsIcon size={14} className="text-yellow-400" />
                  <span>Configurações do Sistema</span>
                </Link>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsProfileOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-[#0B0F17] hover:bg-[#1F293D] text-slate-300 text-xs font-semibold transition-colors"
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-yellow-500/20 hover:scale-105 transition-all flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    <span>Salvar Perfil</span>
                  </button>
                </div>
              </div>
            </form>
          </Card>
        </div>
      )}
    </header>
  );
}
