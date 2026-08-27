'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Thermometer } from 'lucide-react';
import { relativeTime } from '@/lib/crm/sla';
import type { ConversationDetailDTO } from '@/lib/crm/inbox-types';

/**
 * Qualificação do atendimento, no painel de contexto.
 *
 * A temperatura ganha barra em vez de só número porque a pergunta que o
 * atendente faz é "está perto ou longe de fechar", e uma barra responde isso
 * de relance. A cor segue a faixa, não a paleta do tema: aqui o significado é
 * a informação, e trocá-la por dourado apagaria a distinção.
 */

const FAIXAS = [
  { ate: 30, cor: '#64748B', rotulo: 'Frio' },
  { ate: 60, cor: '#F59E0B', rotulo: 'Morno' },
  { ate: 85, cor: '#F97316', rotulo: 'Quente' },
  { ate: 100, cor: '#10B981', rotulo: 'Pronto para fechar' },
];

function faixaDe(score: number) {
  return FAIXAS.find((f) => score <= f.ate) ?? FAIXAS[FAIXAS.length - 1];
}

export interface QualificationView {
  score: number | null;
  summary: string | null;
  analyzedAt: string | null;
  fields: Record<string, unknown> | null;
}

interface AiQualifyPanelProps {
  conversation: ConversationDetailDTO;
  qualification: QualificationView;
  onQualify: () => Promise<{ ok: boolean; error?: string }>;
}

const CAMPOS: Array<[string, string]> = [
  ['faturamento', 'Faturamento'],
  ['gargalo', 'Gargalo'],
  ['meta', 'Meta'],
  ['objecao', 'Objeção'],
];

export function AiQualifyPanel({ conversation, qualification, onQualify }: AiQualifyPanelProps) {
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const semOportunidade = !conversation.dealCardId;
  const jaAnalisado = qualification.score !== null;

  const analisar = async () => {
    setAnalisando(true);
    setErro(null);
    const r = await onQualify();
    setAnalisando(false);
    if (!r.ok) setErro(r.error ?? 'Não foi possível analisar.');
  };

  return (
    <div className="border-t border-[var(--theme-border)] pt-3">
      <h3 className="mb-1.5 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-[var(--theme-text-secondary)]">
        <Sparkles size={11} />
        Análise da conversa
      </h3>

      {jaAnalisado && qualification.score !== null && (
        <>
          <div className="mb-2">
            <div className="flex items-baseline justify-between">
              <span
                className="text-[11px] font-black"
                style={{ color: faixaDe(qualification.score).cor }}
              >
                {faixaDe(qualification.score).rotulo}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-black text-[var(--theme-text-primary)]">
                <Thermometer size={10} />
                {qualification.score}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--theme-bg)]">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${qualification.score}%`,
                  backgroundColor: faixaDe(qualification.score).cor,
                }}
              />
            </div>
          </div>

          {qualification.summary && (
            <p className="mb-2 text-[11px] leading-snug text-[var(--theme-text-secondary)]">
              {qualification.summary}
            </p>
          )}

          <dl className="mb-2 space-y-1">
            {CAMPOS.map(([chave, rotulo]) => {
              const valor = qualification.fields?.[chave];
              if (typeof valor !== 'string' || !valor) return null;

              return (
                <div key={chave}>
                  <dt className="text-[9px] font-bold uppercase tracking-wide text-[var(--theme-text-secondary)]">
                    {rotulo}
                  </dt>
                  <dd className="text-[11px] leading-snug text-[var(--theme-text-primary)]">
                    {valor}
                  </dd>
                </div>
              );
            })}
          </dl>

          {qualification.analyzedAt && (
            // Sem isto, um resumo de duas semanas atrás passaria por atual.
            <p className="mb-1.5 text-[10px] text-[var(--theme-text-secondary)]">
              Analisado {relativeTime(qualification.analyzedAt)}
            </p>
          )}
        </>
      )}

      {semOportunidade ? (
        <p className="rounded-xl border border-dashed border-[var(--theme-border)] px-3 py-2 text-[11px] leading-snug text-[var(--theme-text-secondary)]">
          Crie a oportunidade antes de analisar: a qualificação é gravada na ficha do funil.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void analisar()}
          disabled={analisando}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--theme-border)] px-3 py-1.5 text-[11px] font-bold text-[var(--theme-text-secondary)] transition-colors hover:text-[var(--theme-text-primary)] disabled:opacity-50"
        >
          {analisando ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {analisando ? 'Analisando...' : jaAnalisado ? 'Analisar de novo' : 'Analisar com IA'}
        </button>
      )}

      {erro && <p className="mt-1.5 text-[11px] font-bold text-red-400">{erro}</p>}
    </div>
  );
}
