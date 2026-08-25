'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Transaction, MOCK_TRANSACTIONS } from '@/lib/mock-data';
import { useTheme } from '@/lib/theme-context';

export default function FinancialPage() {
  const { isLightMode, activePalette } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [description, setDescription] = useState('');
  const [memberName, setMemberName] = useState('');
  const [amount, setAmount] = useState('');
  const [txType, setTxType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [status, setStatus] = useState<'PAID' | 'PENDING'>('PAID');

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      description: description.trim(),
      memberName: memberName.trim() || 'Mentorado Rocket Club',
      amount: parseFloat(amount) || 0,
      type: txType,
      category: txType === 'INCOME' ? 'Mensalidade' : 'Operacional',
      status,
      date: new Date().toISOString(),
    };

    setTransactions([newTx, ...transactions]);
    setDescription('');
    setMemberName('');
    setAmount('');
    setIsAddModalOpen(false);
  };

  const totalIncome = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((acc, t) => acc + t.amount, 0);

  const netBalance = totalIncome - totalExpense;

  const filteredTransactions = transactions.filter((t) => {
    if (filterType === 'ALL') return true;
    return t.type === filterType;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Badge variant="default" className="mb-2">
            <DollarSign size={14} className="mr-1.5" /> Gestão Financeira do Ecossistema
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Controle de <span className="theme-gradient-text">Receitas & Mensalidades</span>
          </h1>
          <p className={`text-xs sm:text-sm ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
            Acompanhe o faturamento, entradas, custos e saídas do ecossistema.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs shadow-md hover:scale-105 transition-all flex items-center gap-2 shrink-0 self-start md:self-auto"
          style={{
            backgroundColor: activePalette.tokens.primary,
            color: isLightMode ? '#FFFFFF' : '#0B0F17',
          }}
        >
          <Plus size={16} />
          <span>Nova Transação</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 hover:border-emerald-500/30 transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Receita Total</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400">
              R$ {totalIncome.toLocaleString('pt-BR')}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Total acumulado de contratos</p>
        </Card>

        <Card className="p-6 hover:border-red-500/30 transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Despesas / Custos</span>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
              <ArrowDownRight size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-red-400">
              R$ {totalExpense.toLocaleString('pt-BR')}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Custos operacionais e eventos</p>
        </Card>

        <Card className="p-6 transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saldo Líquido</span>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: activePalette.tokens.badgeBg,
                color: activePalette.tokens.primary,
                borderColor: activePalette.tokens.badgeBorder,
              }}
            >
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black" style={{ color: activePalette.tokens.primary }}>
              R$ {netBalance.toLocaleString('pt-BR')}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Resultado operacional líquido</p>
        </Card>
      </div>

      {/* Transactions List */}
      <Card className="p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1F293D]">
          <h3 className={`text-lg font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
            <Filter size={18} style={{ color: activePalette.tokens.primary }} />
            <span>Histórico de Transações</span>
          </h3>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === 'ALL'
                  ? 'border shadow-sm'
                  : isLightMode
                  ? 'bg-slate-100 text-slate-600 border border-slate-200'
                  : 'bg-[#0B0F17] text-slate-400 border border-[#1F293D] hover:bg-[#1F293D]'
              }`}
              style={
                filterType === 'ALL'
                  ? {
                      backgroundColor: activePalette.tokens.badgeBg,
                      color: activePalette.tokens.primary,
                      borderColor: activePalette.tokens.primary,
                    }
                  : {}
              }
            >
              Todas
            </button>
            <button
              onClick={() => setFilterType('INCOME')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === 'INCOME'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : isLightMode
                  ? 'bg-slate-100 text-slate-600 border border-slate-200'
                  : 'bg-[#0B0F17] text-slate-400 border border-[#1F293D] hover:bg-[#1F293D]'
              }`}
            >
              Receitas
            </button>
            <button
              onClick={() => setFilterType('EXPENSE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === 'EXPENSE'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : isLightMode
                  ? 'bg-slate-100 text-slate-600 border border-slate-200'
                  : 'bg-[#0B0F17] text-slate-400 border border-[#1F293D] hover:bg-[#1F293D]'
              }`}
            >
              Despesas
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`font-semibold uppercase text-[10px] ${
                isLightMode ? 'bg-slate-100 text-slate-600' : 'bg-[#0B0F17]/60 text-slate-400'
              }`}
            >
              <tr>
                <th className="p-3">Descrição</th>
                <th className="p-3">Mentorado / Categoria</th>
                <th className="p-3">Data</th>
                <th className="p-3">Valor</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F293D]/60">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#1F293D]/30 transition-colors">
                  <td className={`p-3 font-semibold ${isLightMode ? 'text-slate-900' : 'text-slate-100'}`}>
                    {tx.description}
                  </td>
                  <td className="p-3 text-slate-400">{tx.memberName}</td>
                  <td className="p-3 text-slate-500">{new Date(tx.date).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3 font-bold">
                    <span className={tx.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}>
                      {tx.type === 'INCOME' ? '+' : '-'} R$ {tx.amount.toLocaleString('pt-BR')}
                    </span>
                  </td>
                  <td className="p-3">
                    <Badge variant={tx.status === 'PAID' ? 'default' : 'destructive'} className="text-[10px]">
                      {tx.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Standardized Premium New Transaction Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Lançar Nova Transação Financeira"
        subtitle="Adicione uma receita de mensalidade ou despesa operacional"
        icon={<DollarSign size={20} />}
        size="md"
      >
        <form onSubmit={handleCreateTransaction} className="space-y-4 text-xs">
          <div className="space-y-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Descrição</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Mensalidade Mentoria Q4"
                className={`w-full border rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none ${
                  isLightMode
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                }`}
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Mentorado / Cliente / Fornecedor</label>
              <input
                type="text"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="Ex: Carlos Silva (Tech Solutions)"
                className={`w-full border rounded-xl px-3.5 py-2.5 focus:outline-none ${
                  isLightMode
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Valor (R$)</label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="5000"
                  className={`w-full border rounded-xl px-3.5 py-2.5 font-bold focus:outline-none ${
                    isLightMode
                      ? 'bg-white border-slate-300 text-slate-900'
                      : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Tipo</label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as any)}
                  className={`w-full border rounded-xl px-3.5 py-2.5 focus:outline-none font-bold ${
                    isLightMode
                      ? 'bg-white border-slate-300 text-slate-900'
                      : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                  }`}
                >
                  <option value="INCOME">Receita / Entrada (+)</option>
                  <option value="EXPENSE">Despesa / Saída (-)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Status do Pagamento</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className={`w-full border rounded-xl px-3.5 py-2.5 focus:outline-none ${
                  isLightMode
                    ? 'bg-white border-slate-300 text-slate-900'
                    : 'bg-[#0B0F17] border-[#1F293D] text-slate-100'
                }`}
              >
                <option value="PAID">Pago / Confirmado</option>
                <option value="PENDING">Pendente</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#1F293D]">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-[#0B0F17] text-slate-400 text-xs font-semibold hover:text-slate-200 border border-[#1F293D]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-bold text-xs hover:scale-105 transition-all shadow-md"
              style={{
                backgroundColor: activePalette.tokens.primary,
                color: isLightMode ? '#FFFFFF' : '#0B0F17',
              }}
            >
              Lançar Transação
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
