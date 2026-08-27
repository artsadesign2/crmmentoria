'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ConversationDTO,
  ConversationDetailDTO,
  ConversationStatus,
  InboxScope,
  MessageDTO,
} from './inbox-types';

/**
 * Estado do Inbox: lista de conversas, conversa aberta e atualização contínua.
 *
 * Concentra aqui tudo o que fala com a rede, para que os componentes recebam
 * apenas dados e callbacks — mesmo contrato de `use-crm.ts`.
 *
 * O nome diz "stream" porque é isso que ele entrega. Por baixo há polling com
 * cursor, e não SSE, porque na Vercel uma conexão SSE mantém uma função aberta
 * e cobra ~60 s de compute por minuto por atendente. Se um dia o app rodar num
 * runtime persistente, só este arquivo muda.
 */

/** Aba em foco: o atendente está lendo. Fora de foco: ninguém precisa de 2 s. */
const INTERVALO_FOCO_MS = 2_000;
const INTERVALO_SEGUNDO_PLANO_MS = 15_000;

/**
 * Duas linhas podem ser gravadas no mesmo milissegundo, e o relógio do banco
 * pode divergir do da função. Perder uma mensagem por isso seria um defeito
 * difícil de reproduzir e grave quando acontecesse, então o cursor recua um
 * segundo e a desduplicação por id cuida da sobreposição.
 */
const SOBREPOSICAO_MS = 1_000;

interface InboxState {
  conversations: ConversationDTO[];
  active: ConversationDetailDTO | null;
  queueCount: number;
  unreadTotal: number;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
}

const ESTADO_INICIAL: InboxState = {
  conversations: [],
  active: null,
  queueCount: 0,
  unreadTotal: 0,
  isLoading: true,
  isSending: false,
  error: null,
};

export interface InboxFilterState {
  scope: InboxScope;
  status: ConversationStatus | 'TODOS';
  search: string;
}

export const FILTROS_INICIAIS: InboxFilterState = {
  scope: 'all',
  status: 'TODOS',
  search: '',
};

type Resultado = { ok: boolean; error?: string };

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

/** Funde por id, com o novo vencendo, e reordena por atividade mais recente. */
function fundirConversas(
  atuais: ConversationDTO[],
  novas: ConversationDTO[]
): ConversationDTO[] {
  if (novas.length === 0) return atuais;

  const porId = new Map(atuais.map((c) => [c.id, c]));
  for (const nova of novas) porId.set(nova.id, nova);

  return [...porId.values()].sort((a, b) => {
    const ta = a.lastMessageAt ?? a.createdAt;
    const tb = b.lastMessageAt ?? b.createdAt;
    return tb.localeCompare(ta);
  });
}

/** Acrescenta só o que ainda não está na thread, preservando a ordem. */
function fundirMensagens(atuais: MessageDTO[], novas: MessageDTO[]): MessageDTO[] {
  if (novas.length === 0) return atuais;

  const conhecidas = new Set(atuais.map((m) => m.id));
  const inéditas = novas.filter((m) => !conhecidas.has(m.id));
  if (inéditas.length === 0) return atuais;

  return [...atuais, ...inéditas].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function useInbox(filters: InboxFilterState) {
  const [state, setState] = useState<InboxState>(ESTADO_INICIAL);

  // Refs porque o laço de polling não deve ser recriado a cada mudança de
  // estado — recriá-lo reiniciaria o intervalo a cada mensagem que chega.
  const cursor = useRef<string | null>(null);
  const conversaAberta = useRef<string | null>(null);

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));

    const params = new URLSearchParams({ scope: filters.scope });
    if (filters.status !== 'TODOS') params.set('status', filters.status);
    if (filters.search.trim()) params.set('q', filters.search.trim());

    try {
      const resposta = await fetch(`/api/crm/conversations?${params}`);
      if (handleUnauthorized(resposta.status)) return;

      const corpo = await readJson(resposta);
      if (!resposta.ok) {
        setState((s) => ({
          ...s,
          isLoading: false,
          error: (corpo.error as string) ?? 'Não foi possível carregar as conversas.',
        }));
        return;
      }

      setState((s) => ({
        ...s,
        conversations: (corpo.conversations as ConversationDTO[]) ?? [],
        isLoading: false,
        error: null,
      }));
    } catch {
      setState((s) => ({ ...s, isLoading: false, error: 'Falha de conexão com o servidor.' }));
    }
  }, [filters.scope, filters.status, filters.search]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Abre a conversa: carrega o histórico e zera o contador de não lidas. */
  const openConversation = useCallback(async (id: string) => {
    conversaAberta.current = id;
    setState((s) => ({ ...s, active: null }));

    const resposta = await fetch(`/api/crm/conversations/${id}`);
    if (handleUnauthorized(resposta.status)) return;

    const corpo = await readJson(resposta);
    if (!resposta.ok) {
      setState((s) => ({ ...s, error: (corpo.error as string) ?? 'Conversa não encontrada.' }));
      return;
    }

    const conversa = corpo.conversation as ConversationDetailDTO;

    setState((s) => ({
      ...s,
      active: conversa,
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, unreadCount: 0 } : c
      ),
    }));
  }, []);

  const closeConversation = useCallback(() => {
    conversaAberta.current = null;
    setState((s) => ({ ...s, active: null }));
  }, []);

  /** Uma consulta por ciclo; o cursor recua a sobreposição antes de perguntar. */
  const puxarNovidades = useCallback(async () => {
    const params = new URLSearchParams();
    if (cursor.current) {
      params.set('since', new Date(Date.parse(cursor.current) - SOBREPOSICAO_MS).toISOString());
    }
    if (conversaAberta.current) params.set('conversationId', conversaAberta.current);

    try {
      const resposta = await fetch(`/api/crm/inbox/updates?${params}`);
      if (resposta.status === 401) return; // O reload trata a sessão expirada.
      if (!resposta.ok) return;

      const corpo = await readJson(resposta);
      cursor.current = corpo.now as string;

      const conversas = (corpo.conversations as ConversationDTO[]) ?? [];
      const mensagens = (corpo.messages as MessageDTO[]) ?? [];

      setState((s) => ({
        ...s,
        conversations: fundirConversas(s.conversations, conversas),
        active: s.active
          ? { ...s.active, messages: fundirMensagens(s.active.messages, mensagens) }
          : s.active,
        queueCount: (corpo.queueCount as number) ?? s.queueCount,
        unreadTotal: (corpo.unreadTotal as number) ?? s.unreadTotal,
      }));
    } catch {
      // Falha de rede num ciclo não é erro de tela: o próximo ciclo tenta de
      // novo. Interromper a interface por uma requisição perdida seria pior.
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let ativo = true;

    const agendar = () => {
      const escondido = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      timer = setTimeout(ciclo, escondido ? INTERVALO_SEGUNDO_PLANO_MS : INTERVALO_FOCO_MS);
    };

    const ciclo = async () => {
      if (!ativo) return;
      await puxarNovidades();
      if (ativo) agendar();
    };

    // Voltar para a aba deve mostrar o estado atual sem esperar o intervalo.
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') void puxarNovidades();
    };

    agendar();
    document.addEventListener('visibilitychange', aoVoltar);

    return () => {
      ativo = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [puxarNovidades]);

  /** Acrescenta a mensagem recém-criada sem esperar o próximo ciclo. */
  const absorverMensagem = useCallback((mensagem: MessageDTO) => {
    setState((s) => ({
      ...s,
      active: s.active
        ? { ...s.active, messages: fundirMensagens(s.active.messages, [mensagem]) }
        : s.active,
    }));
  }, []);

  const enviar = useCallback(
    async (rota: 'messages' | 'notes', text: string): Promise<Resultado> => {
      const id = conversaAberta.current;
      if (!id) return { ok: false, error: 'Nenhuma conversa aberta.' };

      setState((s) => ({ ...s, isSending: true }));

      try {
        const resposta = await fetch(`/api/crm/conversations/${id}/${rota}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (handleUnauthorized(resposta.status)) return { ok: false };

        const corpo = await readJson(resposta);
        setState((s) => ({ ...s, isSending: false }));

        if (!resposta.ok) {
          return { ok: false, error: (corpo.error as string) ?? 'Não foi possível enviar.' };
        }

        const mensagem = corpo.message as MessageDTO;
        absorverMensagem(mensagem);

        // Enviada e recusada pela Evolution: a linha existe, o status conta.
        return mensagem.status === 'FAILED'
          ? { ok: false, error: 'A mensagem não saiu. Verifique a conexão do WhatsApp.' }
          : { ok: true };
      } catch {
        setState((s) => ({ ...s, isSending: false }));
        return { ok: false, error: 'Falha de conexão com o servidor.' };
      }
    },
    [absorverMensagem]
  );

  const sendMessage = useCallback((text: string) => enviar('messages', text), [enviar]);
  const addNote = useCallback((text: string) => enviar('notes', text), [enviar]);

  /** PATCH genérico: assumir, transferir, mudar status. */
  const patchConversation = useCallback(
    async (id: string, body: Record<string, unknown>): Promise<Resultado> => {
      try {
        const resposta = await fetch(`/api/crm/conversations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (handleUnauthorized(resposta.status)) return { ok: false };

        const corpo = await readJson(resposta);
        if (!resposta.ok) {
          return { ok: false, error: (corpo.error as string) ?? 'Não foi possível atualizar.' };
        }

        const atualizada = corpo.conversation as ConversationDTO;

        setState((s) => ({
          ...s,
          conversations: fundirConversas(s.conversations, [atualizada]),
          active: s.active?.id === id ? { ...s.active, ...atualizada } : s.active,
        }));

        return { ok: true };
      } catch {
        return { ok: false, error: 'Falha de conexão com o servidor.' };
      }
    },
    []
  );

  const claimConversation = useCallback(
    (id: string, userId: string) => patchConversation(id, { assignedUserId: userId }),
    [patchConversation]
  );

  const setStatus = useCallback(
    (id: string, status: ConversationStatus) => patchConversation(id, { status }),
    [patchConversation]
  );

  const transfer = useCallback(
    (id: string, departmentId: string | null) => patchConversation(id, { departmentId }),
    [patchConversation]
  );

  const createDeal = useCallback(async (id: string): Promise<Resultado> => {
    const resposta = await fetch(`/api/crm/conversations/${id}/deal`, { method: 'POST' });
    if (handleUnauthorized(resposta.status)) return { ok: false };

    const corpo = await readJson(resposta);
    if (!resposta.ok) {
      return { ok: false, error: (corpo.error as string) ?? 'Não foi possível criar a oportunidade.' };
    }

    // Recarrega o detalhe para o painel mostrar a oportunidade recém-criada.
    if (conversaAberta.current === id) await openConversation(id);
    return { ok: true };
  }, [openConversation]);

  return {
    ...state,
    reload,
    openConversation,
    closeConversation,
    sendMessage,
    addNote,
    claimConversation,
    setStatus,
    transfer,
    createDeal,
  };
}
