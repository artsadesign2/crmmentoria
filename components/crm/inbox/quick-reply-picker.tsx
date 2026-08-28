'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import type { QuickReplyDTO } from '@/lib/crm/quick-reply-text';

/**
 * Menu de respostas prontas, aberto por `/` no começo da caixa.
 *
 * O texto escolhido entra no compositor e **continua editável**. Enviar direto
 * daqui economizaria um clique e tiraria a única chance de o atendente ver que
 * a resposta pronta não serve para aquela pergunta.
 *
 * Só abre quando a `/` é o primeiro caractere: um endereço colado no meio da
 * mensagem não deve abrir menu nenhum.
 */

interface QuickReplyPickerProps {
  /** O que está escrito na caixa. O menu decide sozinho se deve aparecer. */
  text: string;
  replies: QuickReplyDTO[];
  onPick: (reply: QuickReplyDTO) => void;
  onDismiss: () => void;
}

export function QuickReplyPicker({ text, replies, onPick, onDismiss }: QuickReplyPickerProps) {
  const [indice, setIndice] = useState(0);
  const listaRef = useRef<HTMLUListElement>(null);

  const termo = text.startsWith('/') ? text.slice(1).trim().toLowerCase() : null;

  const filtradas = useMemo(() => {
    if (termo === null) return [];
    if (!termo) return replies;

    return replies.filter(
      (r) => r.shortcut.includes(termo) || r.title.toLowerCase().includes(termo)
    );
  }, [termo, replies]);

  // O índice precisa voltar ao topo quando a lista muda, senão a seta continua
  // apontando para uma posição que não existe mais.
  useEffect(() => {
    setIndice(0);
  }, [termo]);

  useEffect(() => {
    if (termo === null) return;

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        onDismiss();
        return;
      }

      if (evento.key === 'ArrowDown') {
        evento.preventDefault();
        setIndice((i) => Math.min(i + 1, filtradas.length - 1));
        return;
      }

      if (evento.key === 'ArrowUp') {
        evento.preventDefault();
        setIndice((i) => Math.max(i - 1, 0));
        return;
      }

      // Enter escolhe em vez de enviar: com o menu aberto, enviar "/preco"
      // literal para o cliente é o erro que este desvio evita.
      if (evento.key === 'Enter' && filtradas[indice]) {
        evento.preventDefault();
        evento.stopPropagation();
        onPick(filtradas[indice]);
      }
    };

    window.addEventListener('keydown', aoTeclar, true);
    return () => window.removeEventListener('keydown', aoTeclar, true);
  }, [termo, filtradas, indice, onPick, onDismiss]);

  if (termo === null) return null;

  return (
    <div
      className="absolute bottom-full left-0 right-0 z-20 mb-1 overflow-hidden rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-lg"
      role="listbox"
      aria-label="Respostas rápidas"
    >
      {filtradas.length === 0 ? (
        <p className="px-3 py-2.5 text-[11px] text-[var(--theme-text-secondary)]">
          {replies.length === 0
            ? 'Nenhuma resposta rápida cadastrada. Crie em Configurações.'
            : 'Nenhuma resposta com esse atalho.'}
        </p>
      ) : (
        <ul ref={listaRef} className="max-h-56 overflow-y-auto">
          {filtradas.map((resposta, posicao) => {
            const ativa = posicao === indice;

            return (
              <li key={resposta.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={ativa}
                  onMouseEnter={() => setIndice(posicao)}
                  onClick={() => onPick(resposta)}
                  className="flex w-full items-start gap-2 border-b border-[var(--theme-border)] px-3 py-2 text-left transition-colors last:border-b-0"
                  style={{ backgroundColor: ativa ? 'var(--theme-badge-bg)' : 'transparent' }}
                >
                  <Zap
                    size={12}
                    className="mt-0.5 shrink-0"
                    style={{ color: 'var(--primary-color)' }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-1.5">
                      <span className="text-[11px] font-black text-[var(--theme-text-primary)]">
                        /{resposta.shortcut}
                      </span>
                      <span className="truncate text-[10px] text-[var(--theme-text-secondary)]">
                        {resposta.title}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-[var(--theme-text-secondary)]">
                      {resposta.content}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="border-t border-[var(--theme-border)] px-3 py-1.5 text-[10px] text-[var(--theme-text-secondary)]">
        ↑↓ para escolher · Enter insere · Esc fecha. O texto entra na caixa e continua editável.
      </p>
    </div>
  );
}
