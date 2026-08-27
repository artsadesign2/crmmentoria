'use client';

import { MessageCircle, Phone, Mail, X, Bell, CheckSquare } from 'lucide-react';
import { ChannelBadge } from './channel-badge';
import { SlaRail, SlaLabel } from './sla-indicator';
import { clockTime } from '@/lib/crm/sla';
import type { DealCardDTO } from '@/lib/crm/types';

/**
 * Card de oportunidade — as cinco linhas do Módulo 1 do PRD.
 *
 *   1  avatar com badge de canal, nome, horário da última mensagem
 *   2  trecho da última mensagem
 *   3  valor, responsável, produto de interesse
 *   4  tags, com remoção em um clique
 *   5  ações rápidas, progresso de tarefas, SLA, lembrete
 *
 * Todas as cores saem das variáveis de tema, para o card acompanhar as quatro
 * paletas do sistema em vez de fixar um fundo escuro.
 */

const PRIORITY_DOT: Record<string, string> = {
  URGENT: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#F59E0B',
  LOW: '#64748B',
};

function iniciais(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

function moeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

interface DealCardProps {
  deal: DealCardDTO;
  onOpen: (deal: DealCardDTO) => void;
  onWhatsApp: (deal: DealCardDTO) => void;
  onRemoveTag: (contactId: string, tagId: string) => void;
  isDragging?: boolean;
}

export function DealCard({ deal, onOpen, onWhatsApp, onRemoveTag, isDragging }: DealCardProps) {
  const produto = typeof deal.customFields?.produto === 'string' ? deal.customFields.produto : null;
  const temTarefas = deal.totalTasks > 0;

  return (
    <article
      onClick={() => onOpen(deal)}
      className={`group relative cursor-pointer overflow-hidden rounded-xl border p-3 pl-4 transition-all
        border-[var(--theme-border)] bg-[var(--theme-surface)]
        hover:border-[var(--primary-color)]/50 hover:shadow-[0_0_0_1px_var(--primary-glow)]
        ${isDragging ? 'rotate-1 shadow-2xl ring-1 ring-[var(--primary-color)]' : ''}`}
    >
      <SlaRail slaDueAt={deal.slaDueAt} startedAt={deal.lastMessageAt} />

      {/* 1 — identidade e horário */}
      <header className="flex items-center gap-2">
        <div className="relative shrink-0">
          {deal.contact.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={deal.contact.avatarUrl}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black"
              style={{
                backgroundColor: 'var(--theme-badge-bg)',
                color: 'var(--theme-badge-text)',
              }}
            >
              {iniciais(deal.contact.name)}
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5">
            <ChannelBadge channel={deal.channel} variant="dot" />
          </span>
        </div>

        <h3 className="min-w-0 flex-1 truncate text-[13px] font-bold text-[var(--theme-text-primary)]">
          {deal.contact.name}
        </h3>

        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: PRIORITY_DOT[deal.priority] ?? PRIORITY_DOT.MEDIUM }}
          title={`Prioridade ${deal.priority.toLowerCase()}`}
        />
        <time className="shrink-0 text-[10px] font-semibold text-[var(--theme-text-secondary)]">
          {clockTime(deal.lastMessageAt)}
        </time>
      </header>

      {/* 2 — trecho da última mensagem */}
      {deal.lastMessageText && (
        <p className="mt-1.5 truncate text-[11px] text-[var(--theme-text-secondary)]">
          {deal.lastMessageText}
        </p>
      )}

      {/* 3 — valor, responsável, produto */}
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
        <strong className="font-black" style={{ color: 'var(--primary-color)' }}>
          {moeda(deal.dealValue)}
        </strong>
        {deal.assignedUserName && (
          <>
            <span className="text-[var(--theme-border)]">·</span>
            <span className="truncate text-[var(--theme-text-secondary)]">
              {deal.assignedUserName}
            </span>
          </>
        )}
        {produto && (
          <span className="rounded-md border border-[var(--theme-border)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--theme-text-secondary)]">
            {produto}
          </span>
        )}
      </div>

      {/* 4 — tags com remoção em um clique */}
      {deal.contact.tags.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {deal.contact.tags.map((tag) => (
            <li key={tag.id}>
              <span
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: `${tag.colorHex}1F`, color: tag.colorHex }}
              >
                {tag.name}
                <button
                  type="button"
                  aria-label={`Remover tag ${tag.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveTag(deal.contactId, tag.id);
                  }}
                  className="rounded-sm opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-1"
                >
                  <X size={9} strokeWidth={3} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* 5 — ações, tarefas, SLA, lembrete */}
      <footer className="mt-2.5 flex items-center gap-1.5 border-t border-[var(--theme-border)] pt-2">
        <button
          type="button"
          title="Abrir WhatsApp"
          aria-label="Abrir WhatsApp"
          onClick={(e) => {
            e.stopPropagation();
            onWhatsApp(deal);
          }}
          className="rounded-md p-1 text-emerald-400 transition-colors hover:bg-emerald-500/15"
        >
          <MessageCircle size={13} />
        </button>

        {deal.contact.phone && (
          <a
            href={`tel:+${deal.contact.phone}`}
            title="Ligar"
            aria-label="Ligar"
            onClick={(e) => e.stopPropagation()}
            className="rounded-md p-1 text-cyan-400 transition-colors hover:bg-cyan-500/15"
          >
            <Phone size={13} />
          </a>
        )}

        <button
          type="button"
          title="Enviar e-mail"
          aria-label="Enviar e-mail"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(deal);
          }}
          className="rounded-md p-1 text-[var(--theme-text-secondary)] transition-colors hover:bg-[var(--theme-border)]"
        >
          <Mail size={13} />
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          {temTarefas && (
            <span
              title={`${deal.completedTasks} de ${deal.totalTasks} tarefas concluídas`}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--theme-text-secondary)]"
            >
              <CheckSquare size={10} />
              {deal.completedTasks}/{deal.totalTasks}
            </span>
          )}

          <SlaLabel slaDueAt={deal.slaDueAt} />

          {deal.reminderAt && (
            <span
              title={`Lembrete para ${new Date(deal.reminderAt).toLocaleString('pt-BR')}`}
              className="inline-flex"
            >
              <Bell size={12} className="text-amber-400" />
            </span>
          )}
        </div>
      </footer>
    </article>
  );
}
