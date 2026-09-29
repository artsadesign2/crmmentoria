'use client';

import React, { useState } from 'react';
import {
  DollarSign,
  QrCode,
  CreditCard,
  Copy,
  Check,
  Send,
  MessageCircle,
  ExternalLink,
  Loader2,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { toast } from '@/lib/toast-context';
import { sendEvolutionWhatsAppMessage } from '@/lib/evolution-api';

interface DealCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId?: string;
  memberId?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  defaultAmount?: number;
  description?: string;
  isRenewal?: boolean;
}

export function DealCheckoutModal({
  isOpen,
  onClose,
  dealId,
  memberId,
  clientName,
  clientEmail = '',
  clientPhone = '',
  defaultAmount = 5000,
  description = 'Fechamento de Mentoria ScaleMentors',
  isRenewal = false,
}: DealCheckoutModalProps) {
  const [amount, setAmount] = useState(defaultAmount.toString());
  const [gateway, setGateway] = useState<'ASAAS' | 'STRIPE'>('ASAAS');
  const [billingType, setBillingType] = useState<'PIX' | 'CREDIT_CARD' | 'BOLETO'>('PIX');
  const [loading, setLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  const handleGenerateCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          memberId,
          clientName,
          clientEmail,
          clientPhone,
          amount: parseFloat(amount) || 0,
          description,
          gateway,
          billingType,
          isRenewal,
        }),
      });

      const json = await res.json();
      if (res.ok && json.ok) {
        setCheckoutData(json.checkout);
        toast.success('Cobrança gerada com sucesso!', 'Pix Copia e Cola e links disponíveis.');
      } else {
        toast.error('Erro ao gerar cobrança', json.error || 'Tente novamente.');
      }
    } catch {
      toast.error('Erro de conexão', 'Não foi possível se comunicar com o gateway.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = () => {
    if (!checkoutData?.pixCopiaECola) return;
    navigator.clipboard.writeText(checkoutData.pixCopiaECola);
    setCopiedPix(true);
    toast.success('Pix Copiado!', 'Código Copia e Cola transferido para a área de transferência.');
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleSendWhatsApp = async () => {
    if (!checkoutData) return;
    setIsSendingWhatsApp(true);
    const phone = clientPhone || '11995302672';
    const val = parseFloat(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    const msg = `Fala, *${clientName}*! 🚀💼\n\nSegue o link oficial para efetivação da sua vaga no *ScaleMentors*:\n\n📋 *Descrição:* ${description}\n💰 *Valor:* R$ ${val}\n\n${
      checkoutData.pixCopiaECola ? `🔑 *Pix Copia e Cola:*\n\`\`\`${checkoutData.pixCopiaECola}\`\`\`\n\n` : ''
    }${checkoutData.paymentLink ? `💳 *Link Seguro de Pagamento:* ${checkoutData.paymentLink}\n\n` : ''}Assim que confirmado, seu acesso é liberado imediatamente! 🛸`;

    try {
      const res = await sendEvolutionWhatsAppMessage(phone, msg);
      if (res.success) {
        toast.success('Cobrança enviada no WhatsApp!', 'Mensagem disparada com sucesso.');
      } else {
        toast.warning(res.error || 'Aviso: WhatsApp em modo simulação.');
      }
    } catch {
      toast.error('Erro ao disparar WhatsApp.');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isRenewal ? '🔄 Checkout de Renovação' : '💰 Gerar Cobrança & Pix'}>
      {!checkoutData ? (
        <form onSubmit={handleGenerateCheckout} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Mentorado / Cliente</label>
            <div className="p-3 bg-[#0B0F17] rounded-xl border border-[#1F293D] text-xs font-semibold text-white">
              {clientName} {clientEmail ? `(${clientEmail})` : ''}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Gateway de Cobrança</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setGateway('ASAAS');
                  setBillingType('PIX');
                }}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  gateway === 'ASAAS'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md'
                    : 'bg-[#0B0F17] text-slate-400 border-[#1F293D]'
                }`}
              >
                <Zap size={14} />
                <span>Asaas (Pix Instantâneo)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setGateway('STRIPE');
                  setBillingType('CREDIT_CARD');
                }}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  gateway === 'STRIPE'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-md'
                    : 'bg-[#0B0F17] text-slate-400 border-[#1F293D]'
                }`}
              >
                <CreditCard size={14} />
                <span>Stripe (Cartão Global)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Valor da Operação (R$)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-sm text-emerald-400 font-black focus:outline-none focus:border-yellow-500/50"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-slate-950" />
                  <span>Gerando Cobrança no Gateway...</span>
                </>
              ) : (
                <>
                  <span>Emitir Pix / Link de Checkout</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-5 text-center">
          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 size={28} />
          </div>

          <div className="space-y-1">
            <h4 className="text-base font-extrabold text-white">Cobrança Pronta para Envio!</h4>
            <p className="text-xs text-slate-400">
              Valor: <strong className="text-emerald-400">R$ {parseFloat(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </p>
          </div>

          {checkoutData.pixCopiaECola && (
            <div className="bg-[#0B0F17] border border-[#1F293D] rounded-2xl p-4 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <QrCode size={13} /> Pix Copia e Cola
                </span>
                <button
                  onClick={handleCopyPix}
                  className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold rounded-lg text-[10px] flex items-center gap-1 transition-colors"
                >
                  {copiedPix ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedPix ? 'Copiado!' : 'Copiar Código'}</span>
                </button>
              </div>
              <div className="p-2.5 bg-black/40 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-300 break-all select-all max-h-20 overflow-y-auto">
                {checkoutData.pixCopiaECola}
              </div>
            </div>
          )}

          {checkoutData.paymentLink && (
            <div className="flex items-center justify-between p-3 bg-[#0B0F17] rounded-xl border border-[#1F293D] text-xs">
              <span className="text-slate-400">Link de Pagamento:</span>
              <a
                href={checkoutData.paymentLink}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>Abrir Checkout</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <button
              onClick={handleSendWhatsApp}
              disabled={isSendingWhatsApp}
              className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              {isSendingWhatsApp ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
              <span>Disparar Cobrança no WhatsApp do Cliente</span>
            </button>

            <button
              onClick={() => {
                setCheckoutData(null);
                onClose();
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
