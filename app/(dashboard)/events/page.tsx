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
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { ConfirmDeleteModal } from '@/components/ui/confirm-delete-modal';
import { EventItem, MOCK_EVENTS } from '@/lib/mock-data';
import { useNotifications } from '@/lib/notification-context';
import { useTheme } from '@/lib/theme-context';

export default function EventsPage() {
  const { isLightMode, activePalette } = useTheme();
  const [events, setEvents] = useState<EventItem[]>(MOCK_EVENTS);
  const [confirmedEventIds, setConfirmedEventIds] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'UPCOMING' | 'LIVE' | 'FINISHED'>('ALL');

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

  // Edit Form State
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editMaxAttendees, setEditMaxAttendees] = useState('50');
  const [editPrice, setEditPrice] = useState('0');
  const [editStatus, setEditStatus] = useState<EventItem['status']>('UPCOMING');

  // Load confirmed RSVPs from localStorage
  useEffect(() => {
    try {
      const savedRsvps = localStorage.getItem('rocket_club_confirmed_rsvps');
      if (savedRsvps) setConfirmedEventIds(JSON.parse(savedRsvps));

      const savedEvents = localStorage.getItem('rocket_club_events_list');
      if (savedEvents) setEvents(JSON.parse(savedEvents));
    } catch (e) {}
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

    setToastMsg(`Presença confirmada no evento "${targetEvent?.title || 'Selecionado'}"! 🎉`);
    setTimeout(() => setToastMsg(null), 4000);

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
    setToastMsg('Confirmação de presença cancelada.');
    setTimeout(() => setToastMsg(null), 3000);
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
    };

    const updated = [newEvent, ...events];
    saveEventsList(updated);

    setTitle('');
    setDescription('');
    setLocation('');
    setDate('');
    setIsAddModalOpen(false);

    setToastMsg(`Novo evento "${newEvent.title}" cadastrado com sucesso!`);
    setTimeout(() => setToastMsg(null), 3000);
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
    setIsEditModalOpen(true);
  };

  const handleSaveEventEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !editTitle.trim()) return;

    const updated = events.map((ev) => {
      if (ev.id === selectedEvent.id) {
        return {
          ...ev,
          title: editTitle.trim(),
          description: editDescription.trim(),
          location: editLocation.trim(),
          date: editDate || ev.date,
          maxAttendees: parseInt(editMaxAttendees, 10) || ev.maxAttendees,
          price: parseFloat(editPrice) || 0,
          status: editStatus,
        };
      }
      return ev;
    });

    saveEventsList(updated);
    setIsEditModalOpen(false);
    setSelectedEvent(null);
    setToastMsg('Alterações salvas com sucesso!');
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleConfirmDeleteEvent = () => {
    if (!deleteTargetEvent) return;
    const updated = events.filter((e) => e.id !== deleteTargetEvent.id);
    saveEventsList(updated);
    setDeleteTargetEvent(null);
    setIsEditModalOpen(false);
    setSelectedEvent(null);
    setToastMsg('Evento removido com sucesso.');
    setTimeout(() => setToastMsg(null), 3000);
  };

  const filteredEvents = events.filter((e) => {
    if (selectedFilter === 'ALL') return true;
    return e.status === selectedFilter;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className="fixed top-6 right-6 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300 font-bold text-xs"
          style={{
            backgroundColor: isLightMode ? '#0F172A' : '#131926',
            color: '#F8FAFC',
            border: `1px solid ${activePalette.tokens.primary}`,
          }}
        >
          <CheckCircle2 size={18} style={{ color: activePalette.tokens.primary }} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Badge variant="default" className="mb-2">
            <Calendar size={14} className="mr-1.5" /> Agenda Executiva Oficial
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Eventos, <span className="theme-gradient-text">Imersões & Hotseats</span>
          </h1>
          <p className={`text-xs sm:text-sm ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
            Confirme sua presença nos encontros presenciais e imersões de alta performance.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-2 shrink-0 self-start md:self-auto"
          style={{
            backgroundColor: activePalette.tokens.primary,
            color: isLightMode ? '#FFFFFF' : '#0B0F17',
          }}
        >
          <Plus size={16} />
          <span>Cadastrar Evento</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className={`flex items-center gap-2 overflow-x-auto pb-2 border-b ${isLightMode ? 'border-slate-200' : 'border-[#1F293D]'}`}>
        {[
          { key: 'ALL', label: 'Todos os Encontros' },
          { key: 'UPCOMING', label: 'Próximos / Confirmados' },
          { key: 'LIVE', label: 'Ao Vivo Agora' },
          { key: 'FINISHED', label: 'Encerrados' },
        ].map((tab) => {
          const isSel = selectedFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setSelectedFilter(tab.key as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                isSel
                  ? 'shadow-sm'
                  : isLightMode
                  ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  : 'bg-[#131926]/60 text-slate-400 border-[#1F293D] hover:bg-[#1F293D]'
              }`}
              style={
                isSel
                  ? {
                      backgroundColor: activePalette.tokens.badgeBg,
                      color: activePalette.tokens.primary,
                      borderColor: activePalette.tokens.badgeBorder,
                    }
                  : {}
              }
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
              className={`p-6 flex flex-col justify-between transition-all group ${
                isConfirmed
                  ? 'border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                  : 'hover:border-slate-600'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                      event.status === 'LIVE'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                        : event.status === 'UPCOMING'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                    }`}
                  >
                    {event.status === 'LIVE' ? '🔴 Ao Vivo' : event.status === 'UPCOMING' ? '📅 Confirmado' : 'Concluído'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(event)}
                      className="p-1.5 rounded-lg bg-[#0B0F17] hover:bg-[#1F293D] text-slate-400 hover:text-slate-200 border border-[#1F293D] transition-colors"
                      title="Editar Evento"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className={`text-base font-bold transition-colors ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                    {event.title}
                  </h3>
                  <p className={`text-xs mt-1 leading-relaxed line-clamp-2 ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
                    {event.description}
                  </p>
                </div>

                <div className="space-y-2 pt-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Clock size={14} style={{ color: activePalette.tokens.primary }} />
                    <span>{new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
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
              </div>

              {/* Action Button */}
              <div className="pt-5 border-t border-slate-800/40 mt-4">
                {isConfirmed ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={15} />
                      <span>Presença Confirmada!</span>
                    </div>
                    <button
                      onClick={() => handleCancelRsvp(event.id)}
                      className="px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold"
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
          subtitle="Atualize as informações de horário, local e vagas do encontro"
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
                  <label className="block text-slate-400 font-semibold mb-1">Capacidade (Vagas Máximas)</label>
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
                  <label className="block text-slate-400 font-semibold mb-1">Preço do Ingresso (R$)</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className={`w-full border rounded-xl px-3.5 py-2.5 font-bold focus:outline-none ${
                      isLightMode ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Status</label>
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
