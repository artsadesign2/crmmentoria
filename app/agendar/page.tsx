'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Video,
  User,
  Building,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Shield,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { toast } from '@/lib/toast-context';

const SESSION_TYPES = [
  {
    id: 'diag',
    title: 'Diagnóstico Estratégico 1-on-1',
    duration: '45 minutos',
    description: 'Mapeamento de gargalos, validação de funil de vendas e alinhamento de metas de escala.',
    badge: 'Mais Procurado',
  },
  {
    id: 'tracao',
    title: 'Alinhamento Tático & Tração',
    duration: '30 minutos',
    description: 'Revisão de sprints, métricas do CRM e desobstrução de travas operacionais.',
    badge: 'Foco Operacional',
  },
  {
    id: 'hotseat',
    title: 'Hotseat de Escala & Negócios',
    duration: '60 minutos',
    description: 'Sessão aprofundada de engenharia de ofertas, modelo de franquia e expansão.',
    badge: 'Alta Performance',
  },
];

const TIME_SLOTS = ['09:00', '10:00', '11:30', '14:00', '15:30', '17:00', '18:30'];

export default function AgendarPublicPage() {
  const [selectedType, setSelectedType] = useState(SESSION_TYPES[0]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('15:30');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [topic, setTopic] = useState('');

  const [loading, setLoading] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  // Gera as próximas 10 datas úteis
  const availableDates = React.useMemo(() => {
    const dates: { dateFormatted: string; dayName: string; rawDate: string }[] = [];
    const current = new Date();

    while (dates.length < 8) {
      current.setDate(current.getDate() + 1);
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        // Segunda a Sexta
        const rawDate = current.toISOString().split('T')[0];
        const dateFormatted = current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const dayName = current.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        dates.push({ dateFormatted, dayName, rawDate });
      }
    }
    return dates;
  }, []);

  // Seleciona a primeira data por padrão
  React.useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0].rawDate);
    }
  }, [availableDates, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !selectedDate || !selectedTime) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/agendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          company,
          sessionType: selectedType.title,
          date: selectedDate,
          time: selectedTime,
          topic,
        }),
      });

      const json = await res.json();
      if (res.ok && json.ok) {
        setConfirmedBooking(json.booking);
        toast.success('Agendamento Confirmado!', 'Enviamos os detalhes por WhatsApp e E-mail.');
      } else {
        toast.error('Erro no agendamento', json.error || 'Tente novamente.');
      }
    } catch {
      toast.error('Erro de conexão', 'Não foi possível confirmar o agendamento.');
    } finally {
      setLoading(false);
    }
  };

  if (confirmedBooking) {
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `Mentoria Rocket Club: ${confirmedBooking.sessionType}`
    )}&dates=${confirmedBooking.date.replace(/-/g, '')}T${confirmedBooking.time.replace(':', '')}00Z/${confirmedBooking.date.replace(
      /-/g,
      ''
    )}T${confirmedBooking.time.replace(':', '')}00Z&details=${encodeURIComponent(
      `Sessão Estratégica 1-on-1 com o mentor do Rocket Club. Sala ao vivo: ${confirmedBooking.meetUrl}`
    )}&location=${encodeURIComponent(confirmedBooking.meetUrl)}`;

    return (
      <div className="min-h-screen bg-[#070B14] text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-[#0F172A] border border-slate-800 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Sessão Confirmada
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Agendamento Realizado com Sucesso!</h1>
            <p className="text-sm text-slate-400">
              Olá, <strong>{confirmedBooking.name}</strong>. Os dados da sua mentoria foram registrados e enviados para o seu WhatsApp e E-mail.
            </p>
          </div>

          <div className="bg-[#131B2E] border border-slate-800 rounded-2xl p-5 text-left text-xs space-y-2.5">
            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-500">Tipo de Sessão</span>
              <span className="font-semibold text-white">{confirmedBooking.sessionType}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-500">Data & Horário</span>
              <span className="font-semibold text-amber-400">
                {confirmedBooking.date} às {confirmedBooking.time}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Link da Sala</span>
              <a
                href={confirmedBooking.meetUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>Google Meet</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <a
              href={googleCalUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Calendar size={16} />
              <span>Adicionar ao Google Calendar</span>
            </a>

            <button
              onClick={() => {
                setConfirmedBooking(null);
                setName('');
                setEmail('');
                setPhone('');
              }}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
            >
              Fazer Novo Agendamento
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 py-12 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header do Agendador */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/25">
            <Sparkles size={14} /> Agenda Oficial • Rocket Club
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Agende sua Sessão Estratégica 1-on-1
          </h1>
          <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Escolha o formato da mentoria, selecione o melhor horário e preencha suas informações para receber o acesso direto à sala executiva.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Coluna 1: Tipos de Sessão & Escolha de Data/Hora (7 colunas) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Escolha do Tipo de Mentoria */}
            <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Video size={14} className="text-amber-400" />
                <span>1. Escolha o Formato da Sessão</span>
              </h3>

              <div className="space-y-3">
                {SESSION_TYPES.map((type) => {
                  const isSelected = selectedType.id === type.id;
                  return (
                    <div
                      key={type.id}
                      onClick={() => setSelectedType(type)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer select-none space-y-1.5 ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{type.title}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400">
                          {type.duration}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{type.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Escolha de Data & Horário */}
            <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Calendar size={14} className="text-amber-400" />
                <span>2. Selecione a Data & Horário</span>
              </h3>

              {/* Datas Disponíveis */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-400">Dia Disponível</label>
                <div className="grid grid-cols-4 gap-2">
                  {availableDates.map((item) => {
                    const isSelected = selectedDate === item.rawDate;
                    return (
                      <button
                        type="button"
                        key={item.rawDate}
                        onClick={() => setSelectedDate(item.rawDate)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-md'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="block text-[10px] uppercase font-semibold opacity-80">{item.dayName}</span>
                        <span className="block text-xs font-bold">{item.dateFormatted}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Horários */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-400">Horário de Início</label>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const isSelected = selectedTime === slot;
                    return (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => setSelectedTime(slot)}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Coluna 2: Formulário de Identificação & Confirmação (5 colunas) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <User size={14} className="text-amber-400" />
                <span>3. Seus Dados de Acesso</span>
              </h3>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">WhatsApp / Telefone *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">E-mail Corporativo *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@empresa.com"
                    className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Empresa / Negócio</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Nome da sua empresa"
                    className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Qual o principal gargalo / pauta da call?
                  </label>
                  <textarea
                    rows={3}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ex: Validação da nova oferta High-Ticket e estruturação do funil..."
                    className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Resumo & Botão */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total</span>
                  <span className="font-extrabold text-emerald-400">Incluso na Mentoria (R$ 0,00)</span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg hover:shadow-amber-500/20 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-slate-950" />
                      <span>Confirmando sua Vaga...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirmar Agendamento</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
