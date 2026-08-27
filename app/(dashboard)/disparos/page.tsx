'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Megaphone, Plus, Loader2, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { CampaignList } from '@/components/crm/dispatch/campaign-list';
import { CampaignProgress } from '@/components/crm/dispatch/campaign-progress';
import { NewCampaignModal } from '@/components/crm/dispatch/new-campaign-modal';
import { useAuth } from '@/lib/auth-context';
import type { CampaignDTO, CampaignDetailDTO, CampaignStatus } from '@/lib/dispatch/types';

/**
 * Disparo em massa.
 *
 * A tela mantém a fila andando enquanto está aberta, e diz isso em voz alta.
 * Sem processo residente — que é o que "serverless" significa —, uma campanha
 * iniciada com a aba fechada só anda na passada agendada. Esconder esse
 * detalhe faria a fila parecer quebrada; dizê-lo faz o usuário saber quando
 * pode fechar a aba.
 */

/** Intervalo entre passadas enquanto a aba está aberta e visível. */
const RITMO_MS = 12_000;

export default function DisparosPage() {
  const { currentUser } = useAuth();
  const podeGerenciar =
    currentUser.role === 'Master' || currentUser.role === 'Administrador';

  const [campanhas, setCampanhas] = useState<CampaignDTO[]>([]);
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<CampaignDetailDTO | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupadaId, setOcupadaId] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [drenando, setDrenando] = useState(false);

  const carregarLista = useCallback(async () => {
    try {
      const resposta = await fetch('/api/crm/campaigns');
      const corpo = await resposta.json();

      if (!resposta.ok || !corpo.ok) {
        setErro(corpo.error ?? 'Não foi possível carregar as campanhas.');
        return;
      }

      setCampanhas(corpo.campaigns as CampaignDTO[]);
      setErro(null);
    } catch {
      setErro('Falha de rede ao carregar as campanhas.');
    } finally {
      setCarregando(false);
    }
  }, []);

  const carregarDetalhe = useCallback(async (id: string) => {
    try {
      const resposta = await fetch(`/api/crm/campaigns/${id}`);
      const corpo = await resposta.json();
      if (resposta.ok && corpo.ok) setDetalhe(corpo.campaign as CampaignDetailDTO);
    } catch {
      // O detalhe some da tela; a lista continua. Um erro em bloco aqui
      // esconderia campanhas que estão perfeitamente visíveis.
    }
  }, []);

  useEffect(() => {
    void carregarLista();
  }, [carregarLista]);

  useEffect(() => {
    if (selecionadaId) void carregarDetalhe(selecionadaId);
  }, [selecionadaId, carregarDetalhe]);

  const emAndamento = campanhas.some((c) => c.status === 'RUNNING' && c.pendingCount > 0);

  /**
   * A bomba da fila.
   *
   * Uma passada por vez: `drenando` num ref evita que o intervalo dispare a
   * segunda antes de a primeira voltar. O banco aguentaria — `SKIP LOCKED`
   * cuida disso —, mas seriam duas funções de 50 segundos rodando à toa.
   */
  const drenandoRef = useRef(false);

  const drenar = useCallback(async () => {
    if (drenandoRef.current) return;

    drenandoRef.current = true;
    setDrenando(true);

    try {
      await fetch('/api/crm/campaigns/drain', { method: 'POST' });
      await carregarLista();
      if (selecionadaId) await carregarDetalhe(selecionadaId);
    } catch {
      // Silêncio proposital: a próxima passada tenta de novo, e um alerta a
      // cada 12 segundos por uma falha de rede transitória seria ruído.
    } finally {
      drenandoRef.current = false;
      setDrenando(false);
    }
  }, [carregarLista, carregarDetalhe, selecionadaId]);

  useEffect(() => {
    if (!emAndamento || !podeGerenciar) return;

    void drenar();
    const relogio = setInterval(() => {
      if (document.visibilityState === 'visible') void drenar();
    }, RITMO_MS);

    return () => clearInterval(relogio);
  }, [emAndamento, podeGerenciar, drenar]);

  const mudarStatus = async (id: string, status: CampaignStatus) => {
    setOcupadaId(id);
    setErro(null);

    try {
      const resposta = await fetch(`/api/crm/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const corpo = await resposta.json();
      if (!resposta.ok || !corpo.ok) {
        setErro(corpo.error ?? 'Não foi possível mudar o estado da campanha.');
        return;
      }

      await carregarLista();
      if (selecionadaId === id) await carregarDetalhe(id);
    } catch {
      setErro('Falha de rede ao mudar o estado da campanha.');
    } finally {
      setOcupadaId(null);
    }
  };

  const criar = async (input: {
    name: string;
    message: string;
    contactIds: string[];
    scheduledAt?: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const resposta = await fetch('/api/crm/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const corpo = await resposta.json();
      if (!resposta.ok || !corpo.ok) {
        return { ok: false, error: corpo.error ?? 'Não foi possível criar a campanha.' };
      }

      await carregarLista();
      setSelecionadaId(corpo.campaign.id as string);

      return { ok: true };
    } catch {
      return { ok: false, error: 'Falha de rede ao criar a campanha.' };
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-black text-[var(--theme-text-primary)]">
            <Megaphone size={20} style={{ color: 'var(--primary-color)' }} />
            Disparos
          </h1>
          <p className="mt-0.5 text-xs text-[var(--theme-text-secondary)]">
            A mesma mensagem para vários contatos, com intervalo entre cada envio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void carregarLista()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--theme-border)] px-3 py-1.5 text-xs font-bold text-[var(--theme-text-secondary)] transition-colors hover:text-[var(--theme-text-primary)]"
          >
            <RefreshCw size={13} className={drenando ? 'animate-spin' : undefined} />
            Atualizar
          </button>

          {podeGerenciar && (
            <button
              type="button"
              onClick={() => setModalAberto(true)}
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--primary-color)', color: '#0B0F17' }}
            >
              <Plus size={14} />
              Nova campanha
            </button>
          )}
        </div>
      </header>

      {emAndamento && (
        <p className="flex items-start gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-badge-bg)] px-3 py-2 text-[11px] font-semibold text-[var(--theme-text-secondary)]">
          <Info size={13} className="mt-px shrink-0" style={{ color: 'var(--primary-color)' }} />
          <span>
            {podeGerenciar ? (
              <>
                O envio anda enquanto esta aba está aberta. Se você fechar, ele continua na
                próxima passada agendada — às 8h, ou quando alguém abrir esta tela de novo.
              </>
            ) : (
              <>
                Há campanha em andamento. O envio anda quando um administrador está com esta tela
                aberta, ou na passada agendada das 8h.
              </>
            )}
          </span>
        </p>
      )}

      {erro && (
        <p className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300">
          <AlertCircle size={14} />
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="flex items-center gap-2 py-8 text-sm text-[var(--theme-text-secondary)]">
          <Loader2 size={16} className="animate-spin" />
          Carregando campanhas…
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <CampaignList
            campaigns={campanhas}
            selectedId={selecionadaId}
            busyId={ocupadaId}
            canManage={podeGerenciar}
            onSelect={setSelecionadaId}
            onStatus={(id, status) => void mudarStatus(id, status)}
          />

          <section className="rounded-2xl border border-[var(--theme-border)] p-4">
            {detalhe ? (
              <>
                <h2 className="mb-1 text-sm font-black text-[var(--theme-text-primary)]">
                  {detalhe.name}
                </h2>
                <p className="mb-3 whitespace-pre-wrap rounded-xl border border-[var(--theme-border)] p-2.5 text-[11px] leading-relaxed text-[var(--theme-text-secondary)]">
                  {detalhe.messageTemplate}
                </p>

                <CampaignProgress campaign={detalhe} />
              </>
            ) : (
              <p className="py-8 text-center text-xs text-[var(--theme-text-secondary)]">
                Escolha uma campanha para ver o andamento e quem ficou de fora.
              </p>
            )}
          </section>
        </div>
      )}

      {modalAberto && (
        <NewCampaignModal onClose={() => setModalAberto(false)} onCreate={criar} />
      )}
    </div>
  );
}
