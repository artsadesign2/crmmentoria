'use client';

import { useMemo, useState } from 'react';
import { Target, Loader2, AlertCircle, RefreshCw, Users } from 'lucide-react';
import { useCrm } from '@/lib/crm/use-crm';
import { dealToLead, leadToDealPatch } from '@/lib/crm/adapters';
import { CrmMetrics } from '@/components/crm/crm-metrics';
import { CrmFilters, FILTROS_INICIAIS, type CrmFilterState } from '@/components/crm/crm-filters';
import { KanbanBoard } from '@/components/crm/kanban-board';
import { DealsTable } from '@/components/crm/deals-table';
import { WhatsAppQuickModal } from '@/components/crm/whatsapp-quick-modal';
import { NewDealModal } from '@/components/crm/new-deal-modal';
import { LeadSheet } from '@/components/lead-sheet';
import { ConfirmDeleteModal } from '@/components/ui/confirm-delete-modal';
import { toast } from '@/lib/toast-context';
import { useNotifications } from '@/lib/notification-context';
import type { DealCardDTO, StageDTO } from '@/lib/crm/types';
import type { Lead } from '@/lib/mock-data';

export default function CrmPage() {
  const crm = useCrm();
  const { addNotification } = useNotifications();

  const [filters, setFilters] = useState<CrmFilterState>(FILTROS_INICIAIS);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [selected, setSelected] = useState<DealCardDTO | null>(null);
  const [whatsAppDeal, setWhatsAppDeal] = useState<DealCardDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DealCardDTO | null>(null);
  const [newDealStageId, setNewDealStageId] = useState<string | undefined>();
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);

  const stageName = (stageId: string) =>
    crm.stages.find((s) => s.id === stageId)?.name ?? '';

  const visibleDeals = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return crm.deals.filter((d) => {
      const matchBusca =
        !q ||
        d.contact.name.toLowerCase().includes(q) ||
        (d.contact.company ?? '').toLowerCase().includes(q) ||
        (d.contact.phone ?? '').includes(q.replace(/\D/g, '')) ||
        d.title.toLowerCase().includes(q);

      return (
        matchBusca &&
        (filters.channel === 'TODOS' || d.channel === filters.channel) &&
        (filters.priority === 'TODAS' || d.priority === filters.priority) &&
        (filters.stageId === 'TODAS' || d.stageId === filters.stageId)
      );
    });
  }, [crm.deals, filters]);

  const handleMove = async (dealId: string, toStageId: string) => {
    const deal = crm.deals.find((d) => d.id === dealId);
    const resultado = await crm.moveDeal(dealId, toStageId);

    if (!resultado.ok) {
      if (resultado.error) toast.error('Não foi possível mover', resultado.error);
      return;
    }
    toast.success('Card movido', `"${deal?.contact.name}" está em ${stageName(toStageId)}.`);
  };

  const handleSaveLead = async (lead: Lead) => {
    const resultado = await crm.updateDeal(lead.id, leadToDealPatch(lead));
    if (!resultado.ok) {
      toast.error('Erro ao salvar', resultado.error ?? 'Tente de novo.');
      return;
    }
    toast.success('Oportunidade atualizada', `Dados de "${lead.name}" salvos.`);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const nome = deleteTarget.contact.name;
    const resultado = await crm.deleteDeal(deleteTarget.id);

    setDeleteTarget(null);
    setSelected(null);

    if (!resultado.ok) {
      toast.error('Erro ao excluir', resultado.error ?? 'Tente de novo.');
      return;
    }
    toast.info('Oportunidade excluída', `O card de "${nome}" foi removido.`);
  };

  /** Converte o lead em mentorado. Regra de negócio preservada da versão anterior. */
  const handleConvertToMember = async (lead: Lead) => {
    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lead.name,
          companyName: lead.company,
          specialty: lead.specialty,
          email: lead.email,
          phone: lead.phone,
          monthlyRevenue: lead.currentRevenue || `R$ ${lead.estimatedValue.toLocaleString('pt-BR')}`,
          mainGoal: lead.targetGoal || 'Aceleração de escala e estruturação de time',
          biggestChallenge: lead.mainBottleneck || 'Escala de vendas e processos comerciais',
          status: 'azul',
          notes: `Convertido a partir do Lead CRM (${lead.source}). ${lead.notes}`,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const etapaGanho = crm.stages.find((s) => s.isWon);
      if (etapaGanho) await crm.moveDeal(lead.id, etapaGanho.id);

      addNotification({
        sector: 'crm',
        type: 'success',
        title: `Novo Mentorado Convertido: ${lead.name}`,
        message: `${lead.name} (${lead.company}) agora faz parte da base ativa de mentorados Rocket Club! 🚀`,
        link: '/mentorados',
        actionText: 'Ver Ficha do Mentorado',
      });

      toast.success('Mentorado convertido', `"${lead.name}" entrou na base oficial.`);
    } catch (error) {
      console.error('Erro ao converter lead em mentorado:', error);
      toast.error('Erro na conversão', 'Não foi possível sincronizar com a base de mentorados.');
    }
  };

  const abrirNovaOportunidade = (stage?: StageDTO) => {
    setNewDealStageId(stage?.id ?? crm.stages[0]?.id);
    setIsNewDealOpen(true);
  };

  if (crm.isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-[var(--theme-text-secondary)]">
        <Loader2 size={30} className="animate-spin" style={{ color: 'var(--primary-color)' }} />
        <span className="text-sm font-semibold">Carregando funil de vendas...</span>
      </div>
    );
  }

  if (crm.error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
        <AlertCircle size={30} className="text-red-400" />
        <p className="text-sm font-semibold text-[var(--theme-text-primary)]">{crm.error}</p>
        <button
          type="button"
          onClick={() => void crm.reload()}
          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-[#0B0F17]"
          style={{ backgroundColor: 'var(--primary-color)' }}
        >
          <RefreshCw size={13} />
          Tentar de novo
        </button>
      </div>
    );
  }

  if (!crm.pipeline) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
        <Target size={30} style={{ color: 'var(--primary-color)' }} />
        <p className="text-sm font-semibold text-[var(--theme-text-primary)]">
          Nenhum funil configurado ainda.
        </p>
        <p className="max-w-sm text-xs text-[var(--theme-text-secondary)]">
          Rode <code className="font-mono">npm run db:seed:crm</code> para criar o funil
          Comercial com as seis etapas padrão.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="flex items-center gap-2">
        <Target size={20} style={{ color: 'var(--primary-color)' }} />
        <h1 className="text-lg font-black text-[var(--theme-text-primary)] sm:text-xl">
          {crm.pipeline.name}
        </h1>
        <span className="text-xs font-semibold text-[var(--theme-text-secondary)]">
          Novos leads e follow-ups
        </span>
      </header>

      <CrmMetrics stages={crm.stages} deals={crm.deals} />

      <CrmFilters
        filters={filters}
        onChange={setFilters}
        stages={crm.stages}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddDeal={() => abrirNovaOportunidade()}
      />

      {crm.deals.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--theme-border)] py-16 text-center">
          <Users size={28} style={{ color: 'var(--primary-color)' }} />
          <p className="text-sm font-bold text-[var(--theme-text-primary)]">
            Seu funil está pronto e ainda sem oportunidades.
          </p>
          <p className="max-w-sm text-xs text-[var(--theme-text-secondary)]">
            Cadastre o primeiro lead para começar a acompanhar o pipeline.
          </p>
          <button
            type="button"
            onClick={() => abrirNovaOportunidade()}
            className="rounded-xl px-4 py-2 text-xs font-black text-[#0B0F17]"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            Criar primeira oportunidade
          </button>
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          stages={crm.stages}
          deals={visibleDeals}
          onMove={(id, stageId) => void handleMove(id, stageId)}
          onOpenDeal={setSelected}
          onWhatsApp={setWhatsAppDeal}
          onRemoveTag={(contactId, tagId) => void crm.detachTag(contactId, tagId)}
          onBroadcast={(stage) =>
            toast.info('Envio em massa', `Disponível na F5, para a etapa "${stage.name}".`)
          }
          onAddDeal={abrirNovaOportunidade}
        />
      ) : (
        <DealsTable
          deals={visibleDeals}
          stages={crm.stages}
          onOpenDeal={setSelected}
          onWhatsApp={setWhatsAppDeal}
        />
      )}

      <LeadSheet
        lead={selected ? dealToLead(selected, stageName(selected.stageId)) : null}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        onSave={handleSaveLead}
        onDelete={() => setDeleteTarget(selected)}
        onConvertToMember={handleConvertToMember}
      />

      <WhatsAppQuickModal
        deal={whatsAppDeal}
        isOpen={!!whatsAppDeal}
        onClose={() => setWhatsAppDeal(null)}
      />

      <NewDealModal
        isOpen={isNewDealOpen}
        onClose={() => setIsNewDealOpen(false)}
        stages={crm.stages}
        defaultStageId={newDealStageId}
        onCreate={crm.createDeal}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
        title="Excluir oportunidade"
        itemName={deleteTarget?.contact.name ?? ''}
        description="O card sai do funil. O contato e o histórico de atividades permanecem."
      />
    </div>
  );
}
