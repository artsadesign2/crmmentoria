'use client';

import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { CHANNELS, PRIORITIES, type ChannelType, type PriorityLevel } from '@/lib/crm/types';
import type { StageDTO } from '@/lib/crm/types';

/**
 * Cadastro de oportunidade.
 *
 * Cria contato e oportunidade em sequência. Telefone já cadastrado reaproveita
 * o contato existente em vez de recusar — quem está aqui quer abrir uma
 * oportunidade, e um contato repetido não deve barrar isso.
 */

const inputClass =
  'w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-xs text-[var(--theme-text-primary)] outline-none transition-colors placeholder:text-[var(--theme-text-secondary)] focus:border-[var(--primary-color)]';

const labelClass =
  'mb-1 block text-[11px] font-bold uppercase tracking-wide text-[var(--theme-text-secondary)]';

const CHANNEL_LABELS: Record<ChannelType, string> = {
  WHATSAPP: 'WhatsApp',
  INSTAGRAM: 'Instagram',
  VOIP: 'Chamada',
  WEBCHAT: 'Webchat',
  WEBHOOK: 'Webhook',
};

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  URGENT: 'Urgente',
  HIGH: 'Alta',
  MEDIUM: 'Média',
  LOW: 'Baixa',
};

interface NewDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  stages: StageDTO[];
  defaultStageId?: string;
  onCreate: (input: {
    name: string;
    phone?: string;
    email?: string;
    company?: string;
    title: string;
    dealValue: number;
    stageId: string;
    priority: string;
    channel: string;
    customFields: Record<string, unknown>;
  }) => Promise<{ ok: boolean; error?: string }>;
}

export function NewDealModal({
  isOpen,
  onClose,
  stages,
  defaultStageId,
  onCreate,
}: NewDealModalProps) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [dealValue, setDealValue] = useState('25000');
  const [stageId, setStageId] = useState(defaultStageId ?? stages[0]?.id ?? '');
  const [priority, setPriority] = useState<PriorityLevel>('HIGH');
  const [channel, setChannel] = useState<ChannelType>('WHATSAPP');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const limpar = () => {
    setName('');
    setCompany('');
    setPhone('');
    setEmail('');
    setSpecialty('');
    setDealValue('25000');
    setNotes('');
    setError(null);
  };

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Informe o nome do contato.');
      return;
    }
    if (!stageId) {
      setError('Selecione a etapa do funil.');
      return;
    }

    const valor = Number(dealValue.replace(/\./g, '').replace(',', '.'));
    if (Number.isNaN(valor) || valor < 0) {
      setError('Informe um valor válido para a oportunidade.');
      return;
    }

    setSaving(true);
    const resultado = await onCreate({
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      company: company.trim() || undefined,
      title: specialty.trim() || `Oportunidade — ${name.trim()}`,
      dealValue: valor,
      stageId,
      priority,
      channel,
      customFields: { specialty: specialty.trim(), notes: notes.trim(), email: email.trim() },
    });
    setSaving(false);

    if (!resultado.ok) {
      setError(resultado.error ?? 'Não foi possível criar a oportunidade.');
      return;
    }

    limpar();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova oportunidade"
      subtitle="Cadastre o contato e abra o card no funil"
      icon={<Plus size={20} />}
    >
      <form onSubmit={submeter} className="space-y-3 text-left">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="nd-nome" className={labelClass}>
              Nome do contato
            </label>
            <input
              id="nd-nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Fernando Albuquerque"
              className={inputClass}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="nd-empresa" className={labelClass}>
              Empresa
            </label>
            <input
              id="nd-empresa"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Clínica Albuquerque"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="nd-telefone" className={labelClass}>
              Telefone
            </label>
            <input
              id="nd-telefone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 98765-4321"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="nd-email" className={labelClass}>
              E-mail
            </label>
            <input
              id="nd-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@empresa.com.br"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="nd-interesse" className={labelClass}>
              Interesse ou especialidade
            </label>
            <input
              id="nd-interesse"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="Mentoria de escala — Plano Anual"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="nd-valor" className={labelClass}>
              Valor estimado (R$)
            </label>
            <input
              id="nd-valor"
              inputMode="decimal"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="nd-etapa" className={labelClass}>
              Etapa
            </label>
            <select
              id="nd-etapa"
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              className={inputClass}
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="nd-canal" className={labelClass}>
              Canal de origem
            </label>
            <select
              id="nd-canal"
              value={channel}
              onChange={(e) => setChannel(e.target.value as ChannelType)}
              className={inputClass}
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="nd-prioridade" className={labelClass}>
              Prioridade
            </label>
            <select
              id="nd-prioridade"
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityLevel)}
              className={inputClass}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="nd-notas" className={labelClass}>
              Anotações
            </label>
            <textarea
              id="nd-notas"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Contexto do lead, origem da indicação, próximos passos"
              className={`${inputClass} resize-y`}
            />
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--theme-border)] px-3 py-2 text-xs font-bold text-[var(--theme-text-secondary)] transition-colors hover:text-[var(--theme-text-primary)]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-[#0B0F17] transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Criar oportunidade
          </button>
        </div>
      </form>
    </Modal>
  );
}
