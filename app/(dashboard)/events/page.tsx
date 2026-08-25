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
import { EventItem, MOCK_EVENTS } from '@/lib/mock-data';
import { useNotifications } from '@/lib/notification-context';
import { ConfirmDeleteModal } from '@/components/ui/confirm-delete-modal';

export default function EventsPage() {
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

  // ONE-TIME RSVP HANDLER (Prevents infinite increment)
  const handleConfirmRsvp = (eventId: string) => {
    if (confirmedEventIds.includes(eventId)) return; // Already confirmed!

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

    addNotification({
      sector: 'events',
      type: 'success',
      title: '🎟️ Presença Confirmada no Evento!',
      message: `Você confirmou presença em "${targetEvent?.title || 'Evento da Mentoria'}". Seu ingresso digital está reservado.`,
      link: '/events',
      actionText: 'Ver Agenda',
    });

    setToastMsg(`🎉 Presença confirmada em "${targetEvent?.title}"!`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Create Event
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newEv: EventItem = {
      id: `e-${Date.now()}`,
      title,
      description: description || 'Encontro presencial exclusivo de mentoria, hotseat e networking executivo.',
      location: location || 'São Paulo / SP',
      date: date || new Date().toISOString(),
      attendeesCount: 1,
      maxAttendees: parseInt(maxAttendees) || 50,
      price: parseFloat(price) || 0,
      status,
    };

    const updated = [newEv, ...events];
    saveEventsList(updated);

    addNotification({
      sector: 'events',
      type: 'info',
      title: `📅 Novo Evento Publicado: ${newEv.title}`,
      message: `Data: ${new Date(newEv.date).toLocaleDateString('pt-BR')} • Local: ${newEv.location}.`,
      link: '/events',
      actionText: 'Ver Evento',
    });

    setTitle('');
    setDescription('');
    setLocation('');
    setDate('');
    setPrice('0');
    setIsAddModalOpen(false);
  };

  // Open Edit Modal
  const handleOpenEditModal = (event: EventItem) => {
    setSelectedEvent(event);
    setEditTitle(event.title);
    setEditDescription(event.description);
    setEditLocation(event.location);
    setEditDate(event.date);
    setEditMaxAttendees(String(event.maxAttendees));
    setEditPrice(String(event.price));
    setEditStatus(event.status);
    setIsEditModalOpen(true);
  };

  // Save Event Edits
  const handleSaveEventEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    const updatedEvents = events.map((ev) => {
      if (ev.id === selectedEvent.id) {
        return {
          ...ev,
          title: editTitle,
          description: editDescription,
          location: editLocation,
          date: editDate || ev.date,
          maxAttendees: parseInt(editMaxAttendees) || ev.maxAttendees,
          price: parseFloat(editPrice) || ev.price,
          status: editStatus,
        };
      }
      return ev;
    });

    saveEventsList(updatedEvents);
    setIsEditModalOpen(false);
    setToastMsg('✅ Dados do evento atualizados com sucesso!');
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Delete Event Handler
  const handleConfirmDeleteEvent = () => {
    if (!deleteTargetEvent) return;
    const updated = events.filter((e) => e.id !== deleteTargetEvent.id);
    saveEventsList(updated);
    if (selectedEvent?.id === deleteTargetEvent.id) {
      setIsEditModalOpen(false);
      setSelectedEvent(null);
    }
    setDeleteTargetEvent(null);
    setToastMsg('🗑️ Evento removido da agenda com sucesso.');
    setTimeout(() => setToastMsg(null), 3000);
  };

  const filteredEvents = events.filter((ev) => {
    if (selectedFilter === 'ALL') return true;
    return ev.status === selectedFilter;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-bold flex items-center gap-2.5 shadow-xl animate-in slide-in-from-top duration-300">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Badge variant="default" className="mb-2">
            <Calendar size={14} className="mr-1.5" /> Agenda de Eventos & Imersões Presenciais
          </Badge>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
            Agenda de <span className="gold-gradient-text">Encontros & Imersões</span>
          </h1>
          <p className="text-sm text-slate-400">
            Confirme sua presença com 1 clique, gerencie lotes e edite encontros estratégicos do ecossistema.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-yellow-500/20 hover:scale-105 transition-all flex items-center gap-2 shrink-0 self-start md:self-auto"
        >
          <Plus size={16} />
          <span>Criar Novo Evento</span>
        </button>
      </div>

      {/* Status Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: 'Todos os Encontros' },
          { id: 'UPCOMING', label: 'Próximos' },
          { id: 'LIVE', label: 'Ao Vivo Agora' },
          { id: 'FINISHED', label: 'Concluídos' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedFilter(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedFilter === tab.id
                ? 'bg-yellow-500 text-slate-950 shadow-md font-extrabold'
                : 'bg-[#131926] text-slate-400 border border-[#1F293D] hover:bg-[#1F293D] hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Expanded Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => {
          const percent = Math.round((event.attendeesCount / event.maxAttendees) * 100);
          const isConfirmed = confirmedEventIds.includes(event.id);
          const isFull = event.attendeesCount >= event.maxAttendees;

          return (
            <Card
              key={event.id}
              className="p-6 bg-[#131926] border-[#1F293D] hover:border-yellow-500/40 transition-all space-y-5 flex flex-col justify-between shadow-xl group"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold py-0.5 px-2 ${
                          event.status === 'LIVE'
                            ? 'border-red-500 text-red-400 bg-red-500/10 animate-pulse'
                            : event.status === 'UPCOMING'
                            ? 'border-yellow-500/40 text-yellow-300 bg-yellow-500/10'
                            : 'border-slate-600 text-slate-400'
                        }`}
                      >
                        {event.status === 'LIVE' ? '🔴 Ao Vivo' : event.status === 'UPCOMING' ? 'Confirmado' : 'Concluído'}
                      </Badge>
                      {event.price > 0 ? (
                        <span className="text-xs font-bold text-emerald-400">
                          R$ {event.price.toLocaleString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          Incluso na Mentoria
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-100 group-hover:text-yellow-400 transition-colors leading-tight">
                      {event.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(event)}
                      className="p-2 rounded-xl bg-[#0B0F17] hover:bg-[#1F293D] text-slate-400 hover:text-yellow-400 border border-[#1F293D] transition-colors"
                      title="Editar Evento"
                    >
                      <Pencil size={14} />
                    </button>
                    <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center">
                      <Ticket size={18} />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{event.description}</p>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0B0F17] border border-[#1F293D]">
                    <MapPin size={14} className="text-yellow-400 shrink-0" />
                    <span className="truncate font-semibold">{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0B0F17] border border-[#1F293D]">
                    <Clock size={14} className="text-yellow-400 shrink-0" />
                    <span className="font-semibold">{new Date(event.date).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              {/* Progress & RSVP Action */}
              <div className="space-y-3 pt-3 border-t border-[#1F293D]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Users size={14} className="text-yellow-400" /> Vagas Ocupadas
                  </span>
                  <span className="font-bold text-yellow-300">
                    {event.attendeesCount} / {event.maxAttendees} ({percent}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#0B0F17] overflow-hidden border border-[#1F293D]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      percent >= 90
                        ? 'bg-gradient-to-r from-red-500 to-amber-500'
                        : 'bg-gradient-to-r from-yellow-500 to-amber-300'
                    }`}
                    style={{ width: `${Math.min(100, percent)}%` }}
                  />
                </div>

                {/* RSVP BUTTON (Single Confirmation - Prevents Infinite Increment) */}
                <div className="pt-1">
                  {isConfirmed ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-2 cursor-default"
                    >
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span>Presença Confirmada ✅</span>
                    </button>
                  ) : isFull ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl bg-[#0B0F17] text-slate-500 border border-[#1F293D] text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <span>Vagas Esgotadas</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConfirmRsvp(event.id)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-slate-950 text-xs font-black shadow-md shadow-yellow-500/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
                    >
                      <UserCheck size={16} />
                      <span>Confirmar Minha Presença</span>
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit Event Modal */}
      {isEditModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-lg bg-[#131926] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 border-[#1F293D] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSaveEventEdits} className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F293D]">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Pencil size={18} className="text-yellow-400" />
                  <span>Editar Evento / Imersão</span>
                </h3>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Título do Evento</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Descrição</label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Localização / Link da Sala</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Data & Horário</label>
                    <input
                      type="datetime-local"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Capacidade (Vagas Máximas)</label>
                    <input
                      type="number"
                      value={editMaxAttendees}
                      onChange={(e) => setEditMaxAttendees(e.target.value)}
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40 font-bold"
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
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Status do Encontro</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                    >
                      <option value="UPCOMING">Confirmado / Futuro</option>
                      <option value="LIVE">Ao Vivo Agora</option>
                      <option value="FINISHED">Concluído / Encerrado</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#1F293D]">
                <button
                  type="button"
                  onClick={() => setDeleteTargetEvent(selectedEvent)}
                  className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 size={14} /> Excluir Evento
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#0B0F17] text-slate-300 text-xs font-semibold hover:bg-[#1F293D] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-yellow-500/20 hover:scale-105 transition-all flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    <span>Salvar Alterações</span>
                  </button>
                </div>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* New Event Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-[#131926] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 border-[#1F293D]">
            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F293D]">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles size={18} className="text-yellow-400" />
                  <span>Cadastrar Novo Evento ou Imersão</span>
                </h3>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Título do Evento</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Imersão Rocket Mastermind Q4"
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Localização / Link</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex: Hotel Tivoli Mofarrej / Zoom"
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Data & Horário</label>
                    <input
                      type="datetime-local"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Capacidade (Vagas)</label>
                    <input
                      type="number"
                      value={maxAttendees}
                      onChange={(e) => setMaxAttendees(e.target.value)}
                      placeholder="60"
                      className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-yellow-500/40"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#1F293D]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#0B0F17] text-slate-300 text-xs font-semibold hover:bg-[#1F293D] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-yellow-500/20 hover:scale-105 transition-all"
                >
                  Publicar Evento
                </button>
              </div>
            </form>
          </Card>
        </div>
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
