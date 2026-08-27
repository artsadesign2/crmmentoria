'use client';

import { ChannelBadge } from '../channel-badge';
import { relativeTime } from '@/lib/crm/sla';
import type { ConversationDTO } from '@/lib/crm/inbox-types';

/**
 * Uma linha da lista de conversas.
 *
 * Densa de propósito: o atendente varre esta coluna dezenas de vezes por dia e
 * precisa de muitas conversas visíveis sem rolar. Tudo aqui responde a uma
 * pergunta que ele faz de fato — quem é, o que disse por último, quando, tem
 * algo esperando resposta, e de quem é o atendimento.
 */

interface ConversationItemProps {
  conversation: ConversationDTO;
  isActive: boolean;
  onOpen: (id: string) => void;
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '?';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

export function ConversationItem({ conversation, isActive, onOpen }: ConversationItemProps) {
  const naFila = conversation.assignedUserId === null;
  const temNaoLidas = conversation.unreadCount > 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(conversation.id)}
      aria-current={isActive}
      className="w-full border-b border-[var(--theme-border)]/60 px-3 py-2.5 text-left transition-colors last:border-0"
      style={{
        backgroundColor: isActive ? 'var(--theme-badge-bg)' : 'transparent',
        borderLeft: `3px solid ${isActive ? 'var(--primary-color)' : 'transparent'}`,
      }}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-black"
          style={{
            backgroundColor: 'var(--theme-badge-bg)',
            color: 'var(--primary-color)',
          }}
        >
          {conversation.contact.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={conversation.contact.avatarUrl}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            iniciais(conversation.contact.name)
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className="truncate text-xs font-bold text-[var(--theme-text-primary)]"
              style={{ fontWeight: temNaoLidas ? 900 : 700 }}
            >
              {conversation.contact.name}
            </span>
            <span className="shrink-0 text-[10px] text-[var(--theme-text-secondary)]">
              {relativeTime(conversation.lastMessageAt)}
            </span>
          </div>

          <p
            className="mt-0.5 truncate text-[11px] leading-snug"
            style={{
              color: temNaoLidas ? 'var(--theme-text-primary)' : 'var(--theme-text-secondary)',
            }}
          >
            {conversation.lastMessagePreview ?? 'Sem mensagens ainda'}
          </p>

          <div className="mt-1.5 flex items-center gap-1.5">
            <ChannelBadge channel={conversation.channel} variant="dot" />

            {naFila ? (
              <span
                className="rounded px-1.5 py-px text-[9px] font-black uppercase tracking-wide"
                style={{ backgroundColor: 'var(--theme-badge-bg)', color: 'var(--primary-color)' }}
              >
                Na fila
              </span>
            ) : (
              <span className="truncate text-[10px] text-[var(--theme-text-secondary)]">
                {conversation.assignedUserName}
              </span>
            )}

            {conversation.departmentName && (
              <span className="truncate text-[10px] text-[var(--theme-text-secondary)]">
                · {conversation.departmentName}
              </span>
            )}

            {temNaoLidas && (
              <span
                className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black text-[#0B0F17]"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
