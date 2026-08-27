'use client';

import { Check, CheckCheck, Clock, AlertCircle, EyeOff, Paperclip, Bot } from 'lucide-react';
import { clockTime } from '@/lib/crm/sla';
import { TranscriptionNote } from './transcription-note';
import type { MessageDTO } from '@/lib/crm/inbox-types';

/**
 * Uma mensagem na thread, em três tratamentos.
 *
 * Entrada e saída seguem a convenção que todo mundo já conhece de aplicativo de
 * mensagem — esquerda e direita — porque aqui inventar seria só atrapalhar.
 *
 * A nota interna é o oposto: precisa ser impossível de confundir com algo que o
 * cliente recebeu. Ela quebra a metáfora do balão de propósito, ocupa a largura
 * inteira em faixa âmbar tracejada e diz, por escrito, quem consegue ler.
 * É o único lugar do Inbox onde a interface grita, e grita porque o erro que
 * ela previne — descobrir que o cliente leu a nota interna — não tem conserto.
 */

const AMBAR_FUNDO = 'rgba(245, 158, 11, 0.10)';
const AMBAR_BORDA = 'rgba(245, 158, 11, 0.45)';
const AMBAR_TEXTO = '#F59E0B';

function StatusIcon({ status }: { status: MessageDTO['status'] }) {
  const comum = { size: 11, className: 'shrink-0' } as const;

  if (status === 'PENDING' || status === 'SCHEDULED') return <Clock {...comum} />;
  if (status === 'FAILED') return <AlertCircle {...comum} className="shrink-0 text-red-400" />;
  if (status === 'READ') return <CheckCheck {...comum} />;
  if (status === 'DELIVERED') return <CheckCheck {...comum} />;
  return <Check {...comum} />;
}

function Anexo({ message }: { message: MessageDTO }) {
  if (!message.mediaUrl) return null;

  return (
    <a
      href={message.mediaUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold underline underline-offset-2 opacity-80 transition-opacity hover:opacity-100"
    >
      <Paperclip size={10} />
      Abrir anexo
    </a>
  );
}

interface MessageBubbleProps {
  message: MessageDTO;
  onRetryTranscription: (messageId: string) => Promise<{ ok: boolean; error?: string }>;
}

export function MessageBubble({ message, onRetryTranscription }: MessageBubbleProps) {
  if (message.direction === 'INTERNAL') {
    return (
      <div
        className="rounded-xl border border-dashed px-3 py-2"
        style={{ backgroundColor: AMBAR_FUNDO, borderColor: AMBAR_BORDA }}
      >
        <div
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide"
          style={{ color: AMBAR_TEXTO }}
        >
          <EyeOff size={11} />
          Nota interna · só a equipe vê
        </div>

        <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-[var(--theme-text-primary)]">
          {message.content}
        </p>

        <div className="mt-1 text-[10px] text-[var(--theme-text-secondary)]">
          {message.userName ?? 'Equipe'} · {clockTime(message.createdAt)}
        </div>
      </div>
    );
  }

  const daEmpresa = message.direction === 'OUTBOUND';
  const falhou = message.status === 'FAILED';

  return (
    <div className={`flex ${daEmpresa ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[78%] rounded-2xl px-3 py-2"
        style={{
          backgroundColor: daEmpresa ? 'var(--theme-badge-bg)' : 'var(--theme-bg)',
          border: `1px solid ${falhou ? 'rgba(248,113,113,0.5)' : 'var(--theme-border)'}`,
          // Canto reto do lado de quem falou: dá direção ao balão sem seta.
          borderBottomRightRadius: daEmpresa ? 4 : undefined,
          borderBottomLeftRadius: daEmpresa ? undefined : 4,
        }}
      >
        {daEmpresa && (message.userName || message.isFromBot) && (
          <div
            className="mb-0.5 flex items-center gap-1 text-[10px] font-black"
            style={{ color: 'var(--primary-color)' }}
          >
            {message.isFromBot && <Bot size={10} />}
            {message.isFromBot ? 'Robô' : message.userName}
          </div>
        )}

        <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-[var(--theme-text-primary)]">
          {message.content}
        </p>

        <TranscriptionNote message={message} onRetry={onRetryTranscription} />

        <Anexo message={message} />

        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[var(--theme-text-secondary)]">
          {clockTime(message.createdAt)}
          {daEmpresa && <StatusIcon status={message.status} />}
        </div>

        {falhou && (
          <p className="mt-0.5 text-right text-[10px] font-bold text-red-400">Não enviada</p>
        )}
      </div>
    </div>
  );
}
