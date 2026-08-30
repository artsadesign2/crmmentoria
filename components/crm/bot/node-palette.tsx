'use client';

import { APARENCIA } from './bot-nodes';
import type { BotNodeType } from '@/lib/bot/types';

/**
 * A paleta: um botão por tipo de nó.
 *
 * Sem arrastar-e-soltar de propósito. Arrastar da paleta para o canvas é
 * bonito de demonstrar e ruim de usar num trackpad, e resolve um problema que
 * ninguém tem: o nó nasce no meio da tela e a pessoa o move onde quiser, que é
 * o mesmo gesto de qualquer jeito.
 *
 * `START` fica de fora: ele já existe, é único, e um segundo início faz o
 * motor parar em vez de escolher.
 */

const DISPONIVEIS: BotNodeType[] = [
  'MESSAGE',
  'QUESTION',
  'CONDITION',
  'CAPTURE',
  'AI',
  'TRANSFER',
  'END',
];

const EXPLICACAO: Record<BotNodeType, string> = {
  START: 'Onde toda conversa começa.',
  MESSAGE: 'Manda um texto e segue em frente.',
  QUESTION: 'Pergunta e espera. Com opções vira menu; sem opções, campo livre.',
  CONDITION: 'Segue por um caminho ou outro conforme o que foi guardado.',
  CAPTURE: 'Guarda a última resposta na ficha do contato.',
  TRANSFER: 'Entrega a conversa a uma pessoa e sai de cena.',
  AI: 'Responde pela base de conhecimento, com trava e saída.',
  END: 'Encerra a conversa.',
};

export function NodePalette({
  onAdicionar,
  desabilitado,
}: {
  onAdicionar: (tipo: BotNodeType) => void;
  desabilitado: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p
        className="px-1 text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--theme-text-secondary)' }}
      >
        Adicionar
      </p>

      {DISPONIVEIS.map((tipo) => {
        const { cor, Icone, titulo } = APARENCIA[tipo];

        return (
          <button
            key={tipo}
            type="button"
            onClick={() => onAdicionar(tipo)}
            disabled={desabilitado}
            title={EXPLICACAO[tipo]}
            className="flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text-primary)',
            }}
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
              style={{ background: `${cor}1A` }}
            >
              <Icone size={13} style={{ color: cor }} />
            </span>
            {titulo}
          </button>
        );
      })}
    </div>
  );
}
