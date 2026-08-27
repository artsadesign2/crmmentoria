'use client';

import { useState } from 'react';
import {
  Building2,
  Phone,
  Target,
  UserCheck,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';
import { ChannelBadge } from '../channel-badge';
import type { ConversationDetailDTO, ConversationStatus } from '@/lib/crm/inbox-types';

/**
 * Coluna direita: quem é este cliente e o que dá para fazer com o atendimento.
 *
 * Fica sempre visível porque o atendente consulta estes dados no meio da
 * conversa — se custar um clique, ele responde sem consultar.
 */

interface Setor {
  id: string;
  name: string;
}

interface ContactPanelProps {
  conversation: ConversationDetailDTO;
  departments: Setor[];
  currentUserId: string;
  onClaim: () => Promise<{ ok: boolean; error?: string }>;
  onTransfer: (departmentId: string) => Promise<{ ok: boolean; error?: string }>;
  onStatus: (status: ConversationStatus) => Promise<{ ok: boolean; error?: string }>;
  onCreateDeal: () => Promise<{ ok: boolean; error?: string }>;
}

function Linha({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-[11px] text-[var(--theme-text-secondary)]">
      <span className="mt-px shrink-0">{icon}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

function moeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ContactPanel({
  conversation,
  departments,
  currentUserId,
  onClaim,
  onTransfer,
  onStatus,
  onCreateDeal,
}: ContactPanelProps) {
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const executar = async (
    chave: string,
    acao: () => Promise<{ ok: boolean; error?: string }>
  ) => {
    setOcupado(chave);
    setErro(null);
    const resultado = await acao();
    setOcupado(null);
    if (!resultado.ok) setErro(resultado.error ?? 'Não foi possível concluir.');
  };

  const minha = conversation.assignedUserId === currentUserId;
  const naFila = conversation.assignedUserId === null;

  const botao =
    'inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--theme-border)] px-3 py-1.5 text-[11px] font-bold text-[var(--theme-text-secondary)] transition-colors hover:text-[var(--theme-text-primary)] disabled:opacity-50';

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3">
      <div>
        <h2 className="text-sm font-black text-[var(--theme-text-primary)]">
          {conversation.contact.name}
        </h2>
        <div className="mt-1.5 space-y-1">
          {conversation.contact.company && (
            <Linha icon={<Building2 size={11} />}>{conversation.contact.company}</Linha>
          )}
          {conversation.contact.phoneFormatted && (
            <Linha icon={<Phone size={11} />}>{conversation.contact.phoneFormatted}</Linha>
          )}
          <Linha icon={<UserCheck size={11} />}>
            {conversation.assignedUserName ?? 'Na fila, sem responsável'}
          </Linha>
          {conversation.departmentName && (
            <Linha icon={<ArrowRightLeft size={11} />}>{conversation.departmentName}</Linha>
          )}
        </div>
        <div className="mt-2">
          <ChannelBadge channel={conversation.channel} />
        </div>
      </div>

      <div className="border-t border-[var(--theme-border)] pt-3">
        <h3 className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-[var(--theme-text-secondary)]">
          Oportunidade
        </h3>

        {conversation.deal ? (
          <div className="rounded-xl border border-[var(--theme-border)] p-2.5">
            <p className="text-xs font-bold text-[var(--theme-text-primary)]">
              {conversation.deal.title}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--theme-text-secondary)]">
              {conversation.deal.stageName}
            </p>
            <p className="mt-1 text-sm font-black" style={{ color: 'var(--primary-color)' }}>
              {moeda(conversation.deal.dealValue)}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-1.5 text-[11px] leading-snug text-[var(--theme-text-secondary)]">
              Esta conversa ainda não está no funil.
            </p>
            <button
              type="button"
              onClick={() => void executar('deal', onCreateDeal)}
              disabled={ocupado !== null}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-black text-[#0B0F17] transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {ocupado === 'deal' ? <Loader2 size={12} className="animate-spin" /> : <Target size={12} />}
              Criar oportunidade
            </button>
          </>
        )}
      </div>

      <div className="border-t border-[var(--theme-border)] pt-3">
        <h3 className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-[var(--theme-text-secondary)]">
          Atendimento
        </h3>

        <div className="space-y-1.5">
          {naFila && (
            <button
              type="button"
              onClick={() => void executar('claim', onClaim)}
              disabled={ocupado !== null}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-black text-[#0B0F17] transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {ocupado === 'claim' ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <UserCheck size={12} />
              )}
              Assumir atendimento
            </button>
          )}

          {conversation.status !== 'PENDING' && (
            <button
              type="button"
              onClick={() => void executar('pending', () => onStatus('PENDING'))}
              disabled={ocupado !== null}
              className={botao}
            >
              {ocupado === 'pending' ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Clock size={12} />
              )}
              Aguardando o cliente
            </button>
          )}

          {conversation.status !== 'CLOSED' ? (
            <button
              type="button"
              onClick={() => void executar('close', () => onStatus('CLOSED'))}
              disabled={ocupado !== null}
              className={botao}
            >
              {ocupado === 'close' ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <CheckCircle2 size={12} />
              )}
              Encerrar atendimento
            </button>
          ) : (
            <p className="rounded-xl border border-dashed border-[var(--theme-border)] px-3 py-2 text-[11px] leading-snug text-[var(--theme-text-secondary)]">
              Atendimento encerrado. Se o cliente escrever de novo, a conversa reabre sozinha.
            </p>
          )}

          {departments.length > 1 && (
            <div className="pt-1">
              <label
                htmlFor="transferir-setor"
                className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-secondary)]"
              >
                Transferir para
              </label>
              <select
                id="transferir-setor"
                value={conversation.departmentId ?? ''}
                onChange={(e) => void executar('transfer', () => onTransfer(e.target.value))}
                disabled={ocupado !== null}
                className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-1.5 text-[11px] text-[var(--theme-text-primary)] outline-none transition-colors focus:border-[var(--primary-color)] disabled:opacity-50"
              >
                {departments.map((setor) => (
                  <option key={setor.id} value={setor.id}>
                    {setor.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] leading-snug text-[var(--theme-text-secondary)]">
                A conversa volta para a fila do setor de destino.
              </p>
            </div>
          )}
        </div>

        {minha && (
          <p className="mt-2 text-[10px] text-[var(--theme-text-secondary)]">
            Este atendimento é seu.
          </p>
        )}

        {erro && <p className="mt-2 text-[11px] font-bold text-red-400">{erro}</p>}
      </div>
    </div>
  );
}
