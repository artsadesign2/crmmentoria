'use client';

import { useState } from 'react';
import { Send, EyeOff, Loader2, MessageCircle } from 'lucide-react';
import type { ConversationDetailDTO } from '@/lib/crm/inbox-types';

/**
 * Caixa de escrita, com dois modos.
 *
 * O modo muda a cor da borda, o ícone, o texto de apoio e o rótulo do botão ao
 * mesmo tempo. Um só indicador seria fácil de não ver no meio de um
 * atendimento, e o erro que isso causa — mandar para o cliente a observação que
 * era para a equipe — não tem desfazer.
 */

const AMBAR = '#F59E0B';
const AMBAR_FUNDO = 'rgba(245, 158, 11, 0.10)';

type Modo = 'reply' | 'note';

interface ComposerProps {
  conversation: ConversationDetailDTO;
  isSending: boolean;
  onSend: (text: string) => Promise<{ ok: boolean; error?: string }>;
  onNote: (text: string) => Promise<{ ok: boolean; error?: string }>;
}

export function Composer({ conversation, isSending, onSend, onNote }: ComposerProps) {
  const [modo, setModo] = useState<Modo>('reply');
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const semTelefone = !conversation.contact.phone;
  const ehNota = modo === 'note';
  const bloqueado = ehNota ? false : semTelefone;

  const submeter = async () => {
    const conteudo = texto.trim();
    if (!conteudo || isSending || bloqueado) return;

    setErro(null);
    const resultado = ehNota ? await onNote(conteudo) : await onSend(conteudo);

    if (!resultado.ok) {
      setErro(resultado.error ?? 'Não foi possível enviar.');
      return;
    }
    setTexto('');
  };

  const aoTeclar = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter envia, Shift+Enter quebra linha: o hábito de quem usa WhatsApp.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submeter();
    }
  };

  return (
    <div
      className="shrink-0 border-t p-2.5"
      style={{
        borderColor: ehNota ? AMBAR : 'var(--theme-border)',
        backgroundColor: ehNota ? AMBAR_FUNDO : 'transparent',
      }}
    >
      <div className="mb-2 flex gap-1">
        <button
          type="button"
          onClick={() => setModo('reply')}
          aria-pressed={!ehNota}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors"
          style={{
            backgroundColor: !ehNota ? 'var(--theme-badge-bg)' : 'transparent',
            color: !ehNota ? 'var(--primary-color)' : 'var(--theme-text-secondary)',
          }}
        >
          <MessageCircle size={12} />
          Responder ao cliente
        </button>

        <button
          type="button"
          onClick={() => setModo('note')}
          aria-pressed={ehNota}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors"
          style={{
            backgroundColor: ehNota ? 'rgba(245, 158, 11, 0.18)' : 'transparent',
            color: ehNota ? AMBAR : 'var(--theme-text-secondary)',
          }}
        >
          <EyeOff size={12} />
          Nota interna
        </button>
      </div>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={aoTeclar}
        rows={3}
        disabled={bloqueado}
        aria-label={ehNota ? 'Nota interna' : 'Mensagem para o cliente'}
        placeholder={
          bloqueado
            ? 'Este contato não tem telefone cadastrado.'
            : ehNota
              ? 'O que a equipe precisa saber sobre este atendimento…'
              : 'Escreva a resposta. Enter envia, Shift+Enter quebra linha.'
        }
        className="w-full resize-y rounded-xl border bg-[var(--theme-bg)] p-2.5 text-xs leading-relaxed text-[var(--theme-text-primary)] outline-none transition-colors placeholder:text-[var(--theme-text-secondary)] disabled:opacity-60"
        style={{ borderColor: ehNota ? AMBAR : 'var(--theme-border)' }}
      />

      {bloqueado && (
        <p className="mt-1 text-[11px] font-semibold text-[var(--theme-text-secondary)]">
          Cadastre um número no contato para poder responder. A nota interna continua disponível.
        </p>
      )}

      {erro && <p className="mt-1 text-[11px] font-bold text-red-400">{erro}</p>}

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-[var(--theme-text-secondary)]">
          {ehNota
            ? 'Fica registrado na conversa. O cliente não recebe.'
            : 'Sai pelo número da empresa, assinado com seu nome.'}
        </span>

        <button
          type="button"
          onClick={() => void submeter()}
          disabled={!texto.trim() || isSending || bloqueado}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            backgroundColor: ehNota ? AMBAR : 'var(--primary-color)',
            color: '#0B0F17',
          }}
        >
          {isSending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : ehNota ? (
            <EyeOff size={13} />
          ) : (
            <Send size={13} />
          )}
          {ehNota ? 'Salvar nota' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}
