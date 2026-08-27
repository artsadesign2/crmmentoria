'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessagesSquare, Loader2, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useInbox, FILTROS_INICIAIS, type InboxFilterState } from '@/lib/crm/use-inbox';
import { ConversationList } from '@/components/crm/inbox/conversation-list';
import { MessageThread } from '@/components/crm/inbox/message-thread';
import { Composer } from '@/components/crm/inbox/composer';
import { ContactPanel } from '@/components/crm/inbox/contact-panel';
import { useAuth } from '@/lib/auth-context';
import { relativeTime } from '@/lib/crm/sla';

/**
 * Inbox multiatendente.
 *
 * Três colunas, que é o padrão do gênero pelo motivo de sempre: a conversa
 * precisa de largura, a lista precisa estar sempre visível e o contexto do
 * cliente não pode custar um clique. Sem invenção de layout aqui — a ousadia
 * está na nota interna, que é onde ela previne um erro sem desfazer.
 *
 * Em tela estreita as colunas viram uma só: lista, e a conversa por cima.
 */

interface Setor {
  id: string;
  name: string;
}

export default function InboxPage() {
  const { currentUser } = useAuth();
  const [filters, setFilters] = useState<InboxFilterState>(FILTROS_INICIAIS);
  const [departments, setDepartments] = useState<Setor[]>([]);

  const inbox = useInbox(filters);

  useEffect(() => {
    let ativo = true;

    void fetch('/api/crm/departments')
      .then((r) => (r.ok ? r.json() : null))
      .then((corpo) => {
        if (ativo && corpo?.departments) setDepartments(corpo.departments as Setor[]);
      })
      .catch(() => {
        // O seletor de transferência simplesmente não aparece. O resto do Inbox
        // funciona sem ele, e um erro na tela por isso seria desproporcional.
      });

    return () => {
      ativo = false;
    };
  }, []);

  const ativa = inbox.active;

  const cabecalho = useMemo(() => {
    if (!ativa) return null;
    return {
      nome: ativa.contact.name,
      detalhe: [ativa.contact.company, ativa.contact.phoneFormatted].filter(Boolean).join(' · '),
      visto: ativa.lastMessageAt ? `Última mensagem ${relativeTime(ativa.lastMessageAt)}` : null,
    };
  }, [ativa]);

  if (inbox.isLoading && inbox.conversations.length === 0) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-[var(--theme-text-secondary)]">
        <Loader2 size={30} className="animate-spin" style={{ color: 'var(--primary-color)' }} />
        <span className="text-sm font-semibold">Carregando atendimentos...</span>
      </div>
    );
  }

  if (inbox.error && inbox.conversations.length === 0) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
        <AlertCircle size={30} className="text-red-400" />
        <p className="text-sm font-semibold text-[var(--theme-text-primary)]">{inbox.error}</p>
        <button
          type="button"
          onClick={() => void inbox.reload()}
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-[#0B0F17]"
          style={{ backgroundColor: 'var(--primary-color)' }}
        >
          <RefreshCw size={13} />
          Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-3">
      <header className="flex shrink-0 flex-wrap items-center gap-2">
        <MessagesSquare size={20} style={{ color: 'var(--primary-color)' }} />
        <h1 className="text-lg font-black text-[var(--theme-text-primary)] sm:text-xl">
          Inbox
        </h1>
        <span className="text-xs font-semibold text-[var(--theme-text-secondary)]">
          Atendimento pelo número da empresa
        </span>

        {inbox.queueCount > 0 && (
          <span
            className="ml-auto rounded-lg px-2 py-1 text-[11px] font-black"
            style={{ backgroundColor: 'var(--theme-badge-bg)', color: 'var(--primary-color)' }}
          >
            {inbox.queueCount} {inbox.queueCount === 1 ? 'aguardando' : 'aguardando'} na fila
          </span>
        )}
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_260px]">
        {/* Lista: escondida em tela estreita quando há conversa aberta. */}
        <div className={`min-h-0 ${ativa ? 'hidden lg:block' : ''}`}>
          <ConversationList
            conversations={inbox.conversations}
            activeId={ativa?.id ?? null}
            filters={filters}
            queueCount={inbox.queueCount}
            onFiltersChange={setFilters}
            onOpen={(id) => void inbox.openConversation(id)}
          />
        </div>

        <div className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] ${ativa ? '' : 'hidden lg:flex'}`}>
          {!ativa ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <MessagesSquare size={26} style={{ color: 'var(--primary-color)' }} />
              <p className="text-sm font-bold text-[var(--theme-text-primary)]">
                Escolha uma conversa para atender.
              </p>
              <p className="max-w-xs text-xs text-[var(--theme-text-secondary)]">
                Tudo que chega no WhatsApp da empresa aparece aqui, distribuído entre quem está
                online.
              </p>
            </div>
          ) : (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-[var(--theme-border)] px-3 py-2">
                <button
                  type="button"
                  onClick={inbox.closeConversation}
                  aria-label="Voltar para a lista"
                  className="rounded-lg p-1 text-[var(--theme-text-secondary)] transition-colors hover:text-[var(--theme-text-primary)] lg:hidden"
                >
                  <ArrowLeft size={16} />
                </button>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-[var(--theme-text-primary)]">
                    {cabecalho?.nome}
                  </p>
                  <p className="truncate text-[10px] text-[var(--theme-text-secondary)]">
                    {cabecalho?.detalhe || cabecalho?.visto || 'Sem dados adicionais'}
                  </p>
                </div>
              </div>

              <MessageThread messages={ativa.messages} />

              <Composer
                conversation={ativa}
                isSending={inbox.isSending}
                onSend={inbox.sendMessage}
                onNote={inbox.addNote}
              />
            </>
          )}
        </div>

        {/* Painel de contexto: some abaixo de xl para a conversa ter largura. */}
        <div className="hidden min-h-0 xl:block">
          {ativa && (
            <ContactPanel
              conversation={ativa}
              departments={departments}
              currentUserId={currentUser.id}
              onClaim={() => inbox.claimConversation(ativa.id, currentUser.id)}
              onTransfer={(departmentId) => inbox.transfer(ativa.id, departmentId)}
              onStatus={(status) => inbox.setStatus(ativa.id, status)}
              onCreateDeal={() => inbox.createDeal(ativa.id)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
