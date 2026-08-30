'use client';

import { Bot, CheckCircle2, CirclePlus, FileEdit, RotateCcw } from 'lucide-react';
import type { FlowDTO } from '@/lib/bot/flows';

/**
 * A lista de fluxos, à esquerda.
 *
 * O que a lista precisa responder de relance é uma pergunta só: **qual deles
 * está falando com clientes agora?** O nome e a data são secundários; quem
 * abre esta tela às pressas quer achar o fluxo no ar. Por isso o selo de "no
 * ar" vem em cor sólida e tudo o mais é cinza.
 */

export function FlowList({
  flows,
  selecionadoId,
  ocupado,
  onSelecionar,
  onCriar,
  onCriarTriagem,
  onCriarRetomada,
}: {
  flows: FlowDTO[];
  selecionadoId: string | null;
  ocupado: boolean;
  onSelecionar: (id: string) => void;
  onCriar: () => void;
  onCriarTriagem: () => void;
  onCriarRetomada: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 p-3">
        <button
          type="button"
          onClick={onCriar}
          disabled={ocupado}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: 'var(--primary-color)', color: '#0A0F1A' }}
        >
          <CirclePlus size={14} /> Novo fluxo
        </button>

        <button
          type="button"
          onClick={onCriarTriagem}
          disabled={ocupado}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border py-2 text-xs transition-colors disabled:opacity-40"
          style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-secondary)' }}
        >
          <Bot size={14} /> Menu de triagem pronto
        </button>

        <button
          type="button"
          onClick={onCriarRetomada}
          disabled={ocupado}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border py-2 text-xs transition-colors disabled:opacity-40"
          style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-secondary)' }}
        >
          <RotateCcw size={14} /> Retomada pronta
        </button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        {flows.length === 0 && (
          <p
            className="px-1 py-6 text-center text-xs leading-relaxed"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            Nenhum fluxo ainda.
            <br />O robô não fala com ninguém enquanto isso.
          </p>
        )}

        {flows.map((f) => {
          const selecionado = f.id === selecionadoId;
          const noAr = f.isTrigger || f.isReengage;

          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelecionar(f.id)}
              className="w-full rounded-lg border px-3 py-2.5 text-left transition-colors"
              style={{
                background: selecionado ? 'var(--theme-badge-bg)' : 'transparent',
                borderColor: selecionado ? 'var(--primary-color)' : 'var(--theme-border)',
              }}
            >
              <p
                className="truncate text-sm font-medium"
                style={{ color: 'var(--theme-text-primary)' }}
              >
                {f.name}
              </p>

              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {f.isTrigger && (
                  <Selo cor="#22C55E" Icone={CheckCircle2}>
                    Atende conversa nova
                  </Selo>
                )}
                {f.isReengage && (
                  <Selo cor="#F97316" Icone={RotateCcw}>
                    Retoma lead parado
                  </Selo>
                )}
                {!noAr && (
                  <Selo cor="#64748B" Icone={FileEdit}>
                    {f.status === 'PUBLISHED' ? `Publicado v${f.publishedVersion}` : 'Rascunho'}
                  </Selo>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Selo({
  cor,
  Icone,
  children,
}: {
  cor: string;
  Icone: typeof CheckCircle2;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
      style={{ background: `${cor}1A`, color: cor }}
    >
      <Icone size={10} />
      {children}
    </span>
  );
}
