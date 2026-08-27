'use client';

import { useEffect, useRef } from 'react';
import { MessageBubble } from './message-bubble';
import type { MessageDTO } from '@/lib/crm/inbox-types';

/**
 * Histórico da conversa.
 *
 * Rola para o fim quando chega mensagem nova — mas só se o atendente já estava
 * no fim. Puxar a tela de volta para baixo enquanto alguém lê o histórico é a
 * pior coisa que uma thread pode fazer.
 */

const MARGEM_DO_FIM_PX = 120;

function rotuloDoDia(iso: string, hoje: Date): string {
  const data = new Date(iso);
  const diaDe = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const diferencaEmDias = Math.round((diaDe(hoje) - diaDe(data)) / 86_400_000);

  if (diferencaEmDias === 0) return 'Hoje';
  if (diferencaEmDias === 1) return 'Ontem';

  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

interface MessageThreadProps {
  messages: MessageDTO[];
  onRetryTranscription: (messageId: string) => Promise<{ ok: boolean; error?: string }>;
}

export function MessageThread({ messages, onRetryTranscription }: MessageThreadProps) {
  const container = useRef<HTMLDivElement>(null);
  const estavaNoFim = useRef(true);

  useEffect(() => {
    const elemento = container.current;
    if (!elemento || !estavaNoFim.current) return;

    elemento.scrollTop = elemento.scrollHeight;
  }, [messages]);

  const aoRolar = () => {
    const elemento = container.current;
    if (!elemento) return;

    const distanciaDoFim = elemento.scrollHeight - elemento.scrollTop - elemento.clientHeight;
    estavaNoFim.current = distanciaDoFim < MARGEM_DO_FIM_PX;
  };

  const hoje = new Date();
  let ultimoDia = '';

  return (
    <div ref={container} onScroll={aoRolar} className="flex-1 space-y-2 overflow-y-auto p-3">
      {messages.length === 0 && (
        <p className="py-10 text-center text-xs text-[var(--theme-text-secondary)]">
          Nenhuma mensagem nesta conversa ainda.
        </p>
      )}

      {messages.map((mensagem) => {
        const dia = rotuloDoDia(mensagem.createdAt, hoje);
        const abreDia = dia !== ultimoDia;
        ultimoDia = dia;

        return (
          <div key={mensagem.id} className="space-y-2">
            {abreDia && (
              <div className="flex items-center gap-2 py-1">
                <span className="h-px flex-1 bg-[var(--theme-border)]" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-secondary)]">
                  {dia}
                </span>
                <span className="h-px flex-1 bg-[var(--theme-border)]" />
              </div>
            )}
            <MessageBubble message={mensagem} onRetryTranscription={onRetryTranscription} />
          </div>
        );
      })}
    </div>
  );
}
