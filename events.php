<?php
$currentPage = 'events';
$pageTitle = 'Eventos & Imersões — Rocket Club';
require_once __DIR__ . '/includes/header.php';
require_once __DIR__ . '/includes/sidebar.php';
?>

<!-- VIEW DEDICADA: EVENTOS -->
<section id="view-events" class="view-panel active" style="flex:1; display:flex; flex-direction:column; overflow-y:auto; padding:24px 28px; width:100%;">
  <div style="display:flex; flex-direction:column; gap:24px; width:100%;">
    
    <!-- Header Hero & Novo Evento Button -->
    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px; background:linear-gradient(135deg, rgba(223,178,108,0.08) 0%, rgba(15,17,26,0.95) 100%), var(--bg2); padding:20px 24px; border-radius:16px; border:1px solid var(--border); box-shadow:0 8px 32px rgba(0,0,0,0.3);">
      <div>
        <span style="font-size:11px; font-weight:700; color:var(--gold); text-transform:uppercase; letter-spacing:1px;">CALENDÁRIO DA TRIPULAÇÃO</span>
        <h3 style="font-size:22px; font-weight:700; color:var(--text); margin-top:2px;"><i class="ti ti-calendar-event" style="color:var(--gold)"></i> Eventos & Imersões Exclusivas</h3>
        <p style="font-size:13px; color:var(--muted); margin-top:4px;">Acompanhe a agenda de imersões presenciais, masterminds e confirmação de presença da tripulação.</p>
      </div>
      <div style="display:flex; gap:10px;">
        <button class="btn gold" onclick="openAddEvent()"><i class="ti ti-plus"></i> Novo Evento</button>
      </div>
    </div>

    <!-- Hero Destaque do Próximo Evento -->
    <div id="events-hero-container"></div>

    <!-- Filtros de Categorias de Evento -->
    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
      <div style="display:flex; gap:8px;" id="events-category-filters">
        <button class="btn btn-sm active" onclick="filterEventsCategory('all')" id="btn-ev-cat-all" style="background:var(--gold); color:#07080c; font-weight:600;">Todos os Eventos</button>
        <button class="btn btn-sm" onclick="filterEventsCategory('Imersão Presencial')" id="btn-ev-cat-imersao" style="background:transparent; color:var(--muted);">Imersões Presenciais</button>
        <button class="btn btn-sm" onclick="filterEventsCategory('Mastermind Online')" id="btn-ev-cat-mastermind" style="background:transparent; color:var(--muted);">Masterminds Online</button>
        <button class="btn btn-sm" onclick="filterEventsCategory('Workshop')" id="btn-ev-cat-workshop" style="background:transparent; color:var(--muted);">Workshops & Aulas</button>
      </div>
      <span style="font-size:12px; color:var(--muted);" id="events-count-label">0 eventos listados</span>
    </div>

    <!-- Grid de Cards de Eventos -->
    <div id="events-grid-container" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(340px, 1fr)); gap:20px;">
      <!-- Carregado via JS -->
    </div>
  </div>
</section>

<?php
require_once __DIR__ . '/includes/footer.php';
?>
