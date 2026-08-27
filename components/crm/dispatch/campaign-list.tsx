'use client';

import { Play, Pause, Ban, Loader2, Megaphone } from 'lucide-react';
import type { CampaignDTO, CampaignStatus } from '@/lib/dispatch/types';

/**
 * As campanhas da organização, mais recentes primeiro.
 *
 * Os botões de ação mudam com o estado em vez de aparecerem sempre desligados:
 * um botão "Iniciar" cinza numa campanha concluída faz o usuário clicar para
 * descobrir que não pode.
 */

const CORES: Record<CampaignStatus, { fundo: string; texto: string; rotulo: string }> = {
  DRAFT: { fundo: 'rgba(148,163,184,0.16)', texto: '#94A3B8', rotulo: 'Rascunho' },
  SCHEDULED: { fundo: 'rgba(59,130,246,0.16)', texto: '#60A5FA', rotulo: 'Agendada' },
  RUNNING: { fundo: 'rgba(34,197,94,0.16)', texto: '#22C55E', rotulo: 'Enviando' },
  PAUSED: { fundo: 'rgba(245,158,11,0.16)', texto: '#F59E0B', rotulo: 'Pausada' },
  DONE: { fundo: 'rgba(148,163,184,0.16)', texto: '#94A3B8', rotulo: 'Concluída' },
  CANCELED: { fundo: 'rgba(239,68,68,0.16)', texto: '#EF4444', rotulo: 'Cancelada' },
};

interface CampaignListProps {
  campaigns: CampaignDTO[];
  selectedId: string | null;
  busyId: string | null;
  canManage: boolean;
  onSelect: (id: string) => void;
  onStatus: (id: string, status: CampaignStatus) => void;
}

export function CampaignList({
  campaigns,
  selectedId,
  busyId,
  canManage,
  onSelect,
  onStatus,
}: CampaignListProps) {
  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--theme-border)] p-8 text-center">
        <Megaphone size={22} className="text-[var(--theme-text-secondary)]" />
        <p className="text-sm font-bold text-[var(--theme-text-primary)]">
          Nenhuma campanha ainda
        </p>
        <p className="max-w-xs text-xs text-[var(--theme-text-secondary)]">
          Crie uma campanha para enviar a mesma mensagem a vários contatos, com intervalo entre
          cada envio.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {campaigns.map((campanha) => {
        const cor = CORES[campanha.status];
        const selecionada = campanha.id === selectedId;
        const ocupada = busyId === campanha.id;

        return (
          <li key={campanha.id}>
            <div
              className="rounded-2xl border p-3 transition-colors"
              style={{
                borderColor: selecionada ? 'var(--primary-color)' : 'var(--theme-border)',
                backgroundColor: selecionada ? 'var(--theme-badge-bg)' : 'transparent',
              }}
            >
              <button
                type="button"
                onClick={() => onSelect(campanha.id)}
                aria-pressed={selecionada}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-black text-[var(--theme-text-primary)]">
                    {campanha.name}
                  </p>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black"
                    style={{ backgroundColor: cor.fundo, color: cor.texto }}
                  >
                    {cor.rotulo}
                  </span>
                </div>

                <p className="mt-1 truncate text-[11px] text-[var(--theme-text-secondary)]">
                  {campanha.sentCount} de {campanha.totalCount} enviadas
                  {campanha.skippedCount > 0 && ` · ${campanha.skippedCount} pulados`}
                  {campanha.failedCount > 0 && ` · ${campanha.failedCount} falhas`}
                </p>
              </button>

              {canManage && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(campanha.status === 'DRAFT' ||
                    campanha.status === 'PAUSED' ||
                    campanha.status === 'SCHEDULED') && (
                    <Acao
                      icone={Play}
                      rotulo={campanha.status === 'PAUSED' ? 'Retomar' : 'Iniciar'}
                      ocupada={ocupada}
                      destaque
                      onClick={() => onStatus(campanha.id, 'RUNNING')}
                    />
                  )}

                  {campanha.status === 'RUNNING' && (
                    <Acao
                      icone={Pause}
                      rotulo="Pausar"
                      ocupada={ocupada}
                      onClick={() => onStatus(campanha.id, 'PAUSED')}
                    />
                  )}

                  {campanha.status !== 'DONE' && campanha.status !== 'CANCELED' && (
                    <Acao
                      icone={Ban}
                      rotulo="Cancelar"
                      ocupada={ocupada}
                      onClick={() => onStatus(campanha.id, 'CANCELED')}
                    />
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Acao({
  icone: Icone,
  rotulo,
  ocupada,
  destaque = false,
  onClick,
}: {
  icone: typeof Play;
  rotulo: string;
  ocupada: boolean;
  destaque?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={ocupada}
      className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
      style={{
        borderColor: destaque ? 'var(--primary-color)' : 'var(--theme-border)',
        color: destaque ? 'var(--primary-color)' : 'var(--theme-text-secondary)',
      }}
    >
      {ocupada ? <Loader2 size={11} className="animate-spin" /> : <Icone size={11} />}
      {rotulo}
    </button>
  );
}
