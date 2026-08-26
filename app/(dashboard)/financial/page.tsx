'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  QrCode,
  Copy,
  Check,
  Send,
  MessageCircle,
  ExternalLink,
  Receipt,
  Search,
  Calendar,
  Users,
  ShieldCheck,
  Zap,
  Clock,
  Trash2,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { DbTransaction } from '@/lib/financial-db';
import { Member, INITIAL_MEMBERS } from '@/lib/mock-data';
import { useTheme } from '@/lib/theme-context';
import { toast } from '@/lib/toast-context';
import { sendEvolutionWhatsAppMessage } from '@/lib/evolution-api';

function getInitialFinancial(): DbTransaction[] {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('rocket_club_cached_financial');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
  }
  return [];
}

export default function FinancialPage() {
  const { isLightMode, activePalette } = useTheme();
  const [transactions, setTransactions] = useState<DbTransaction[]>(() => getInitialFinancial());
  const [membersList, setMembersList] = useState<Member[]>(INITIAL_MEMBERS);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PAID' | 'PENDING' | 'OVERDUE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBillingRulesModalOpen, setIsBillingRulesModalOpen] = useState(false);
  const [selectedTxForPix, setSelectedTxForPix] = useState<DbTransaction | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Form State for New Transaction / Billing
  const [description, setDescription] = useState('Mensalidade do Programa de Mentoria');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [customMemberName, setCustomMemberName] = useState('');
  const [amount, setAmount] = useState('2500');
  const [txType, setTxType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [category, setCategory] = useState('Mensalidade');
  const [status, setStatus] = useState<'PAID' | 'PENDING'>('PENDING');
  const [gatewayChoice, setGatewayChoice] = useState<'ASAAS_PIX' | 'STRIPE' | 'MANUAL'>('ASAAS_PIX');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    if (type === 'success') toast.success(text);
    else if (type === 'info') toast.info(text);
    else toast.warning(text);
  };

  // Background DB fetch
  useEffect(() => {
    // Load members for select dropdown
    fetch('/api/members')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.members) setMembersList(data.members);
      })
      .catch(() => {});

    loadFinancialData();
  }, []);

  async function loadFinancialData() {
    try {
      const res = await fetch('/api/financial');
      const data = await res.json();
      if (data.ok && data.transactions) {
        setTransactions(data.transactions);
        try {
          localStorage.setItem('rocket_club_cached_financial', JSON.stringify(data.transactions));
        } catch (e) {}
      }
    } catch (err) {
      console.error('Failed to load financial data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    setIsSubmitting(true);
    const selectedMember = membersList.find((m) => m.id === selectedMemberId);
    const memberName = selectedMember ? selectedMember.name : customMemberName.trim() || 'Mentorado Rocket Club';

    try {
      const res = await fetch('/api/financial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          amount: parseFloat(amount) || 0,
          type: txType,
          category,
          status,
          dueDate,
          memberId: selectedMemberId || undefined,
          memberName,
          gateway: gatewayChoice === 'ASAAS_PIX' ? 'ASAAS' : gatewayChoice === 'STRIPE' ? 'STRIPE' : 'MANUAL',
          generatePix: gatewayChoice === 'ASAAS_PIX',
          generateStripe: gatewayChoice === 'STRIPE',
          memberEmail: selectedMember?.email || 'contato@cliente.com',
          memberPhone: selectedMember?.phone || '(11) 99530-2672',
          memberCpfCnpj: selectedMember?.cnpj || selectedMember?.cpf || undefined,
        }),
      });

      const data = await res.json();
      if (data.ok && data.transaction) {
        const updated = [data.transaction, ...transactions];
        setTransactions(updated);
        try {
          localStorage.setItem('rocket_club_cached_financial', JSON.stringify(updated));
        } catch (e) {}

        showToast('Cobrança / Transação gerada com sucesso!', 'success');

        // Se gerou Pix ou Link, abre direto o modal para exibir
        if (data.transaction.pixCopiaECola || data.transaction.paymentLink) {
          setSelectedTxForPix(data.transaction);
        }

        setIsAddModalOpen(false);
        setDescription('Mensalidade Programa Rocket');
        setAmount('2500');
        setSelectedMemberId('');
        setCustomMemberName('');
      } else {
        showToast(data.error || 'Erro ao criar transação', 'warning');
      }
    } catch (err) {
      showToast('Erro de conexão ao salvar transação', 'warning');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (txId: string, newStatus: 'PAID' | 'PENDING' | 'CANCELLED') => {
    try {
      const res = await fetch('/api/financial', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: txId, status: newStatus }),
      });

      if (res.ok) {
        const updated = transactions.map((t) => (t.id === txId ? { ...t, status: newStatus } : t));
        setTransactions(updated);
        try {
          localStorage.setItem('rocket_club_cached_financial', JSON.stringify(updated));
        } catch (e) {}
        showToast(`Status atualizado para ${newStatus === 'PAID' ? 'Pago' : newStatus === 'PENDING' ? 'Pendente' : 'Cancelado'}`);
      }
    } catch (err) {
      showToast('Erro ao atualizar status', 'warning');
    }
  };

  const handleDeleteTx = async (txId: string) => {
    if (!confirm('Deseja realmente excluir esta transação?')) return;
    try {
      const res = await fetch(`/api/financial?id=${txId}`, { method: 'DELETE' });
      if (res.ok) {
        const updated = transactions.filter((t) => t.id !== txId);
        setTransactions(updated);
        try {
          localStorage.setItem('rocket_club_cached_financial', JSON.stringify(updated));
        } catch (e) {}
        showToast('Transação excluída com sucesso');
      }
    } catch (err) {
      showToast('Erro ao excluir transação', 'warning');
    }
  };

  const handleSendWhatsAppBilling = async (tx: DbTransaction) => {
    setIsSendingWhatsApp(true);
    const member = membersList.find((m) => m.id === tx.memberId);
    const phone = member?.phone || '11995302672';
    const clientName = tx.memberName || member?.name || 'Tripulante';

    const msg = `Fala, ${clientName}! 🚀💼\n\nPassando para enviar a fatura da sua mensalidade no *Rocket Club*:\n\n📋 *Descrição:* ${tx.description}\n💰 *Valor:* R$ ${tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n🗓️ *Vencimento:* ${tx.dueDate ? new Date(tx.dueDate).toLocaleDateString('pt-BR') : 'Imediato'}\n\n${
      tx.pixCopiaECola ? `🔑 *Pix Copia e Cola:*\n\`\`\`${tx.pixCopiaECola}\`\`\`\n\n` : ''
    }${tx.paymentLink ? `💳 *Link de Pagamento Seguro:* ${tx.paymentLink}\n\n` : ''}Qualquer dúvida estamos à disposição! 🛸`;

    try {
      const res = await sendEvolutionWhatsAppMessage(phone, msg);
      if (res.success) {
        showToast(
          res.isTestRedirected
            ? 'Mensagem enviada no WhatsApp de teste (11995302672) com segurança!'
            : 'Cobrança enviada com sucesso no WhatsApp!',
          'success'
        );
      } else {
        showToast(res.error || 'Falha ao disparar WhatsApp. Verifique as credenciais.', 'warning');
      }
    } catch (e) {
      showToast('Erro ao conectar ao serviço de WhatsApp', 'warning');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // KPIs Calculations
  const metrics = useMemo(() => {
    const income = transactions.filter((t) => t.type === 'INCOME' && t.status === 'PAID').reduce((acc, t) => acc + t.amount, 0);
    const pending = transactions.filter((t) => t.type === 'INCOME' && (t.status === 'PENDING' || t.status === 'OVERDUE')).reduce((acc, t) => acc + t.amount, 0);
    const expenses = transactions.filter((t) => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
    
    // MRR approximation from recurring monthly plans
    const mrr = transactions
      .filter((t) => t.type === 'INCOME' && t.category === 'Mensalidade' && t.status === 'PAID')
      .reduce((acc, t) => acc + t.amount, 0);

    const net = income - expenses;

    return { income, pending, expenses, mrr, net };
  }, [transactions]);

  // Filtering
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesType = filterType === 'ALL' || t.type === filterType;
      const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        t.description.toLowerCase().includes(query) ||
        (t.memberName && t.memberName.toLowerCase().includes(query)) ||
        t.category.toLowerCase().includes(query);

      return matchesType && matchesStatus && matchesQuery;
    });
  }, [transactions, filterType, filterStatus, searchQuery]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 text-xs font-bold ${
              toastMsg.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10'
                : toastMsg.type === 'warning'
                ? 'bg-amber-950/90 text-amber-300 border-amber-500/40 shadow-amber-500/10'
                : 'bg-slate-900 text-slate-200 border-slate-700'
            }`}
          >
            <CheckCircle2 size={16} />
            <span>{toastMsg.text}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Badge variant="default" className="mb-2">
            <DollarSign size={14} className="mr-1.5" /> Gestão Financeira & Cobranças
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Controle de <span className="theme-gradient-text">Mensalidades & Gateways</span>
          </h1>
          <p className={`text-xs sm:text-sm ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
            Emissão de Pix Asaas, assinaturas Stripe, controle de inadimplência e conciliação em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={loadFinancialData}
            className={`p-2.5 rounded-xl border transition-all ${
              isLightMode
                ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                : 'bg-[#131926] text-slate-300 border-[#1F293D] hover:text-white'
            }`}
            title="Atualizar dados do banco"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setIsBillingRulesModalOpen(true)}
            className="px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
            style={{
              backgroundColor: activePalette.tokens.badgeBg,
              color: activePalette.tokens.primary,
              border: `1px solid ${activePalette.tokens.badgeBorder}`,
            }}
          >
            <Zap size={15} />
            <span>Régua de Cobrança IA</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg hover:scale-105 transition-all flex items-center gap-2"
            style={{
              backgroundColor: activePalette.tokens.primary,
              color: isLightMode ? '#FFFFFF' : '#0B0F17',
              boxShadow: `0 4px 15px ${activePalette.tokens.glow}`,
            }}
          >
            <Plus size={16} />
            <span>Gerar Cobrança / Mensalidade</span>
          </button>
        </div>
      </div>

      {/* Gateways Status Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isLightMode ? 'bg-white border-slate-200' : 'bg-[#131926]/90 border-[#1F293D]'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">Gateways de Pagamento Ativos</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PRODUÇÃO / SANDBOX
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Asaas (Pix Instantâneo & Boleto) e Stripe (Cartão Internacional & Recorrência) prontos para receber.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B0F17] border border-[#1F293D] text-[11px] font-bold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Asaas Pix</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B0F17] border border-[#1F293D] text-[11px] font-bold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span>Stripe Card</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="p-5 hover:border-emerald-500/40 transition-all space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recebido no Mês</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            R$ {metrics.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500">Total liquidado via Pix / Cartão</p>
        </Card>

        <Card className="p-5 hover:border-amber-500/40 transition-all space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">A Receber / Pendente</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Clock size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">
            R$ {metrics.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500">Faturas emitidas aguardando pagamento</p>
        </Card>

        <Card className="p-5 hover:border-blue-500/40 transition-all space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">MRR Recorrente</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <RefreshCw size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-400">
            R$ {metrics.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500">Receita mensal das assinaturas ativas</p>
        </Card>

        <Card className="p-5 transition-all space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo Líquido</span>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: activePalette.tokens.badgeBg,
                color: activePalette.tokens.primary,
                borderColor: activePalette.tokens.badgeBorder,
              }}
            >
              <DollarSign size={18} />
            </div>
          </div>
          <div
            className="text-2xl sm:text-3xl font-black"
            style={{ color: activePalette.tokens.primary }}
          >
            R$ {metrics.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500">Receitas - Despesas operacionais</p>
        </Card>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por mentorado, descrição ou categoria..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs focus:outline-none transition-all ${
              isLightMode
                ? 'bg-white border-slate-200 text-slate-900 focus:border-slate-400'
                : 'bg-[#131926] border-[#1F293D] text-slate-100 focus:border-yellow-500/50'
            }`}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type Filter */}
          <div
            className={`flex items-center p-1 rounded-xl border ${
              isLightMode ? 'bg-white border-slate-200' : 'bg-[#131926] border-[#1F293D]'
            }`}
          >
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'INCOME', label: 'Receitas' },
              { id: 'EXPENSE', label: 'Despesas' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterType === f.id
                    ? 'shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                style={
                  filterType === f.id
                    ? {
                        backgroundColor: activePalette.tokens.primary,
                        color: isLightMode ? '#FFFFFF' : '#0B0F17',
                      }
                    : {}
                }
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div
            className={`flex items-center p-1 rounded-xl border ${
              isLightMode ? 'bg-white border-slate-200' : 'bg-[#131926] border-[#1F293D]'
            }`}
          >
            {[
              { id: 'ALL', label: 'Todos Status' },
              { id: 'PAID', label: 'Pago' },
              { id: 'PENDING', label: 'Pendente' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setFilterStatus(s.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === s.id
                    ? 'bg-slate-700 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions Table / List */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`border-b ${
                isLightMode ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#0B0F17]/80 border-[#1F293D] text-slate-400'
              }`}
            >
              <tr>
                <th className="p-4 font-bold uppercase tracking-wider">Descrição / Mentorado</th>
                <th className="p-4 font-bold uppercase tracking-wider">Categoria & Gateway</th>
                <th className="p-4 font-bold uppercase tracking-wider">Vencimento / Data</th>
                <th className="p-4 font-bold uppercase tracking-wider">Valor</th>
                <th className="p-4 font-bold uppercase tracking-wider">Status</th>
                <th className="p-4 font-bold uppercase tracking-wider text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLightMode ? 'divide-slate-200' : 'divide-[#1F293D]/60'}`}>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Nenhuma transação encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isIncome = tx.type === 'INCOME';
                  const isPaid = tx.status === 'PAID';

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-500/5 transition-colors ${
                        isLightMode ? 'text-slate-800' : 'text-slate-200'
                      }`}
                    >
                      {/* Description & Member */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                              isIncome
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}
                          >
                            {isIncome ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                          </div>
                          <div>
                            <div className="font-extrabold text-sm">{tx.description}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Users size={12} />
                              <span>{tx.memberName || 'Geral'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & Gateway */}
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold">{tx.category}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                            {tx.gateway === 'ASAAS' ? (
                              <span className="text-emerald-400">⚡ Asaas Pix</span>
                            ) : tx.gateway === 'STRIPE' ? (
                              <span className="text-indigo-400">💳 Stripe</span>
                            ) : (
                              <span>Manual</span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="p-4 text-slate-400">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Calendar size={13} />
                          <span>
                            {tx.dueDate
                              ? new Date(tx.dueDate).toLocaleDateString('pt-BR')
                              : new Date(tx.date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="p-4">
                        <span
                          className={`font-black text-sm ${
                            isIncome ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {isIncome ? '+' : '-'} R${' '}
                          {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                            isPaid
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : tx.status === 'OVERDUE'
                              ? 'bg-red-500/15 text-red-400 border-red-500/30'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {isPaid ? 'Pago' : tx.status === 'OVERDUE' ? 'Atrasado' : 'Pendente'}
                        </span>
                      </td>

                      {/* Quick Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Pix QR / Link View */}
                          {(tx.pixCopiaECola || tx.paymentLink) && (
                            <button
                              onClick={() => setSelectedTxForPix(tx)}
                              className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all"
                              title="Ver Pix Copia e Cola / QR Code"
                            >
                              <QrCode size={15} />
                            </button>
                          )}

                          {/* WhatsApp Billing Reminder */}
                          <button
                            onClick={() => handleSendWhatsAppBilling(tx)}
                            disabled={isSendingWhatsApp}
                            className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-all"
                            title="Disparar Cobrança WhatsApp (Modo Seguro de Teste Ativo)"
                          >
                            <MessageCircle size={15} />
                          </button>

                          {/* Status Toggle Button */}
                          <button
                            onClick={() => handleUpdateStatus(tx.id, isPaid ? 'PENDING' : 'PAID')}
                            className={`p-2 rounded-lg border transition-all ${
                              isPaid
                                ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20'
                            }`}
                            title={isPaid ? 'Marcar como Pendente' : 'Marcar como Pago'}
                          >
                            <Check size={15} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteTx(tx.id)}
                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all"
                            title="Excluir Transação"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Nova Cobrança / Mensalidade com Gateways */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Gerar Nova Cobrança ou Mensalidade"
      >
        <form onSubmit={handleCreateTransaction} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
              Tipo de Movimentação
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTxType('INCOME')}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                  txType === 'INCOME'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md'
                    : 'bg-[#0B0F17] text-slate-400 border-[#1F293D]'
                }`}
              >
                Receita / Mensalidade (+)
              </button>
              <button
                type="button"
                onClick={() => setTxType('EXPENSE')}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                  txType === 'EXPENSE'
                    ? 'bg-red-500/20 text-red-300 border-red-500/50 shadow-md'
                    : 'bg-[#0B0F17] text-slate-400 border-[#1F293D]'
                }`}
              >
                Despesa / Custo (-)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
              Descrição da Cobrança
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Mensalidade - Mentoria Rocket Scale"
              required
              className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                Vincular Mentorado
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/50"
              >
                <option value="">-- Selecionar da Lista --</option>
                {membersList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.companyName || 'Mentorado'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="2500.00"
                required
                className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-bold focus:outline-none focus:border-yellow-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/50"
              >
                <option value="Mensalidade">Mensalidade Mentoria</option>
                <option value="Imersão">Ingresso Imersão / Mastermind</option>
                <option value="Consultoria">Consultoria Individual</option>
                <option value="Operacional">Custo Operacional</option>
                <option value="Marketing">Tráfego & Marketing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                Data de Vencimento
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-yellow-500/50"
              />
            </div>
          </div>

          {/* Gateway Selector */}
          {txType === 'INCOME' && (
            <div className="p-3.5 rounded-2xl bg-[#0B0F17] border border-[#1F293D] space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Gerar Cobrança Instantânea via Gateway:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setGatewayChoice('ASAAS_PIX')}
                  className={`p-2.5 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition-all ${
                    gatewayChoice === 'ASAAS_PIX'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-lg'
                      : 'bg-[#131926] text-slate-400 border-[#1F293D]'
                  }`}
                >
                  <QrCode size={18} />
                  <span>Pix Asaas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGatewayChoice('STRIPE')}
                  className={`p-2.5 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition-all ${
                    gatewayChoice === 'STRIPE'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/60 shadow-lg'
                      : 'bg-[#131926] text-slate-400 border-[#1F293D]'
                  }`}
                >
                  <CreditCard size={18} />
                  <span>Stripe Cartão</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGatewayChoice('MANUAL')}
                  className={`p-2.5 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition-all ${
                    gatewayChoice === 'MANUAL'
                      ? 'bg-slate-700 text-white border-slate-500'
                      : 'bg-[#131926] text-slate-400 border-[#1F293D]'
                  }`}
                >
                  <Receipt size={18} />
                  <span>Manual</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1F293D]">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-100 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2"
              style={{
                backgroundColor: activePalette.tokens.primary,
                color: isLightMode ? '#FFFFFF' : '#0B0F17',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Gerando...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Salvar & Emitir Cobrança</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Visualizar Pix Copia e Cola & QR Code */}
      <Modal
        isOpen={Boolean(selectedTxForPix)}
        onClose={() => setSelectedTxForPix(null)}
        title="Dados para Pagamento da Mensalidade"
      >
        {selectedTxForPix && (
          <div className="space-y-5 text-center">
            <div className="p-4 rounded-2xl bg-[#0B0F17] border border-emerald-500/30 flex flex-col items-center gap-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {selectedTxForPix.description}
              </div>
              <div className="text-3xl font-black text-emerald-400">
                R$ {selectedTxForPix.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>

              {/* QR Code */}
              {selectedTxForPix.pixQrCodeBase64 && (
                <div className="p-3 bg-white rounded-2xl shadow-xl border border-slate-200">
                  <img
                    src={selectedTxForPix.pixQrCodeBase64}
                    alt="QR Code Pix"
                    className="w-48 h-48 object-contain"
                  />
                </div>
              )}
            </div>

            {/* Pix Copia e Cola */}
            {selectedTxForPix.pixCopiaECola && (
              <div className="space-y-2 text-left">
                <label className="block text-xs font-bold uppercase text-slate-400">
                  Pix Copia e Cola:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={selectedTxForPix.pixCopiaECola}
                    className="flex-1 bg-[#0B0F17] border border-[#1F293D] rounded-xl px-3 py-2 text-[11px] font-mono text-slate-300 select-all"
                  />
                  <button
                    onClick={() => {
                      if (selectedTxForPix.pixCopiaECola) {
                        navigator.clipboard.writeText(selectedTxForPix.pixCopiaECola);
                        setCopiedPix(true);
                        setTimeout(() => setCopiedPix(false), 2500);
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 flex items-center gap-1.5 shrink-0"
                  >
                    {copiedPix ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Stripe / Invoice Link */}
            {selectedTxForPix.paymentLink && (
              <div className="text-left space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-400">
                  Link de Checkout Direto:
                </label>
                <a
                  href={selectedTxForPix.paymentLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-[#0B0F17] hover:bg-[#1E293B] border border-[#1F293D] text-xs font-bold text-indigo-300 transition-colors"
                >
                  <span className="truncate">{selectedTxForPix.paymentLink}</span>
                  <ExternalLink size={14} className="shrink-0 ml-2" />
                </a>
              </div>
            )}

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => handleSendWhatsAppBilling(selectedTxForPix)}
                disabled={isSendingWhatsApp}
                className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2"
              >
                <MessageCircle size={16} />
                <span>Enviar no WhatsApp do Mentorado</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Régua de Cobrança Automática Inteligente */}
      <Modal
        isOpen={isBillingRulesModalOpen}
        onClose={() => setIsBillingRulesModalOpen(false)}
        title="Régua de Cobrança Inteligente & Automação WhatsApp"
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-300">
            A régua automatiza o envio de cobranças nos momentos estratégicos do ciclo, reduzindo a inadimplência com links de Pix Copia e Cola instantâneos.
          </p>

          <div className="space-y-2.5">
            {[
              {
                trigger: 'D-3 (3 dias antes)',
                title: 'Lembrete Preventivo',
                desc: 'Mensagem cordial de planejamento financeiro com chave Pix.',
                time: '09:30',
                badge: 'Ativo',
              },
              {
                trigger: 'D-0 (Dia do Vencimento)',
                title: 'Cobrança do Dia',
                desc: 'Aviso de vencimento com QR Code Pix e link de quitação rápida.',
                time: '10:00',
                badge: 'Ativo',
              },
              {
                trigger: 'D+3 (3 dias após)',
                title: 'Follow-up de Suporte',
                desc: 'Notificação amigável consultando se houve algum problema operacional.',
                time: '14:00',
                badge: 'Ativo',
              },
            ].map((rule, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1F293D] flex items-start justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-yellow-400">{rule.trigger}</span>
                    <span className="text-[10px] text-slate-400 font-bold">• {rule.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{rule.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {rule.badge}
                  </span>
                  <span className="text-[9px] text-slate-500 block mt-1">Horário: {rule.time}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-2">
            <ShieldCheck size={16} className="shrink-0 mt-0.5 text-amber-400" />
            <span>
              <strong>Modo de Teste Seguro Ativo:</strong> Todos os testes de disparo da régua serão enviados exclusivamente para <strong>(11) 99530-2672</strong>, sem impactar nenhum cliente real.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F293D]">
            <button
              onClick={() => setIsBillingRulesModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#0B0F17] border border-[#1F293D] text-xs font-semibold text-slate-300 hover:text-slate-100"
            >
              Fechar
            </button>

            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/financial/billing-bot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ruleId: 'rule-d3',
                      recipientPhone: '11995302672',
                      menteeName: 'Carlos Eduardo Mendes',
                      amount: 5000,
                      dueDate: '10/09/2026',
                    }),
                  });
                  const data = await res.json();
                  if (data.ok) {
                    showToast('Disparo da régua de cobrança testado com sucesso no WhatsApp 11995302672!', 'success');
                    setIsBillingRulesModalOpen(false);
                  } else {
                    showToast(data.error || 'Falha ao testar régua.', 'warning');
                  }
                } catch {
                  showToast('Erro de comunicação com a régua.', 'warning');
                }
              }}
              className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center gap-1.5"
            >
              <Zap size={14} />
              <span>Simular Disparo Seguro da Régua</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
