'use client';

import { useEffect, useState } from 'react';
import { Copy, Send, MessageCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { toast } from '@/lib/toast-context';
import { WHATSAPP_TEMPLATES } from '@/lib/crm/whatsapp-templates';
import type { DealCardDTO } from '@/lib/crm/types';

/**
 * Disparo rápido de WhatsApp a partir do card.
 *
 * Abre o `wa.me` numa aba nova, que é como a tela já funcionava. O envio pela
 * Evolution API entra na F3, junto com o Inbox — aqui seria disparo sem
 * conversa onde registrar a mensagem.
 */

interface WhatsAppQuickModalProps {
  deal: DealCardDTO | null;
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsAppQuickModal({ deal, isOpen, onClose }: WhatsAppQuickModalProps) {
  const [templateIndex, setTemplateIndex] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!deal) return;
    setTemplateIndex(0);
    setMessage(WHATSAPP_TEMPLATES[0].text(deal.contact.name, deal.contact.company ?? 'sua empresa'));
  }, [deal]);

  if (!deal) return null;

  const selecionarTemplate = (index: number) => {
    setTemplateIndex(index);
    setMessage(
      WHATSAPP_TEMPLATES[index].text(deal.contact.name, deal.contact.company ?? 'sua empresa')
    );
  };

  const enviar = () => {
    if (!deal.contact.phone) {
      toast.error('Contato sem telefone', 'Cadastre um número antes de disparar a mensagem.');
      return;
    }

    // O telefone já vem em E.164 sem "+", então o DDI não é acrescentado de novo.
    window.open(
      `https://wa.me/${deal.contact.phone}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );

    toast.success('WhatsApp aberto', `Conversa com ${deal.contact.name} pronta para envio.`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Disparo rápido de WhatsApp"
      subtitle={`${deal.contact.name}${deal.contact.phoneFormatted ? ` · ${deal.contact.phoneFormatted}` : ''}`}
      icon={<MessageCircle size={20} />}
    >
      <div className="space-y-4 text-left">
        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[var(--theme-text-secondary)]">
            Modelo de mensagem
          </label>
          <div className="grid gap-1.5">
            {WHATSAPP_TEMPLATES.map((template, index) => {
              const ativo = index === templateIndex;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => selecionarTemplate(index)}
                  aria-pressed={ativo}
                  className="rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors"
                  style={{
                    borderColor: ativo ? 'var(--primary-color)' : 'var(--theme-border)',
                    backgroundColor: ativo ? 'var(--theme-badge-bg)' : 'transparent',
                    color: ativo ? 'var(--primary-color)' : 'var(--theme-text-secondary)',
                  }}
                >
                  {template.title}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label
            htmlFor="mensagem-whatsapp"
            className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[var(--theme-text-secondary)]"
          >
            Mensagem
          </label>
          <textarea
            id="mensagem-whatsapp"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="w-full resize-y rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-3 text-xs leading-relaxed text-[var(--theme-text-primary)] outline-none transition-colors focus:border-[var(--primary-color)]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(message);
              toast.info('Mensagem copiada', 'O texto está na área de transferência.');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--theme-border)] px-3 py-2 text-xs font-bold text-[var(--theme-text-secondary)] transition-colors hover:text-[var(--theme-text-primary)]"
          >
            <Copy size={13} />
            Copiar
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--theme-border)] px-3 py-2 text-xs font-bold text-[var(--theme-text-secondary)] transition-colors hover:text-[var(--theme-text-primary)]"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={enviar}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-emerald-950 transition-opacity hover:opacity-90"
          >
            <Send size={13} />
            Abrir no WhatsApp
          </button>
        </div>
      </div>
    </Modal>
  );
}
