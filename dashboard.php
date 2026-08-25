<?php
$currentPage = 'dashboard';
$pageTitle = 'Dashboard & Visão Geral — Rocket Club';
require_once __DIR__ . '/includes/header.php';
require_once __DIR__ . '/includes/sidebar.php';
?>

<!-- VIEW DEDICADA: DASHBOARD -->
<section id="view-dashboard" class="view-panel active" style="flex:1; display:flex; flex-direction:column; overflow:hidden; width:100%;">
  <div class="dashboard-scroll" style="padding:24px 28px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:24px;">
    <!-- HEALTH SCORE WIDGET -->
    <div class="health-score-card glass-panel">
      <div>
        <span style="font-size:11px; letter-spacing:1.5px; color:var(--gold); text-transform:uppercase; font-weight:700;">HEALTH SCORE DO ECOSSISTEMA</span>
        <h3 style="font-size:20px; font-weight:700; color:var(--text); margin-top:2px;" id="dash-health-status">Tripulação Engajada</h3>
        <p style="font-size:13px; color:var(--muted); margin-top:4px;">Indicador de saúde e progresso contínuo dos mentorados.</p>
      </div>
      <div class="health-score-circle" id="dash-health-score-val">--%</div>
    </div>

    <!-- GRID DE MÉTRICAS -->
    <div class="dash-cards-grid">
      <div class="dash-card">
        <div class="dc-icon" style="background:rgba(223,178,108,0.12); color:var(--gold)"><i class="ti ti-users"></i></div>
        <div class="dc-info">
          <div class="dc-label">Mentorados Totais</div>
          <div class="dc-value" id="dash-m-total">0</div>
        </div>
      </div>
      <div class="dash-card">
        <div class="dc-icon" style="background:rgba(16,185,129,0.12); color:var(--green)"><i class="ti ti-target"></i></div>
        <div class="dc-info">
          <div class="dc-label">Metas Concluídas</div>
          <div class="dc-value" id="dash-g-done">0</div>
        </div>
      </div>
      <div class="dash-card">
        <div class="dc-icon" style="background:rgba(59,130,246,0.12); color:var(--blue)"><i class="ti ti-trophy"></i></div>
        <div class="dc-info">
          <div class="dc-label">Conquistas Batidas</div>
          <div class="dc-value" id="dash-m-milestones">0</div>
        </div>
      </div>
      <div class="dash-card">
        <div class="dc-icon" style="background:rgba(239,68,68,0.12); color:var(--red)"><i class="ti ti-alert-circle"></i></div>
        <div class="dc-info">
          <div class="dc-label">Atenção Urgente</div>
          <div class="dc-value" id="dash-m-urgent">0</div>
        </div>
      </div>
    </div>

    <div class="dash-sections-grid">
      <!-- DISTRIBUIÇÃO DOS STATUS & GRÁFICO VISUAL -->
      <div class="dash-section-card">
        <h3 class="section-title"><i class="ti ti-chart-pie" style="color:var(--gold)"></i> Funil & Status dos Mentorados</h3>
        <div class="chart-container" style="height: 180px; margin-bottom:12px;">
          <canvas id="dashStatusChart"></canvas>
        </div>
        <div class="status-dist-list" id="dash-status-dist">
          <!-- Preenchido via JS -->
        </div>
      </div>

      <!-- ATIVIDADE RECENTE -->
      <div class="dash-section-card">
        <h3 class="section-title"><i class="ti ti-history" style="color:var(--gold)"></i> Atividade & Abordagens Recentes</h3>
        <div class="recent-activity-list" id="dash-recent-activity">
          <!-- Preenchido via JS -->
        </div>
      </div>
    </div>

    <!-- PRÓXIMOS ANIVERSARIANTES -->
    <div class="dash-section-card" style="margin-top: 8px;">
      <h3 class="section-title"><i class="ti ti-gift" style="color:var(--gold)"></i> Próximos Aniversariantes do Ecossistema</h3>
      <div class="birthday-grid">
        <div class="birthday-col">
          <h4 style="font-size: 13px; color: var(--gold); border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">
            <i class="ti ti-calendar-event"></i> Este Mês (<span id="birthdays-current-month-name">Mês Atual</span>)
          </h4>
          <div id="dash-birthdays-current" class="birthday-list"></div>
        </div>
        
        <div class="birthday-col">
          <h4 style="font-size: 13px; color: var(--gold); border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">
            <i class="ti ti-calendar-stats"></i> Próximo Mês (<span id="birthdays-next-month-name">Próximo Mês</span>)
          </h4>
          <div id="dash-birthdays-next" class="birthday-list"></div>
        </div>

        <div class="birthday-col">
          <h4 style="font-size: 13px; color: var(--gold); border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">
            <i class="ti ti-calendar-stats"></i> Mês Subseguinte (<span id="birthdays-next2-month-name">Mês Subseguinte</span>)
          </h4>
          <div id="dash-birthdays-next2" class="birthday-list"></div>
        </div>
      </div>
    </div>

  </div>
</section>

<?php
require_once __DIR__ . '/includes/footer.php';
?>
