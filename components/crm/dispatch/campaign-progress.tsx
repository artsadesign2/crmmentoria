'use client';

import { useMemo, useState } from 'react';
import { Check, X, MinusCircle, Clock, ChevronDown } from 'lucide-react';
import type { CampaignDetailDTO, TargetDTO } from '@/lib/dispatch/types';

/**
 * O andamento da campanha, com os pulados explicados.
 *
 * A parte que importa é a última: quem foi excluído e por quê. Sem ela, "200
 * selecionados, 187 enviados" parece perda de mensagem, e a suspeita de que o
 * disparo perde gente é muito mais cara de desfazer do que de evitar.
 */

const VERDE = '#22C55E';
const VERMELHO = '#EF4444';
const AMBAR = '#F59E0B';

interface CampaignProgressProps {
  campaign: CampaignDetailDTO;
}

export function CampaignProgress({ campaign }: CampaignProgressProps) {
  const [mostrarPulados, setMostrarPulados] = useState(false);

  const pulados = useMemo(
    () => campaign.targets.filter((t) => t.status === 'SKIPPED'),
    [campaign.targets]
  );

  const falhas = useMemo(
    () => campaign.targets.filter((t) => t.status === 'FAILED'),
    [campaign.targets]
  );

  const decididos = campaign.sentCount + campaign.failedCount + campaign.skippedCount;
  const percentual = campaign.totalCount > 0 ? (decididos / campaign.totalCount) * 100 : 0;

  return (
    <div className="space-y-3">
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={Math.round(percentual)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${decididos} de ${campaign.totalCount} destinatários processados`}
        style={{ backgroundColor: 'var(--theme-badge-bg)' }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${percentual}%`, backgroundColor: 'var(--primary-color)' }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Contador rotulo="Enviados" valor={campaign.sentCount} cor={VERDE} icone={Check} />
        <Contador rotulo="Na fila" valor={campaign.pendingCount} cor="var(--theme-text-secondary)" icone={Clock} />
        <Contador rotulo="Falhas" valor={campaign.failedCount} cor={VERMELHO} icone={X} />
        <Contador rotulo="Pulados" valor={campaign.skippedCount} cor={AMBAR} icone={MinusCircle} />
      </div>

      {(pulados.length > 0 || falhas.length > 0) && (
        <div className="rounded-xl border border-[var(--theme-border)]">
          <button
            type="button"
            onClick={() => setMostrarPulados((v) => !v)}
            aria-expanded={mostrarPulados}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] font-bold text-[var(--theme-text-secondary)] transition-colors hover:text-[var(--theme-text-primary)]"
          >
            <span>
              {/* A frase completa, não só o número: é ela que responde a pergunta. */}
              {campaign.totalCount} selecionados, {campaign.sentCount + campaign.pendingCount} para
              enviar. Ver quem ficou de fora e por quê.
            </span>
            <ChevronDown
              size={14}
              className="shrink-0 transition-transform"
              style={{ transform: mostrarPulados ? 'rotate(180deg)' : 'none' }}
            />
          </button>

          {mostrarPulados && (
            <ul className="max-h-64 overflow-y-auto border-t border-[var(--theme-border)]">
              {[...pulados, ...falhas].map((alvo) => (
                <LinhaExcluida key={alvo.id} alvo={alvo} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Contador({
  rotulo,
  valor,
  cor,
  icone: Icone,
}: {
  rotulo: string;
  valor: number;
  cor: string;
  icone: typeof Check;
}) {
  return (
    <div className="rounded-xl border border-[var(--theme-border)] px-2.5 py-2">
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-secondary)]">
        <Icone size={11} style={{ color: cor }} />
        {rotulo}
      </p>
      <p className="mt-0.5 text-lg font-black leading-none" style={{ color: cor }}>
        {valor}
      </p>
    </div>
  );
}

function LinhaExcluida({ alvo }: { alvo: TargetDTO }) {
  const ehFalha = alvo.status === 'FAILED';

  return (
    <li className="flex items-start gap-2 border-b border-[var(--theme-border)] px-3 py-2 last:border-b-0">
      {ehFalha ? (
        <X size={12} className="mt-0.5 shrink-0" style={{ color: VERMELHO }} />
      ) : (
        <MinusCircle size={12} className="mt-0.5 shrink-0" style={{ color: AMBAR }} />
      )}

      <div className="min-w-0">
        <p className="truncate text-[11px] font-bold text-[var(--theme-text-primary)]">
          {alvo.name}
          {alvo.phoneFormatted !== '—' && (
            <span className="ml-1.5 font-normal text-[var(--theme-text-secondary)]">
              {alvo.phoneFormatted}
            </span>
          )}
        </p>
        <p className="text-[10px] leading-snug text-[var(--theme-text-secondary)]">
          {alvo.skipReason ?? alvo.error ?? 'Motivo não registrado.'}
        </p>
      </div>
    </li>
  );
}
