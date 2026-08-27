'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DealCardDTO, PipelineDTO, StageDTO, TagDTO } from './types';

/**
 * Estado do Kanban: carrega funil e oportunidades, e persiste movimentos.
 *
 * Concentra aqui tudo o que fala com a rede, para que os componentes de
 * apresentação recebam apenas dados e callbacks.
 */

interface CrmState {
  pipeline: PipelineDTO | null;
  deals: DealCardDTO[];
  tags: TagDTO[];
  isLoading: boolean;
  error: string | null;
}

const ESTADO_INICIAL: CrmState = {
  pipeline: null,
  deals: [],
  tags: [],
  isLoading: true,
  error: null,
};

/** 401 significa sessão expirada; o middleware já cuida do resto. */
function handleUnauthorized(status: number): boolean {
  if (status === 401 && typeof window !== 'undefined') {
    window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
    return true;
  }
  return false;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

export function useCrm() {
  const [state, setState] = useState<CrmState>(ESTADO_INICIAL);

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const [pipelinesRes, dealsRes, tagsRes] = await Promise.all([
        fetch('/api/crm/pipelines'),
        fetch('/api/crm/deals'),
        fetch('/api/crm/tags'),
      ]);

      if ([pipelinesRes, dealsRes, tagsRes].some((r) => handleUnauthorized(r.status))) return;

      if (!pipelinesRes.ok || !dealsRes.ok) {
        setState((s) => ({
          ...s,
          isLoading: false,
          error: 'Não foi possível carregar o funil. Tente de novo.',
        }));
        return;
      }

      const pipelines = (await readJson(pipelinesRes)).pipelines as PipelineDTO[] | undefined;
      const deals = (await readJson(dealsRes)).deals as DealCardDTO[] | undefined;
      const tags = tagsRes.ok ? ((await readJson(tagsRes)).tags as TagDTO[]) : [];

      setState({
        pipeline: pipelines?.[0] ?? null,
        deals: deals ?? [],
        tags: tags ?? [],
        isLoading: false,
        error: null,
      });
    } catch {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: 'Falha de conexão com o servidor.',
      }));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  /**
   * Move o card de etapa.
   *
   * Atualização otimista: o card troca de coluna antes da resposta do servidor.
   * Esperar a rede colocaria uma trava perceptível a cada solta do arrasto, que
   * é justamente o gesto onde a latência mais incomoda.
   *
   * Falhando, devolve o card à coluna de origem e informa o motivo — nunca
   * deixa a tela mostrando um estado que o banco não tem.
   */
  const moveDeal = useCallback(
    async (dealId: string, toStageId: string): Promise<{ ok: boolean; error?: string }> => {
      let anterior: DealCardDTO | undefined;

      setState((s) => {
        anterior = s.deals.find((d) => d.id === dealId);
        return {
          ...s,
          deals: s.deals.map((d) => (d.id === dealId ? { ...d, stageId: toStageId } : d)),
        };
      });

      try {
        const response = await fetch(`/api/crm/deals/${dealId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stageId: toStageId }),
        });

        if (handleUnauthorized(response.status)) return { ok: false };

        const data = await readJson(response);

        if (!response.ok || !data.ok) {
          // Desfaz: a coluna volta a refletir o banco.
          setState((s) => ({
            ...s,
            deals: s.deals.map((d) => (d.id === dealId && anterior ? anterior : d)),
          }));
          return { ok: false, error: (data.error as string) ?? 'Não foi possível mover o card.' };
        }

        // Recarrega os agregados: o somatório das duas colunas mudou.
        const pipelinesRes = await fetch('/api/crm/pipelines');
        if (pipelinesRes.ok) {
          const pipelines = (await readJson(pipelinesRes)).pipelines as PipelineDTO[] | undefined;
          setState((s) => ({ ...s, pipeline: pipelines?.[0] ?? s.pipeline }));
        }

        return { ok: true };
      } catch {
        setState((s) => ({
          ...s,
          deals: s.deals.map((d) => (d.id === dealId && anterior ? anterior : d)),
        }));
        return { ok: false, error: 'Falha de conexão ao mover o card.' };
      }
    },
    []
  );

  const updateDeal = useCallback(
    async (
      dealId: string,
      patch: Record<string, unknown>
    ): Promise<{ ok: boolean; error?: string }> => {
      try {
        const response = await fetch(`/api/crm/deals/${dealId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });

        if (handleUnauthorized(response.status)) return { ok: false };
        const data = await readJson(response);

        if (!response.ok || !data.ok) {
          return { ok: false, error: (data.error as string) ?? 'Não foi possível salvar.' };
        }

        const deal = data.deal as DealCardDTO;
        setState((s) => ({ ...s, deals: s.deals.map((d) => (d.id === dealId ? deal : d)) }));
        return { ok: true };
      } catch {
        return { ok: false, error: 'Falha de conexão ao salvar.' };
      }
    },
    []
  );

  const deleteDeal = useCallback(
    async (dealId: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const response = await fetch(`/api/crm/deals/${dealId}`, { method: 'DELETE' });
        if (handleUnauthorized(response.status)) return { ok: false };

        const data = await readJson(response);
        if (!response.ok || !data.ok) {
          return { ok: false, error: (data.error as string) ?? 'Não foi possível excluir.' };
        }

        setState((s) => ({ ...s, deals: s.deals.filter((d) => d.id !== dealId) }));
        return { ok: true };
      } catch {
        return { ok: false, error: 'Falha de conexão ao excluir.' };
      }
    },
    []
  );

  /**
   * Cria contato e oportunidade numa tacada.
   *
   * Telefone já cadastrado devolve 409 com o id do contato existente; nesse caso
   * reaproveitamos o contato em vez de recusar — a intenção do usuário é abrir
   * uma oportunidade, e o contato repetido não deve barrá-la.
   */
  const createDeal = useCallback(
    async (input: {
      name: string;
      phone?: string;
      email?: string;
      company?: string;
      title: string;
      dealValue: number;
      stageId: string;
      priority?: string;
      channel?: string;
      customFields?: Record<string, unknown>;
    }): Promise<{ ok: boolean; error?: string }> => {
      try {
        const contactRes = await fetch('/api/crm/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: input.name,
            phone: input.phone,
            email: input.email,
            company: input.company,
          }),
        });

        if (handleUnauthorized(contactRes.status)) return { ok: false };
        const contactData = await readJson(contactRes);

        let contactId: string | undefined;
        if (contactRes.status === 409) {
          contactId = contactData.existingContactId as string;
        } else if (contactRes.ok && contactData.ok) {
          contactId = (contactData.contact as { id: string }).id;
        } else {
          return {
            ok: false,
            error: (contactData.error as string) ?? 'Não foi possível criar o contato.',
          };
        }

        const dealRes = await fetch('/api/crm/deals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contactId,
            stageId: input.stageId,
            title: input.title,
            dealValue: input.dealValue,
            priority: input.priority,
            channel: input.channel,
            customFields: input.customFields,
          }),
        });

        if (handleUnauthorized(dealRes.status)) return { ok: false };
        const dealData = await readJson(dealRes);

        if (!dealRes.ok || !dealData.ok) {
          return {
            ok: false,
            error: (dealData.error as string) ?? 'Não foi possível criar a oportunidade.',
          };
        }

        await reload();
        return { ok: true };
      } catch {
        return { ok: false, error: 'Falha de conexão ao criar a oportunidade.' };
      }
    },
    [reload]
  );

  /** Remoção de tag em um clique, direto do card. */
  const detachTag = useCallback(
    async (contactId: string, tagId: string): Promise<void> => {
      const response = await fetch(`/api/crm/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detachTagId: tagId }),
      });

      if (response.ok) {
        setState((s) => ({
          ...s,
          deals: s.deals.map((d) =>
            d.contactId === contactId
              ? { ...d, contact: { ...d.contact, tags: d.contact.tags.filter((t) => t.id !== tagId) } }
              : d
          ),
        }));
      }
    },
    []
  );

  const stages: StageDTO[] = state.pipeline?.stages ?? [];

  return { ...state, stages, reload, moveDeal, createDeal, updateDeal, deleteDeal, detachTag };
}
