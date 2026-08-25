<?php
$currentPage = 'financial';
$pageTitle = 'Gestão Financeira — Rocket Club';
require_once __DIR__ . '/includes/header.php';
require_once __DIR__ . '/includes/sidebar.php';
?>

<!-- VIEW DEDICADA: FINANCEIRO -->
<section id="view-financial" class="view-panel active" style="flex:1; display:flex; flex-direction:column; overflow-y:auto; padding:24px 28px; width:100%;">
  <div style="display:flex; flex-direction:column; gap:24px; width:100%;">
    
    <!-- Top Financial Actions Bar -->
    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px; background:var(--bg2); padding:16px 20px; border-radius:14px; border:1px solid var(--border);" class="glass-panel">
      <div style="display:flex; gap:8px;">
        <button class="btn btn-sm active" id="btn-fin-tab-overview" onclick="switchFinTab('overview')" style="background:var(--gold); color:#07080c; font-weight:600;"><i class="ti ti-chart-bar"></i> Visão Geral</button>
        <button class="btn btn-sm" id="btn-fin-tab-transactions" onclick="switchFinTab('transactions')" style="background:transparent; color:var(--muted);"><i class="ti ti-receipt-2"></i> Lançamentos</button>
        <button class="btn btn-sm" id="btn-fin-tab-contracts" onclick="switchFinTab('contracts')" style="background:transparent; color:var(--muted);"><i class="ti ti-file-text"></i> Contratos Recorrentes</button>
      </div>
      <div style="display:flex; gap:10px;">
        <button class="btn btn-sm" onclick="openAddFinTransaction('receita')"><i class="ti ti-circle-plus" style="color:var(--green)"></i> Nova Receita</button>
        <button class="btn btn-sm" onclick="openAddFinTransaction('despesa')"><i class="ti ti-circle-minus" style="color:var(--red)"></i> Nova Despesa</button>
        <button class="btn btn-sm gold" onclick="openAddFinContract()"><i class="ti ti-plus"></i> Novo Contrato</button>
      </div>
    </div>

    <!-- Financial KPIs Grid -->
    <div class="dash-cards-grid">
      <div class="dash-card">
        <div class="dc-icon" style="background:rgba(223,178,108,0.12); color:var(--gold);"><i class="ti ti-cash"></i></div>
        <div class="dc-info">
          <div class="dc-label">MRR Recorrente</div>
          <div class="dc-value" id="fin-mrr-val">R$ 0,00</div>
        </div>
      </div>
      <div class="dash-card">
        <div class="dc-icon" style="background:rgba(16,185,129,0.12); color:var(--green);"><i class="ti ti-trending-up"></i></div>
        <div class="dc-info">
          <div class="dc-label">Receita Confirmada (Mês)</div>
          <div class="dc-value" id="fin-income-val">R$ 0,00</div>
        </div>
      </div>
      <div class="dash-card">
        <div class="dc-icon" style="background:rgba(239,68,68,0.12); color:var(--red);"><i class="ti ti-trending-down"></i></div>
        <div class="dc-info">
          <div class="dc-label">Despesas (Mês)</div>
          <div class="dc-value" id="fin-expense-val">R$ 0,00</div>
        </div>
      </div>
      <div class="dash-card">
        <div class="dc-icon" style="background:rgba(245,158,11,0.12); color:var(--yellow);"><i class="ti ti-clock"></i></div>
        <div class="dc-info">
          <div class="dc-label">A Receber (Pendente)</div>
          <div class="dc-value" id="fin-pending-val">R$ 0,00</div>
        </div>
      </div>
    </div>

    <!-- Financial Overview Chart Card -->
    <div class="dash-section-card" id="fin-chart-panel">
      <h3 class="section-title"><i class="ti ti-chart-line" style="color:var(--gold)"></i> Evolução Financeira & Faturamento de Mentoria</h3>
      <div class="chart-container" style="height: 220px;">
        <canvas id="finOverviewChart"></canvas>
      </div>
    </div>

    <!-- Financial Content Section: Transactions & Contracts Table -->
    <div class="dash-section-card" id="fin-panel-main">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
        <h3 class="section-title" id="fin-panel-title"><i class="ti ti-receipt" style="color:var(--gold)"></i> Lançamentos Financeiros</h3>
        <div style="display:flex; gap:10px; align-items:center;">
          <select id="fin-filter-type" onchange="renderFinTransactions()" style="height:34px; font-size:12px; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:0 10px;">
            <option value="">Todos os Tipos</option>
            <option value="receita">Receitas (Entradas)</option>
            <option value="despesa">Despesas (Saídas)</option>
          </select>
          <select id="fin-filter-status" onchange="renderFinTransactions()" style="height:34px; font-size:12px; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:0 10px;">
            <option value="">Todos os Status</option>
            <option value="pago">Pago / Recebido</option>
            <option value="pendente">Pendente</option>
            <option value="atrasado">Atrasado</option>
          </select>
        </div>
      </div>

      <div style="overflow-x:auto;">
        <table class="kanban-table" id="fin-table">
          <thead>
            <tr>
              <th>Vencimento</th>
              <th>Descrição</th>
              <th>Cliente / Fornecedor</th>
              <th>Categoria</th>
              <th>Valor (R$)</th>
              <th>Status</th>
              <th style="text-align:right;">Ações</th>
            </tr>
          </thead>
          <tbody id="fin-transactions-tbody"></tbody>
        </table>
      </div>
    </div>

  </div>
</section>

<?php
require_once __DIR__ . '/includes/footer.php';
?>
