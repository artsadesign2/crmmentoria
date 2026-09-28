'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Download,
  Users,
  DollarSign,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  PieChart,
  Clock,
  FileSpreadsheet,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { generateCohortAnalysis, ExecutiveLtvMetrics } from '@/lib/reports/cohort-ltv';
import { toast } from '@/lib/toast-context';

export function CohortLtvView() {
  const [metrics] = useState<ExecutiveLtvMetrics>(() => generateCohortAnalysis());

  const getRetentionColor = (pct: number) => {
    if (pct === 0) return 'bg-transparent text-slate-600';
    if (pct >= 95) return 'bg-emerald-500/25 text-emerald-300 font-extrabold';
    if (pct >= 90) return 'bg-emerald-500/15 text-emerald-400 font-bold';
    if (pct >= 80) return 'bg-blue-500/15 text-blue-300 font-semibold';
    if (pct >= 70) return 'bg-amber-500/15 text-amber-300 font-semibold';
    return 'bg-red-500/15 text-red-300 font-semibold';
  };

  const handleDownloadCSV = () => {
    window.open('/api/reports/cohort?format=csv', '_blank');
    toast.success('Download do Relatório Iniciado!', 'Arquivo CSV estruturado exportado com sucesso.');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#131926] to-[#0B0F17] border border-[#1F293D]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">
              <Sparkles size={12} className="mr-1" /> Inteligência Executiva
            </Badge>
            <span className="text-xs text-slate-400 font-semibold">Análise de Safras & Retenção de Mentorados</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white">
            Matriz de Cohort & Métricas Consolidadas de LTV
          </h2>
        </div>

        <button
          onClick={handleDownloadCSV}
          className="px-4 py-2.5 rounded-xl bg-yellow-500 text-slate-950 font-bold text-xs hover:bg-yellow-400 transition-all flex items-center gap-2 shadow-lg shadow-yellow-500/10 shrink-0"
        >
          <FileSpreadsheet size={15} />
          <span>Exportar Relatório Executivo (Excel / CSV)</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 space-y-2 border-emerald-500/30 bg-[#131926]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">LTV Médio</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">
            R$ {metrics.averageLtv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500">Valor de vida útil por mentorado</p>
        </Card>

        <Card className="p-5 space-y-2 border-indigo-500/30 bg-[#131926]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ratio LTV / CAC</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-400">{metrics.ltvToCacRatio}x</div>
          <p className="text-[11px] text-slate-500">CAC Médio: R$ {metrics.averageCac.toLocaleString('pt-BR')}</p>
        </Card>

        <Card className="p-5 space-y-2 border-yellow-500/30 bg-[#131926]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Taxa de Renovação</span>
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-yellow-400">{metrics.renewalRate}%</div>
          <p className="text-[11px] text-slate-500">Mentees que renovam para o próximo ciclo</p>
        </Card>

        <Card className="p-5 space-y-2 border-blue-500/30 bg-[#131926]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Permanência Média</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-400">{metrics.averageLifetimeMonths} meses</div>
          <p className="text-[11px] text-slate-500">Churn Mensal: {metrics.monthlyChurnRate}%</p>
        </Card>
      </div>

      {/* Cohort Retention Heatmap Table */}
      <Card className="overflow-hidden border-[#1F293D] bg-[#131926]">
        <div className="p-4 border-b border-[#1F293D] flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
            <Layers size={16} className="text-yellow-400" />
            <span>Matriz de Retenção de Safras (Cohort Analysis)</span>
          </h3>
          <span className="text-[11px] text-slate-400">Percentual de mentorados ativos ao longo dos meses</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs">
            <thead className="bg-[#0B0F17] border-b border-[#1F293D] text-slate-400 font-bold uppercase text-[11px]">
              <tr>
                <th className="p-3.5 text-left">Safra (Cohort)</th>
                <th className="p-3.5">Mentees</th>
                <th className="p-3.5">Receita Total</th>
                <th className="p-3.5">Mês 0</th>
                <th className="p-3.5">Mês 1</th>
                <th className="p-3.5">Mês 2</th>
                <th className="p-3.5">Mês 3</th>
                <th className="p-3.5">Mês 6</th>
                <th className="p-3.5">Mês 12</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F293D]/60 text-slate-200">
              {metrics.cohorts.map((c) => (
                <tr key={c.cohortMonth} className="hover:bg-slate-800/20 transition-colors">
                  <td className="p-3.5 text-left font-bold text-white flex items-center gap-2">
                    <Calendar size={13} className="text-yellow-400" />
                    <span>{c.cohortLabel}</span>
                  </td>
                  <td className="p-3.5 font-semibold text-slate-300">{c.initialMentees}</td>
                  <td className="p-3.5 font-bold text-emerald-400">
                    R$ {c.totalRevenue.toLocaleString('pt-BR')}
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-1 rounded-lg text-xs ${getRetentionColor(c.retention.m0)}`}>
                      {c.retention.m0}%
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-1 rounded-lg text-xs ${getRetentionColor(c.retention.m1)}`}>
                      {c.retention.m1}%
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-1 rounded-lg text-xs ${getRetentionColor(c.retention.m2)}`}>
                      {c.retention.m2 ? `${c.retention.m2}%` : '—'}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-1 rounded-lg text-xs ${getRetentionColor(c.retention.m3)}`}>
                      {c.retention.m3 ? `${c.retention.m3}%` : '—'}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-1 rounded-lg text-xs ${getRetentionColor(c.retention.m6)}`}>
                      {c.retention.m6 ? `${c.retention.m6}%` : '—'}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-1 rounded-lg text-xs ${getRetentionColor(c.retention.m12)}`}>
                      {c.retention.m12 ? `${c.retention.m12}%` : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
