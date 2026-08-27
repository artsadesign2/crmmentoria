'use client';

import { useState } from 'react';
import { Loader2, RotateCw, AudioLines, Ban } from 'lucide-react';
import type { MessageDTO } from '@/lib/crm/inbox-types';

/**
 * A transcrição, sob a bolha do áudio.
 *
 * Vem marcada como automática, e isso não é rodapé legal: quem lê precisa
 * saber que está lendo o que a máquina entendeu, não o que foi dito. Um cliente
 * que fala "não quero" e é transcrito como "eu quero" muda o atendimento
 * inteiro, e o atendente só desconfia se souber que aquilo é uma interpretação.
 *
 * `FAILED` e `UNSUPPORTED` recebem tratamentos diferentes de propósito: um
 * convida a repetir, o outro explica que repetir não adianta.
 */

const AZUL_INFO = 'rgba(96, 165, 250, 0.12)';

interface TranscriptionNoteProps {
  message: MessageDTO;
  onRetry: (messageId: string) => Promise<{ ok: boolean; error?: string }>;
}

export function TranscriptionNote({ message, onRetry }: TranscriptionNoteProps) {
  const [repetindo, setRepetindo] = useState(false);

  if (message.contentType !== 'AUDIO') return null;

  const status = message.transcriptionStatus;

  if (status === 'DONE' && message.transcription) {
    return (
      <div
        className="mt-1.5 rounded-lg px-2 py-1.5"
        style={{ backgroundColor: AZUL_INFO }}
      >
        <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-[var(--theme-text-secondary)]">
          <AudioLines size={9} />
          Transcrição automática
        </div>
        <p className="mt-0.5 text-[11px] italic leading-snug text-[var(--theme-text-primary)]">
          {message.transcription}
        </p>
      </div>
    );
  }

  if (status === 'UNSUPPORTED') {
    return (
      <p className="mt-1.5 flex items-start gap-1 text-[10px] leading-snug text-[var(--theme-text-secondary)]">
        <Ban size={10} className="mt-px shrink-0" />
        {message.transcription ?? 'Este áudio não pode ser transcrito.'}
      </p>
    );
  }

  if (status === 'FAILED') {
    return (
      <button
        type="button"
        disabled={repetindo}
        onClick={async () => {
          setRepetindo(true);
          await onRetry(message.id);
          setRepetindo(false);
        }}
        className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-[var(--theme-text-secondary)] underline underline-offset-2 transition-colors hover:text-[var(--theme-text-primary)] disabled:no-underline disabled:opacity-60"
      >
        {repetindo ? <Loader2 size={10} className="animate-spin" /> : <RotateCw size={10} />}
        {repetindo ? 'Transcrevendo...' : 'A transcrição falhou. Tentar de novo'}
      </button>
    );
  }

  // NULL: ainda não tentado. A abertura da conversa dispara a transcrição.
  return (
    <p className="mt-1.5 flex items-center gap-1 text-[10px] italic text-[var(--theme-text-secondary)]">
      <Loader2 size={9} className="animate-spin" />
      Transcrevendo o áudio...
    </p>
  );
}
