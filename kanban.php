<?php
$currentPage = 'kanban';
$pageTitle = 'CRM Kanban de Vendas — Rocket Club';
require_once __DIR__ . '/includes/header.php';
require_once __DIR__ . '/includes/sidebar.php';
?>

<!-- VIEW DEDICADA: KANBAN -->
<section id="view-kanban" class="view-panel active" style="flex:1; display:flex; flex-direction:column; overflow:hidden; width:100%;">
  <div class="board-filters" style="display:flex; gap:16px; padding:16px 28px; background:var(--bg2); border-bottom:1px solid var(--border); align-items:center; flex-wrap:wrap; width:100%">
    <!-- Botão Gerar Members Book PDF -->
    <button class="btn btn-sm gold" onclick="confirmGeneratePDF()" title="Gerar Members Book PDF" style="display:inline-flex; align-items:center; gap:6px; font-weight:600; font-size:13px; height:34px; padding:0 14px; white-space:nowrap; background:var(--gold); color:#07080c; border:none; border-radius:6px; cursor:pointer;">
      <i class="ti ti-file-type-pdf" style="font-size:16px;"></i> Members Book
    </button>


    <div style="position:relative; flex:1; min-width:200px; max-width:300px;">
      <i class="ti ti-search" style="position:absolute; left:10px; top:9px; color:var(--muted)"></i>
      <input type="text" id="kanban-search" oninput="triggerFilter()" placeholder="Buscar mentorado, empresa..." style="width:100%; padding-left:32px; padding-right:30px; height:34px; font-size:13px; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text)" />
      <i class="ti ti-x" id="kanban-search-clear" onclick="clearSearchFilter()" title="Limpar busca" style="position:absolute; right:8px; top:8px; color:var(--muted); font-size:16px; cursor:pointer; display:none; padding:2px; border-radius:50%;"></i>
    </div>

    <div style="min-width:150px; max-width:200px; width:100%;">
      <select id="kanban-filter-specialty" onchange="triggerFilter()" style="width:100%; height:34px; font-size:13px; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:0 10px; cursor:pointer;">
        <option value="">Todas Especialidades</option>
      </select>
    </div>

    <div style="min-width:170px; max-width:220px; width:100%;">
      <select id="kanban-filter-contact" onchange="triggerFilter()" style="width:100%; height:34px; font-size:13px; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:0 10px; cursor:pointer;">
        <option value="">Qualquer data de contato</option>
        <option value="never">Nunca contactado</option>
        <option value="delayed15">Sem contato há +15 dias</option>
        <option value="delayed30">Sem contato há +30 dias</option>
        <option value="recent">Contato recente (últimos 7 dias)</option>
      </select>
    </div>

    <div style="min-width:170px; max-width:220px; width:100%;">
      <select id="kanban-filter-book" onchange="triggerFilter()" style="width:100%; height:34px; font-size:13px; border-radius:6px; background:var(--bg3); border:1px solid var(--border); color:var(--text); padding:0 10px; cursor:pointer;">
        <option value="">Exibição no Members Book</option>
        <option value="included">Incluídos no Members Book</option>
        <option value="excluded">Ocultados do Members Book</option>
      </select>
    </div>

    <div style="font-size:12px; color:var(--gold); font-weight:600; margin-left:auto;" id="kanban-filter-count">
      Mostrando 0 de 0 mentorados
    </div>
  </div>

  <div id="kanban-table-container" style="display:none; flex:1; overflow:auto; padding:0 28px;">
    <table class="kanban-table">
      <thead>
        <tr>
          <th>Membro</th>
          <th>Status</th>
          <th>Especialidade</th>
          <th>Contato</th>
          <th>Cidade / Estado</th>
          <th>Última Abordagem</th>
          <th style="text-align:right;">Ações</th>
        </tr>
      </thead>
      <tbody id="kanban-table-body"></tbody>
    </table>
  </div>

  <div class="board-scroll" id="kanban-cols-container" style="flex:1; overflow:auto;">
    <div class="board">
      <div class="col cinza" ondragover="onOver(event,'cinza')" ondrop="onDrop(event,'cinza')" ondragleave="onLeave(event)">
        <div class="col-head">
          <div class="col-title"><div class="dot"></div><span style="color:var(--gray)">Não Alocados</span></div>
          <span class="badge" id="b-cinza">0</span>
        </div>
        <div class="cards" id="cards-cinza"></div>
        <button class="add-btn" onclick="openAdd('cinza')"><i class="ti ti-plus"></i> Adicionar</button>
      </div>
      <div class="col azul" ondragover="onOver(event,'azul')" ondrop="onDrop(event,'azul')" ondragleave="onLeave(event)">
        <div class="col-head">
          <div class="col-title"><div class="dot"></div><span style="color:var(--blue)">Iniciantes</span></div>
          <span class="badge" id="b-azul">0</span>
        </div>
        <div class="cards" id="cards-azul"></div>
        <button class="add-btn" onclick="openAdd('azul')"><i class="ti ti-plus"></i> Adicionar</button>
      </div>
      <div class="col verde" ondragover="onOver(event,'verde')" ondrop="onDrop(event,'verde')" ondragleave="onLeave(event)">
        <div class="col-head">
          <div class="col-title"><div class="dot"></div><span style="color:var(--green)">Engajados</span></div>
          <span class="badge" id="b-verde">0</span>
        </div>
        <div class="cards" id="cards-verde"></div>
        <button class="add-btn" onclick="openAdd('verde')"><i class="ti ti-plus"></i> Adicionar</button>
      </div>
      <div class="col amarela" ondragover="onOver(event,'amarela')" ondrop="onDrop(event,'amarela')" ondragleave="onLeave(event)">
        <div class="col-head">
          <div class="col-title"><div class="dot"></div><span style="color:var(--yellow)">Mornos</span></div>
          <span class="badge" id="b-amarela">0</span>
        </div>
        <div class="cards" id="cards-amarela"></div>
        <button class="add-btn" onclick="openAdd('amarela')"><i class="ti ti-plus"></i> Adicionar</button>
      </div>
      <div class="col vermelha" ondragover="onOver(event,'vermelha')" ondrop="onDrop(event,'vermelha')" ondragleave="onLeave(event)">
        <div class="col-head">
          <div class="col-title"><div class="dot"></div><span style="color:var(--red)">Atenção Urgente</span></div>
          <span class="badge" id="b-vermelha">0</span>
        </div>
        <div class="cards" id="cards-vermelha"></div>
        <button class="add-btn" onclick="openAdd('vermelha')"><i class="ti ti-plus"></i> Adicionar</button>
      </div>
    </div>
  </div>
</section>

<?php
require_once __DIR__ . '/includes/footer.php';
?>
