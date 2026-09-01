'use client';

import { AlertTriangle, Monitor } from 'lucide-react';
import { APARENCIA } from './bot-nodes';
import { roteiroDoGrafo } from '@/lib/bot/outline';
import type { BotGraph, BotNode } from '@/lib/bot/types';
import type { ProblemaGrafo } from '@/lib/bot/validate';

/**
 * O fluxo lido de cima para baixo, para o celular.
 *
 * Substitui o canvas em vez de encolhê-lo. No telefone dá para ler o que o
 * robô fala, ver o que está quebrado, testar no simulador e publicar — que é
 * o trabalho que alguém realmente faz longe da mesa. Desenhar continua sendo
 * do computador, e a tela diz isso em vez de deixar a pessoa descobrir
 * tentando arrastar um nó com o polegar.
 */

/** Uma linha do texto do nó, curta o bastante para caber sem virar parágrafo. */
function resumo(node: BotNode): string {
  const { data, type } = node;

  if (type === 'CONDITION') {
    return data.variable ? `${data.variable} = ${data.equals ?? ''}` : 'sem condição definida';
  }

  if (type === 'CAPTURE') {
    return data.field ? `guarda em "${data.field}"` : 'sem campo definido';
  }

  const texto = data.text?.trim();
  if (texto) return texto;

  if (type === 'TRANSFER') return 'entrega a conversa a uma pessoa';
  if (type === 'START') return 'onde a conversa começa';
  return 'sem texto';
}

export function FlowOutline({
  graph,
  problemas,
  onSelecionar,
}: {
  graph: BotGraph;
  problemas: ProblemaGrafo[];
  onSelecionar: (id: string) => void;
}) {
  const passos = roteiroDoGrafo(graph);

  if (passos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
        <Monitor size={26} style={{ color: 'var(--theme-text-secondary)' }} />
        <p className="text-sm" style={{ color: 'var(--theme-text-primary)' }}>
          Este fluxo ainda está vazio.
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
          Comece por um modelo pronto na lista, ou desenhe do zero no computador.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-1.5 overflow-y-auto p-3">
        {passos.map(({ node, profundidade, ramo, alcancavel }) => {
          const { cor, Icone, titulo } = APARENCIA[node.type];
          const doNo = problemas.filter((p) => p.nodeId === node.id);
          const quebrado = doNo.length > 0;

          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelecionar(node.id)}
              // O recuo mostra o ramo sem precisar desenhar linha nenhuma.
              style={{
                marginLeft: Math.min(profundidade, 4) * 14,
                background: 'var(--theme-surface)',
                borderColor: quebrado ? '#EF4444' : 'var(--theme-border)',
                opacity: alcancavel ? 1 : 0.55,
              }}
              className="flex w-full items-start gap-2.5 rounded-xl border p-3 text-left transition-colors active:brightness-125"
            >
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${cor}1A` }}
              >
                <Icone size={14} style={{ color: cor }} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[11px] font-semibold" style={{ color: cor }}>
                    {node.data.label?.trim() || titulo}
                  </span>

                  {ramo && (
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px]"
                      style={{
                        background: 'var(--theme-bg)',
                        color: 'var(--theme-text-secondary)',
                      }}
                    >
                      {ramo}
                    </span>
                  )}

                  {!alcancavel && (
                    <span className="text-[10px]" style={{ color: '#FBBF24' }}>
                      nada leva até aqui
                    </span>
                  )}
                </span>

                <span
                  className="mt-1 block break-words text-xs leading-relaxed"
                  style={{ color: 'var(--theme-text-primary)' }}
                >
                  {resumo(node)}
                </span>

                {quebrado && (
                  <span
                    className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed"
                    style={{ color: '#FCA5A5' }}
                  >
                    <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                    {doNo.map((p) => p.mensagem).join(' ')}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p
        className="flex items-center gap-2 border-t px-3 py-2.5 text-[11px] leading-relaxed"
        style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-secondary)' }}
      >
        <Monitor size={13} className="shrink-0" />
        Para desenhar o fluxo, abra esta tela no computador. Aqui dá para ler,
        testar e publicar.
      </p>
    </div>
  );
}
