'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  Ticket,
  Plus,
  Clock,
  CheckCircle,
  CheckCircle2,
  Sparkles,
  X,
  Pencil,
  Trash2,
  DollarSign,
  Save,
  Check,
  Filter,
  ExternalLink,
  UserCheck,
  MessageCircle,
  Send,
  Loader2,
  Radio,
  AlertCircle,
  Megaphone,
  Image as ImageIcon,
  Search,
  CheckSquare,
  Square,
  ShieldCheck,
  Briefcase,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { ConfirmDeleteModal } from '@/components/ui/confirm-delete-modal';
import { EventItem, MOCK_EVENTS, INITIAL_MEMBERS, Member, Lead, MOCK_LEADS, LEAD_STAGES } from '@/lib/mock-data';
import { fetchAllMembersFromDb } from '@/lib/neon-db';
import { useNotifications } from '@/lib/notification-context';
import { useTheme } from '@/lib/theme-context';
import { toast } from '@/lib/toast-context';
import {
  sendWhatsAppBroadcastToAll,
  getAllWhatsAppTemplates,
  interpolateWhatsAppTemplate,
  INITIAL_DEFAULT_TEMPLATES,
} from '@/lib/whatsapp-automations';

export default function EventsPage() {
  const { isLightMode, activePalette } = useTheme();
  const [events, setEvents] = useState<EventItem[]>(MOCK_EVENTS);
  const [confirmedEventIds, setConfirmedEventIds] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'UPCOMING' | 'LIVE' | 'FINISHED'>('ALL');
  const [membersList, setMembersList] = useState<Member[]>(INITIAL_MEMBERS);
  const [leadsList, setLeadsList] = useState<Lead[]>(MOCK_LEADS);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [deleteTargetEvent, setDeleteTargetEvent] = useState<EventItem | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const { addNotification } = useNotifications();

  // Create Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('50');
  const [price, setPrice] = useState('0');
  const [status, setStatus] = useState<EventItem['status']>('UPCOMING');
  const [coverImage, setCoverImage] = useState('');
  const [autoBroadcastOnCreate, setAutoBroadcastOnCreate] = useState(true);

  // Edit Form State
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editMaxAttendees, setEditMaxAttendees] = useState('50');
  const [editPrice, setEditPrice] = useState('0');
  const [editStatus, setEditStatus] = useState<EventItem['status']>('UPCOMING');
  const [editCoverImage, setEditCoverImage] = useState('');

  // WhatsApp Broadcast Modal State
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isConfirmBroadcastModalOpen, setIsConfirmBroadcastModalOpen] = useState(false);
  const [broadcastTargetEvent, setBroadcastTargetEvent] = useState<EventItem | null>(null);
  const [audienceType, setAudienceType] = useState<'mentees' | 'leads'>('mentees');
  const [customBroadcastMsg, setCustomBroadcastMsg] = useState('');
  const [broadcastDelayMs, setBroadcastDelayMs] = useState(2000);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [broadcastProgress, setBroadcastProgress] = useState<{
    current: number;
    total: number;
    percent: number;
    currentName: string;
    successCount: number;
    failedCount: number;
    isFinished: boolean;
  } | null>(null);

  // Load confirmed RSVPs, members, and leads on mount
  useEffect(() => {
    try {
      const savedRsvps = localStorage.getItem('rocket_club_confirmed_rsvps');
      if (savedRsvps) setConfirmedEventIds(JSON.parse(savedRsvps));

      const savedEvents = localStorage.getItem('rocket_club_events_list');
      if (savedEvents) setEvents(JSON.parse(savedEvents));

      const savedLeads = localStorage.getItem('rocket_club_crm_leads');
      if (savedLeads) setLeadsList(JSON.parse(savedLeads));
    } catch (e) {}

    fetchAllMembersFromDb().then((dbMembers) => {
      if (dbMembers && dbMembers.length > 0) {
        setMembersList(dbMembers);
      }
    });
  }, []);

  const saveEventsList = (updated: EventItem[]) => {
    setEvents(updated);
    try {
      localStorage.setItem('rocket_club_events_list', JSON.stringify(updated));
    } catch (e) {}
  };

  // ONE-TIME RSVP HANDLER
  const handleConfirmRsvp = (eventId: string) => {
    if (confirmedEventIds.includes(eventId)) return;

    const updatedRsvps = [...confirmedEventIds, eventId];
    setConfirmedEventIds(updatedRsvps);

    try {
      localStorage.setItem('rocket_club_confirmed_rsvps', JSON.stringify(updatedRsvps));
    } catch (e) {}

    const targetEvent = events.find((e) => e.id === eventId);

    const updatedEvents = events.map((e) => {
      if (e.id === eventId) {
        return {
          ...e,
          attendeesCount: Math.min(e.maxAttendees, e.attendeesCount + 1),
        };
      }
      return e;
    });

    saveEventsList(updatedEvents);
    toast.success('Presença confirmada!', `Você garantiu seu lugar no evento "${targetEvent?.title || 'Encontro'}".`);

    addNotification({
      type: 'success',
      title: 'Presença Confirmada em Evento',
      message: `Você garantiu seu lugar no evento "${targetEvent?.title || 'Encontro Oficial'}".`,
      sector: 'events',
      link: '/events',
      actionText: 'Ver Detalhes do Evento',
    });
  };

  const handleCancelRsvp = (eventId: string) => {
    const updatedRsvps = confirmedEventIds.filter((id) => id !== eventId);
    setConfirmedEventIds(updatedRsvps);

    try {
      localStorage.setItem('rocket_club_confirmed_rsvps', JSON.stringify(updatedRsvps));
    } catch (e) {}

    const updatedEvents = events.map((e) => {
      if (e.id === eventId) {
        return {
          ...e,
          attendeesCount: Math.max(0, e.attendeesCount - 1),
        };
      }
      return e;
    });

    saveEventsList(updatedEvents);
    toast.info('Presença cancelada', 'Sua vaga foi liberada.');
  };

  const handleOpenBroadcastModal = (event: EventItem) => {
    setBroadcastTargetEvent(event);
    setBroadcastProgress(null);
    setCustomBroadcastMsg('');
    setAudienceType('mentees'); // Mentorados é SEMPRE o padrão
    setSendToAll(true);
    setSelectedRecipientIds(membersList.map((m) => m.id));
    setSearchQuery('');
    setIsConfirmBroadcastModalOpen(false);
    setIsBroadcastModalOpen(true);
  };

  const handleSwitchAudience = (type: 'mentees' | 'leads') => {
    setAudienceType(type);
    setSendToAll(true);
    if (type === 'mentees') {
      setSelectedRecipientIds(membersList.map((m) => m.id));
    } else {
      setSelectedRecipientIds(leadsList.map((l) => l.id));
    }
  };

  const handleToggleRecipient = (id: string) => {
    if (selectedRecipientIds.includes(id)) {
      setSelectedRecipientIds(selectedRecipientIds.filter((item) => item !== id));
    } else {
      setSelectedRecipientIds([...selectedRecipientIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (audienceType === 'mentees') {
      setSelectedRecipientIds(membersList.map((m) => m.id));
    } else {
      setSelectedRecipientIds(leadsList.map((l) => l.id));
    }
  };

  const handleDeselectAll = () => {
    setSelectedRecipientIds([]);
  };

  // Get standardized recipient objects
  const getActiveRecipientsList = () => {
    if (audienceType === 'mentees') {
      return membersList.map((m) => ({
        id: m.id,
        name: m.name,
        company: m.companyName || 'Mentorado',
        phone: m.phone,
        specialty: m.specialty || 'Mentoria',
        tag: m.status ? `Mentorado ${m.status}` : 'Mentorado',
        tagColor: 'bg-emerald-500/20 text-emerald-300',
      }));
    }
    return leadsList.map((l) => ({
      id: l.id,
      name: l.name,
      company: l.company || 'Lead CRM',
      phone: l.phone,
      specialty: l.specialty || 'Prospect',
      tag: LEAD_STAGES.find((s) => s.id === l.stage)?.title || 'Lead CRM',
      tagColor: 'bg-blue-500/20 text-blue-300',
    }));
  };

  const activeRecipients = getActiveRecipientsList();

  const filteredRecipients = activeRecipients.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.company.toLowerCase().includes(q) ||
      (r.phone && r.phone.includes(q))
    );
  });

  const selectedCount = sendToAll ? activeRecipients.length : selectedRecipientIds.length;

  const handleRequestBroadcast = () => {
    if (selectedCount === 0) {
      setToastMsg(`Selecione ao menos 1 ${audienceType === 'mentees' ? 'mentorado' : 'lead'} para o disparo.`);
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }
    setIsConfirmBroadcastModalOpen(true);
  };

  const handleStartBroadcast = async () => {
    if (!broadcastTargetEvent) return;

    const listToSend = sendToAll
      ? activeRecipients
      : activeRecipients.filter((r) => selectedRecipientIds.includes(r.id));

    if (listToSend.length === 0) {
      setToastMsg('Nenhum destinatário válido selecionado.');
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }

    setIsBroadcasting(true);

    const eventTemplate =
      getAllWhatsAppTemplates().find((t) => t.id === 'event_announcement')?.content ||
      INITIAL_DEFAULT_TEMPLATES.find((t) => t.id === 'event_announcement')?.content ||
      '';

    const messageToUse = customBroadcastMsg.trim() ? customBroadcastMsg : eventTemplate;

    const formattedDate = new Date(broadcastTargetEvent.date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

    const res = await sendWhatsAppBroadcastToAll(
      listToSend,
      messageToUse,
      {
        delayMs: broadcastDelayMs,
        extraVars: {
          eventoTitulo: broadcastTargetEvent.title,
          eventoData: formattedDate,
          eventoLocal: broadcastTargetEvent.location,
        },
        onProgress: (prog) => {
          setBroadcastProgress(prog);
        },
      }
    );

    setIsBroadcasting(false);
    setToastMsg(`Disparo finalizado: ${res.sent} de ${res.total} mensagens entregues com sucesso.`);
    setTimeout(() => setToastMsg(null), 5000);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newEvent: EventItem = {
      id: `ev-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || 'Descrição do encontro executivo.',
      location: location.trim() || 'São Paulo - SP',
      date: date || new Date(Date.now() + 86400000 * 7).toISOString(),
      attendeesCount: 1,
      maxAttendees: parseInt(maxAttendees, 10) || 50,
      price: parseFloat(price) || 0,
      status,
      coverImage: coverImage.trim() || undefined,
    };

    const updated = [newEvent, ...events];
    saveEventsList(updated);

    setTitle('');
    setDescription('');
    setLocation('');
    setDate('');
    setCoverImage('');
    setIsAddModalOpen(false);

    toast.success('Novo evento cadastrado!', `O evento "${newEvent.title}" está disponível na agenda.`);

    if (autoBroadcastOnCreate) {
      handleOpenBroadcastModal(newEvent);
    }
  };

  const handleOpenEditModal = (event: EventItem) => {
    setSelectedEvent(event);
    setEditTitle(event.title);
    setEditDescription(event.description);
    setEditLocation(event.location);
    setEditDate(event.date ? event.date.slice(0, 16) : '');
    setEditMaxAttendees(event.maxAttendees.toString());
    setEditPrice(event.price.toString());
    setEditStatus(event.status);
    setEditCoverImage(event.coverImage || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEventEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    const updated = events.map((ev) => {
      if (ev.id === selectedEvent.id) {
        return {
          ...ev,
          title: editTitle.trim(),
          description: editDescription.trim(),
          location: editLocation.trim(),
          date: editDate ? new Date(editDate).toISOString() : ev.date,
          maxAttendees: parseInt(editMaxAttendees, 10) || 50,
          price: parseFloat(editPrice) || 0,
          status: editStatus,
          coverImage: editCoverImage.trim() || undefined,
        };
      }
      return ev;
    });

    saveEventsList(updated);
    setIsEditModalOpen(false);
    setSelectedEvent(null);
    toast.success('Evento atualizado!', `As alterações de "${editTitle}" foram salvas.`);
  };

  const handleConfirmDeleteEvent = () => {
    if (!deleteTargetEvent) return;

    const updated = events.filter((ev) => ev.id !== deleteTargetEvent.id);
    saveEventsList(updated);
    setDeleteTargetEvent(null);
    setIsEditModalOpen(false);
    setSelectedEvent(null);

    toast.info('Evento removido', 'O evento foi excluído da agenda.');
  };

  const filteredEvents = events.filter((ev) => {
    if (selectedFilter === 'ALL') return true;
    return ev.status === selectedFilter;
  });

  const totalAttendeesAll = events.reduce((acc, ev) => acc + ev.attendeesCount, 0);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1
            className={`text-2xl font-bold tracking-tight ${
              isLightMode ? 'text-slate-900' : 'text-slate-100'
            }`}
          >
            Agenda de Eventos & Imersões
          </h1>
          <p className={`text-sm mt-1 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
            Acompanhe a agenda de imersões presenciais, masterminds e confirmação de presença dos mentorados.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 hover:scale-105"
          style={{
            backgroundColor: activePalette.tokens.primary,
            color: isLightMode ? '#FFFFFF' : '#0B0F17',
          }}
        >
          <Plus size={16} />
          <span>Cadastrar Novo Evento</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-5 flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold"
            style={{
              backgroundColor: `${activePalette.tokens.primary}20`,
              color: activePalette.tokens.primary,
            }}
          >
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total de Eventos</p>
            <h3 className={`text-2xl font-black mt-0.5 ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
              {events.length}
            </h3>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total de Presenças</p>
            <h3 className={`text-2xl font-black mt-0.5 ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
              {totalAttendeesAll}
            </h3>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            <Ticket size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Próxima Imersão</p>
            <h3 className={`text-sm font-black mt-0.5 truncate max-w-[200px] ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
              {events[0]?.title || 'Nenhum agendado'}
            </h3>
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { id: 'ALL', label: 'Todos os Encontros' },
          { id: 'UPCOMING', label: 'Confirmados / Futuros' },
          { id: 'LIVE', label: 'Ao Vivo Agora' },
          { id: 'FINISHED', label: 'Concluídos' },
        ].map((tab) => {
          const isActive = selectedFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => {
          const isConfirmed = confirmedEventIds.includes(event.id);
          const isFull = event.attendeesCount >= event.maxAttendees;

          return (
            <Card
              key={event.id}
              className={`flex flex-col justify-between transition-all group overflow-hidden ${
                isConfirmed
                  ? 'border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                  : 'hover:border-slate-600'
              }`}
            >
              {/* Event Cover Image / Header Banner (Height ~ 190px) */}
              <div className="relative w-full h-48 overflow-hidden bg-gradient-to-br from-slate-900 via-[#111827] to-slate-950 border-b border-[#1F293D]">
                {event.coverImage ? (
                  <img
                    src={event.coverImage}
                    alt={event.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-tr from-[#0F172A] via-[#1E293B] to-[#0A0E1A]">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:16px_16px]" />
                    <Sparkles className="w-10 h-10 text-amber-400/60 mb-1 animate-pulse" />
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                      Rocket Club Exclusive
                    </span>
                  </div>
                )}

                {/* Dark Gradient Overlay for optimal badge contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-transparent to-black/50" />

                {/* Overlaid Badges and Action buttons */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <span
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg backdrop-blur-md pointer-events-auto ${
                      event.status === 'LIVE'
                        ? 'bg-red-500/90 text-white border border-red-400/50 animate-pulse'
                        : event.status === 'UPCOMING'
                        ? 'bg-emerald-500/90 text-white border border-emerald-400/50'
                        : 'bg-slate-800/90 text-slate-200 border border-slate-700/50'
                    }`}
                  >
                    {event.status === 'LIVE' ? '🔴 Ao Vivo' : event.status === 'UPCOMING' ? '📅 Confirmado' : 'Concluído'}
                  </span>

                  <div className="flex items-center gap-1.5 pointer-events-auto">
                    <button
                      onClick={() => handleOpenBroadcastModal(event)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 border border-emerald-300 font-black text-[11px] shadow-lg shadow-emerald-500/20 backdrop-blur-md transition-all hover:scale-105 flex items-center gap-1.5 cursor-pointer"
                      title="Disparar Convite no WhatsApp para Mentorados"
                    >
                      <Megaphone size={12} />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(event)}
                      className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-700 text-white border border-white/20 backdrop-blur-md transition-colors shadow-md cursor-pointer"
                      title="Editar Evento"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Event Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className={`text-base font-bold transition-colors line-clamp-1 ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                    {event.title}
                  </h3>
                  <p className={`text-xs leading-relaxed line-clamp-2 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                    {event.description}
                  </p>
                </div>

                <div className="space-y-2 pt-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Clock size={14} style={{ color: activePalette.tokens.primary }} />
                    <span>
                      {new Date(event.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} style={{ color: activePalette.tokens.primary }} />
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={14} style={{ color: activePalette.tokens.primary }} />
                    <span>
                      {event.attendeesCount} / {event.maxAttendees} confirmados {isFull && '(Lotado)'}
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-4 border-t border-slate-800/40">
                  {isConfirmed ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5">
                        <CheckCircle2 size={15} />
                        <span>Presença Confirmada!</span>
                      </div>
                      <button
                        onClick={() => handleCancelRsvp(event.id)}
                        className="px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-colors"
                        title="Cancelar Presença"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConfirmRsvp(event.id)}
                      disabled={isFull}
                      className="w-full py-2.5 rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50"
                      style={{
                        backgroundColor: activePalette.tokens.primary,
                        color: isLightMode ? '#FFFFFF' : '#0B0F17',
                      }}
                    >
                      <UserCheck size={16} />
                      <span>{isFull ? 'Vagas Esgotadas' : 'Confirmar Minha Presença'}</span>
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Standardized Edit Event Modal */}
      {isEditModalOpen && selectedEvent && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Editar Evento ou Imersão"
          subtitle="Atualize as informações de horário, local, imagem de capa e vagas do encontro"
          icon={<Pencil size={20} />}
          size="lg"
        >
          <form onSubmit={handleSaveEventEdits} className="space-y-4 text-xs">
            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Título do Evento</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={`w-full border rounded-xl px-3.5 py-2.5 font-bold focus:outline-none ${
                    isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className={`w-full border rounded-xl px-3.5 py-2.5 focus:outline-none resize-none ${
                    isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                  }`}
                />
              </div>

              {/* Cover Image URL Field with Preview */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                  <ImageIcon size={13} className="text-amber-400" />
                  <span>URL da Imagem de Capa (Recomendado 1200x600 px)</span>
                </label>
                <input
                  type="url"
                  value={editCoverImage}
                  onChange={(e) => setEditCoverImage(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className={`w-full border rounded-xl px-3.5 py-2.5 focus:outline-none ${
                    isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                  }`}
                />
                {editCoverImage && (
                  <div className="mt-2 relative w-full h-28 rounded-xl overflow-hidden border border-[#1F293D]">
                    <img src={editCoverImage} alt="Prévia da Capa" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Localização / Link</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className={`w-full border rounded-xl px-3.5 py-2.5 focus:outline-none ${
                    isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Data & Horário</label>
                  <input
                    type="datetime-local"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className={`w-full border rounded-xl px-3.5 py-2.5 focus:outline-none ${
                      isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Capacidade (Vagas)</label>
                  <input
                    type="number"
                    value={editMaxAttendees}
                    onChange={(e) => setEditMaxAttendees(e.target.value)}
                    className={`w-full border rounded-xl px-3.5 py-2.5 font-bold focus:outline-none ${
                      isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Preço / Ingresso (R$)</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className={`w-full border rounded-xl px-3.5 py-2.5 focus:outline-none ${
                      isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Status do Evento</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className={`w-full border rounded-xl px-3.5 py-2.5 focus:outline-none ${
                      isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                    }`}
                  >
                    <option value="UPCOMING">Confirmado / Futuro</option>
                    <option value="LIVE">Ao Vivo Agora</option>
                    <option value="FINISHED">Concluído / Encerrado</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800/40">
              <button
                type="button"
                onClick={() => setDeleteTargetEvent(selectedEvent)}
                className="px-3.5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Excluir Evento
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#0B0F17] text-slate-300 font-bold border border-[#1F293D]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold shadow-md"
                  style={{
                    backgroundColor: activePalette.tokens.primary,
                    color: isLightMode ? '#FFFFFF' : '#0B0F17',
                  }}
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Standardized New Event Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Cadastrar Novo Evento ou Imersão"
        subtitle="Agende encontros, hotseats ou workshops exclusivos da mentoria"
        icon={<Sparkles size={20} />}
        size="md"
      >
        <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
          <div className="space-y-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Título do Evento</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Imersão Rocket Mastermind Q4"
                className={`w-full border rounded-xl px-3.5 py-2.5 font-bold focus:outline-none ${
                  isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                }`}
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Descrição</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes e objetivos da imersão..."
                className={`w-full border rounded-xl px-3.5 py-2.5 focus:outline-none resize-none ${
                  isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                }`}
              />
            </div>

            {/* Cover Image URL Field with Preview */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                <ImageIcon size={13} className="text-amber-400" />
                <span>URL da Imagem de Capa (Opcional)</span>
              </label>
              <input
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className={`w-full border rounded-xl px-3.5 py-2.5 focus:outline-none ${
                  isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                }`}
              />
              {coverImage && (
                <div className="mt-2 relative w-full h-24 rounded-xl overflow-hidden border border-[#1F293D]">
                  <img src={coverImage} alt="Prévia da Capa" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Localização / Link</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Hotel Tivoli Mofarrej / Zoom"
                className={`w-full border rounded-xl px-3.5 py-2.5 focus:outline-none ${
                  isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Data & Horário</label>
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full border rounded-xl px-3.5 py-2.5 focus:outline-none ${
                    isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                  }`}
                />
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Capacidade (Vagas)</label>
                <input
                  type="number"
                  value={maxAttendees}
                  onChange={(e) => setMaxAttendees(e.target.value)}
                  placeholder="60"
                  className={`w-full border rounded-xl px-3.5 py-2.5 font-bold focus:outline-none ${
                    isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                  }`}
                />
              </div>
            </div>

            {/* WhatsApp Auto-Broadcast Option */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Megaphone size={16} className="text-emerald-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    Disparo Automático no WhatsApp
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Abrir envio em massa para mentorados após salvar
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoBroadcastOnCreate}
                onChange={(e) => setAutoBroadcastOnCreate(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-[#0B0F17] border-[#1F293D] cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/40">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-[#0B0F17] text-slate-300 font-bold border border-[#1F293D]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-bold text-xs shadow-md hover:scale-105 transition-all"
              style={{
                backgroundColor: activePalette.tokens.primary,
                color: isLightMode ? '#FFFFFF' : '#0B0F17',
              }}
            >
              Publicar Evento
            </button>
          </div>
        </form>
      </Modal>

      {/* Dedicated WhatsApp Event Broadcast Modal */}
      {isBroadcastModalOpen && broadcastTargetEvent && (
        <Modal
          isOpen={isBroadcastModalOpen}
          onClose={() => {
            if (!isBroadcasting) setIsBroadcastModalOpen(false);
          }}
          title="📢 Disparo em Massa - Convite de Evento"
          subtitle={`Envio de mensagens personalizadas no WhatsApp com controle de destinatários`}
          icon={<Megaphone size={20} className="text-emerald-400" />}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Event Summary Card */}
            <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1F293D] flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Evento Selecionado:
                </span>
                <h4 className="text-sm font-extrabold text-slate-100">{broadcastTargetEvent.title}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  📅 {new Date(broadcastTargetEvent.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })} • 📍 {broadcastTargetEvent.location}
                </p>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs px-2.5 py-1 font-bold">
                👥 {selectedCount} Selecionados
              </Badge>
            </div>

            {/* Audience Segment Switcher: Mentorados (Padrão) vs Leads */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Selecione o Público-Alvo do Disparo:
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#0A0E1A] rounded-xl border border-[#1F293D]">
                <button
                  type="button"
                  onClick={() => handleSwitchAudience('mentees')}
                  disabled={isBroadcasting}
                  className={`py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    audienceType === 'mentees'
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-400 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#131A2B]'
                  }`}
                >
                  <Users size={14} />
                  <span>🎯 Mentorados Rocket Club ({membersList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchAudience('leads')}
                  disabled={isBroadcasting}
                  className={`py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    audienceType === 'leads'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#131A2B]'
                  }`}
                >
                  <Briefcase size={14} />
                  <span>💼 Leads & Prospects CRM ({leadsList.length})</span>
                </button>
              </div>
            </div>

            {/* Recipient Mode Selector: All vs Custom Selection */}
            <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1F293D] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200 block text-xs">
                    {audienceType === 'mentees' ? 'Mentorados Destinatários' : 'Leads Destinatários'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {sendToAll
                      ? `Enviando para todos os ${activeRecipients.length} ${audienceType === 'mentees' ? 'mentorados' : 'leads'}`
                      : `Seleção personalizada: ${selectedRecipientIds.length} de ${activeRecipients.length} ${audienceType === 'mentees' ? 'mentorados' : 'leads'}`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer bg-[#131A2B] px-3 py-1.5 rounded-xl border border-[#1F293D]">
                    <input
                      type="checkbox"
                      checked={sendToAll}
                      disabled={isBroadcasting}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSendToAll(checked);
                        if (checked) {
                          setSelectedRecipientIds(activeRecipients.map((r) => r.id));
                        }
                      }}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-[#0B0F17] border-[#1F293D] cursor-pointer"
                    />
                    <span className="font-bold text-slate-200 text-xs">Disparar para Todos</span>
                  </label>
                </div>
              </div>

              {/* Custom Mentee / Lead Multi-Select Table when sendToAll is false */}
              {!sendToAll && (
                <div className="pt-2 border-t border-slate-800/40 space-y-2">
                  {/* Search and Quick Action Buttons */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search size={13} className="absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Buscar ${audienceType === 'mentees' ? 'mentorados' : 'leads'} por nome, empresa ou telefone...`}
                        className="w-full bg-[#131A2B] border border-[#1F293D] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-2.5 py-1.5 rounded-lg bg-[#131A2B] hover:bg-[#1E293B] text-slate-300 font-bold text-[11px] border border-[#1F293D] cursor-pointer"
                    >
                      Selecionar Todos
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-2.5 py-1.5 rounded-lg bg-[#131A2B] hover:bg-[#1E293B] text-slate-400 font-bold text-[11px] border border-[#1F293D] cursor-pointer"
                    >
                      Desmarcar Todos
                    </button>
                  </div>

                  {/* Scrollable Recipient List */}
                  <div className="max-h-48 overflow-y-auto space-y-1 p-1 bg-[#070A12] rounded-xl border border-[#1F293D]">
                    {filteredRecipients.length === 0 ? (
                      <p className="p-3 text-center text-slate-500 text-xs">
                        Nenhum {audienceType === 'mentees' ? 'mentorado' : 'lead'} encontrado com este filtro.
                      </p>
                    ) : (
                      filteredRecipients.map((recipient) => {
                        const isSelected = selectedRecipientIds.includes(recipient.id);
                        return (
                          <div
                            key={recipient.id}
                            onClick={() => !isBroadcasting && handleToggleRecipient(recipient.id)}
                            className={`p-2 rounded-lg flex items-center justify-between gap-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-slate-100'
                                : 'hover:bg-[#131A2B] border border-transparent text-slate-400'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                className="w-3.5 h-3.5 rounded text-emerald-500 bg-[#0B0F17] border-[#1F293D] pointer-events-none"
                              />
                              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] text-amber-400 shrink-0">
                                {recipient.name[0]}
                              </div>
                              <div className="truncate text-left">
                                <strong className="text-xs text-slate-200 block truncate">{recipient.name}</strong>
                                <span className="text-[10px] text-slate-400 truncate block">
                                  {recipient.company} • {recipient.phone || 'Sem fone'}
                                </span>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                isSelected ? recipient.tagColor : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {recipient.tag}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Anti-Ban Interval Control */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B0F17] border border-[#1F293D]">
              <div>
                <span className="font-bold text-slate-200 block text-xs">Intervalo de Segurança Anti-Bloqueio</span>
                <span className="text-[10px] text-slate-400">Pausa entre cada disparo para proteger seu número</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs">
                {[
                  { label: '1.5s', ms: 1500 },
                  { label: '3.0s (Recomendado)', ms: 3000 },
                  { label: '5.0s (Mais Seguro)', ms: 5000 },
                ].map((preset) => (
                  <button
                    key={preset.ms}
                    type="button"
                    onClick={() => setBroadcastDelayMs(preset.ms)}
                    disabled={isBroadcasting}
                    className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      broadcastDelayMs === preset.ms
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                        : 'bg-[#131926] text-slate-400 border-[#1F293D] hover:text-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Message Preview / Customizer */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Mensagem personalizada com dados do evento:
                </label>
                <span className="text-[10px] text-slate-500 font-mono">Tags personalizadas automaticamente</span>
              </div>

              <div className="p-3.5 bg-[#070A12] border border-emerald-500/20 rounded-2xl">
                <div className="bg-[#1F2C34] text-slate-100 p-3.5 rounded-2xl rounded-tl-none text-xs font-sans whitespace-pre-line leading-relaxed shadow-lg border-l-4 border-emerald-500">
                  {interpolateWhatsAppTemplate(
                    customBroadcastMsg.trim()
                      ? customBroadcastMsg
                      : getAllWhatsAppTemplates().find((t) => t.id === 'event_announcement')?.content ||
                        INITIAL_DEFAULT_TEMPLATES.find((t) => t.id === 'event_announcement')?.content ||
                        '',
                    {
                      nome: audienceType === 'mentees' ? 'Carlos Eduardo Silva' : 'Dr. Fernando Albuquerque',
                      empresa: audienceType === 'mentees' ? 'Silva Group' : 'Clínica Albuquerque',
                      eventoTitulo: broadcastTargetEvent.title,
                      eventoData: new Date(broadcastTargetEvent.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                      eventoLocal: broadcastTargetEvent.location,
                    }
                  )}
                </div>
              </div>
            </div>

            {/* Custom Message Override Textarea */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Personalizar texto do disparo (Opcional):
              </label>
              <textarea
                rows={3}
                value={customBroadcastMsg}
                onChange={(e) => setCustomBroadcastMsg(e.target.value)}
                disabled={isBroadcasting}
                placeholder="Se preencher aqui, este texto exato será usado no lugar do template padrão..."
                className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-none disabled:opacity-50"
              />
            </div>

            {/* Live Progress Bar during Broadcast */}
            {broadcastProgress && (
              <div className="p-4 rounded-xl bg-[#070A12] border border-emerald-500/30 space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-200 flex items-center gap-2">
                    {isBroadcasting && <Loader2 size={14} className="animate-spin text-emerald-400" />}
                    <span>{broadcastProgress.isFinished ? '✅ Disparo Concluído!' : `Enviando para: ${broadcastProgress.currentName}`}</span>
                  </span>
                  <span className="text-emerald-400 font-mono">{broadcastProgress.percent}%</span>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full bg-[#1F293D] rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 transition-all duration-300 rounded-full"
                    style={{ width: `${broadcastProgress.percent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Progresso: {broadcastProgress.current} de {broadcastProgress.total}</span>
                  <span className="flex items-center gap-3">
                    <strong className="text-emerald-400">✓ {broadcastProgress.successCount} enviados</strong>
                    {broadcastProgress.failedCount > 0 && (
                      <strong className="text-red-400">✗ {broadcastProgress.failedCount} falhas</strong>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/40">
              <button
                type="button"
                onClick={() => setIsBroadcastModalOpen(false)}
                disabled={isBroadcasting}
                className="px-4 py-2.5 rounded-xl bg-[#0B0F17] text-slate-300 font-bold border border-[#1F293D] disabled:opacity-50 cursor-pointer"
              >
                {broadcastProgress?.isFinished ? 'Fechar' : 'Cancelar'}
              </button>

              <button
                type="button"
                onClick={handleRequestBroadcast}
                disabled={isBroadcasting || selectedCount === 0}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isBroadcasting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Disparando em Massa ({broadcastProgress?.percent || 0}%)...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Iniciar Disparo ({selectedCount} {audienceType === 'mentees' ? 'Mentorados' : 'Leads'})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Pre-Broadcast Confirmation Modal */}
      {isConfirmBroadcastModalOpen && broadcastTargetEvent && (
        <Modal
          isOpen={isConfirmBroadcastModalOpen}
          onClose={() => setIsConfirmBroadcastModalOpen(false)}
          title="Confirmar Disparo em Massa"
          subtitle="Valide as informações antes de iniciar o envio no WhatsApp"
          icon={<ShieldCheck size={20} className="text-emerald-400" />}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-extrabold text-sm">
                <Megaphone size={16} />
                <span>Pronto para iniciar o envio oficial?</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">
                Você está prestes a disparar o convite do evento{' '}
                <strong className="text-emerald-400">"{broadcastTargetEvent.title}"</strong> para{' '}
                <strong className="text-white underline">
                  {selectedCount} {audienceType === 'mentees' ? 'mentorado(s) oficial(is)' : 'lead(s) do CRM'} selecionado(s)
                </strong>.
              </p>
              <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-4">
                <span>⏱️ Intervalo Anti-Ban: <strong>{(broadcastDelayMs / 1000).toFixed(1)}s</strong></span>
                <span>📱 Canal: <strong>Evolution API WhatsApp</strong></span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/40">
              <button
                type="button"
                onClick={() => setIsConfirmBroadcastModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-[#0B0F17] text-slate-300 font-bold border border-[#1F293D] cursor-pointer"
              >
                Voltar e Ajustar
              </button>

              <button
                type="button"
                onClick={async () => {
                  setIsConfirmBroadcastModalOpen(false);
                  await handleStartBroadcast();
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Send size={14} />
                <span>Sim, Iniciar Disparo Agora 🚀</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Styled Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTargetEvent}
        title="Excluir Evento da Agenda"
        itemName={deleteTargetEvent?.title}
        description={`Tem certeza que deseja remover o evento ${deleteTargetEvent?.title ? `"${deleteTargetEvent.title}"` : 'selecionado'} da agenda oficial? Os dados e lista de presença serão cancelados.`}
        confirmText="Sim, Excluir Evento"
        cancelText="Cancelar"
        onConfirm={handleConfirmDeleteEvent}
        onCancel={() => setDeleteTargetEvent(null)}
      />
    </div>
  );
}
