<?php
$currentPage = 'settings';
$pageTitle = 'Configurações do Sistema — Rocket Club';
require_once __DIR__ . '/includes/header.php';
require_once __DIR__ . '/includes/sidebar.php';
?>

<!-- VIEW DEDICADA: CONFIGURAÇÕES -->
<section id="view-settings" class="view-panel active" style="flex:1; display:flex; flex-direction:column; overflow:hidden; width:100%;">
  
  <!-- BARRA LATERAL DA SUB-VIEW CONFIGURAÇÕES -->
  <div style="display:flex; flex:1; height:100%; overflow:hidden; width:100%;">
    
    <div style="width:250px; flex-shrink:0; background:var(--bg2); border-right:1px solid var(--border); padding:16px 12px; display:flex; flex-direction:column; gap:6px;">
      <button class="settings-tab active" id="settings-tab-btn-system" onclick="switchSettingsTab('system')">
        <i class="ti ti-adjustments-alt"></i> Configurações do Sistema
      </button>
      <button class="settings-tab" id="settings-tab-btn-users" onclick="switchSettingsTab('users')">
        <i class="ti ti-users"></i> Controle de Usuários
      </button>
      <button class="settings-tab" id="settings-tab-btn-depts" onclick="switchSettingsTab('depts')">
        <i class="ti ti-building-community"></i> Departamentos
      </button>
      <button class="settings-tab" id="settings-tab-btn-csvimport" onclick="switchSettingsTab('csvimport')">
        <i class="ti ti-file-spreadsheet"></i> Importar CSV
      </button>
    </div>

    <!-- Subview: Configurações do Sistema -->
    <div class="settings-scroll" id="settings-subview-system" style="padding:24px 28px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:24px; width:100%; max-width:100%; margin:0;">
      
      <!-- Pilares do Programa -->
      <div class="dash-section-card" style="background:var(--bg2); border:1px solid var(--border); border-radius:14px; padding:20px 24px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
          <div>
            <h3 class="section-title" style="font-size:15px; font-weight:700; color:var(--text); display:flex; align-items:center; gap:8px; margin:0;">
              <i class="ti ti-target" style="color:var(--gold)"></i> Pilares do Programa de Mentoria
            </h3>
            <p style="color:var(--muted); font-size:12px; margin-top:3px;">Defina os nomes dos 5 pilares estratégicos da tripulação.</p>
          </div>
          <span class="badge" style="background:var(--bg3); border:1px solid var(--border); color:var(--gold); font-size:11px; font-weight:600;">5 Pilares</span>
        </div>
        
        <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px;">
          <div class="field">
            <label style="font-size:12px; font-weight:600; color:var(--muted); margin-bottom:4px; display:flex; align-items:center; gap:6px;">
              <span style="width:18px; height:18px; border-radius:50%; background:var(--bg3); border:1px solid var(--border-focus); color:var(--gold); display:inline-flex; align-items:center; justify-content:center; font-size:10px; font-weight:700;">1</span> Pilar 1
            </label>
            <input id="set-pillar-1" type="text" placeholder="Nome do Pilar 1"/>
          </div>
          <div class="field">
            <label style="font-size:12px; font-weight:600; color:var(--muted); margin-bottom:4px; display:flex; align-items:center; gap:6px;">
              <span style="width:18px; height:18px; border-radius:50%; background:var(--bg3); border:1px solid var(--border-focus); color:var(--gold); display:inline-flex; align-items:center; justify-content:center; font-size:10px; font-weight:700;">2</span> Pilar 2
            </label>
            <input id="set-pillar-2" type="text" placeholder="Nome do Pilar 2"/>
          </div>
        </div>
        <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px;">
          <div class="field">
            <label style="font-size:12px; font-weight:600; color:var(--muted); margin-bottom:4px; display:flex; align-items:center; gap:6px;">
              <span style="width:18px; height:18px; border-radius:50%; background:var(--bg3); border:1px solid var(--border-focus); color:var(--gold); display:inline-flex; align-items:center; justify-content:center; font-size:10px; font-weight:700;">3</span> Pilar 3
            </label>
            <input id="set-pillar-3" type="text" placeholder="Nome do Pilar 3"/>
          </div>
          <div class="field">
            <label style="font-size:12px; font-weight:600; color:var(--muted); margin-bottom:4px; display:flex; align-items:center; gap:6px;">
              <span style="width:18px; height:18px; border-radius:50%; background:var(--bg3); border:1px solid var(--border-focus); color:var(--gold); display:inline-flex; align-items:center; justify-content:center; font-size:10px; font-weight:700;">4</span> Pilar 4
            </label>
            <input id="set-pillar-4" type="text" placeholder="Nome do Pilar 4"/>
          </div>
        </div>
        <div class="field">
          <label style="font-size:12px; font-weight:600; color:var(--muted); margin-bottom:4px; display:flex; align-items:center; gap:6px;">
            <span style="width:18px; height:18px; border-radius:50%; background:var(--bg3); border:1px solid var(--border-focus); color:var(--gold); display:inline-flex; align-items:center; justify-content:center; font-size:10px; font-weight:700;">5</span> Pilar 5
          </label>
          <input id="set-pillar-5" type="text" placeholder="Nome do Pilar 5"/>
        </div>
      </div>

      <!-- Status de Operação do Sistema -->
      <div class="dash-section-card" style="background:var(--bg2); border:1px solid var(--border); border-radius:14px; padding:16px 24px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:40px; height:40px; border-radius:10px; background:var(--glow-green); border:1px solid rgba(16,185,129,0.3); color:var(--green); display:flex; align-items:center; justify-content:center; font-size:20px;">
            <i class="ti ti-shield-check"></i>
          </div>
          <div>
            <div style="font-size:13px; font-weight:700; color:var(--text);">Sistema Operacional & Seguro</div>
            <div style="font-size:11px; color:var(--muted); margin-top:2px;">Conexão criptografada (SSL/TLS) e integridade dos serviços ativa.</div>
          </div>
        </div>
        <span class="badge" style="background:var(--glow-green); color:var(--green); border-color:rgba(16,185,129,0.3); font-size:11px; font-weight:600; padding:4px 10px;">
          🟢 100% Operacional
        </span>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:6px">
        <button class="btn gold" onclick="saveSettings()"><i class="ti ti-device-floppy"></i> Salvar Configurações</button>
      </div>
    </div>

    <!-- Subview: Controle de Usuários -->
    <div class="settings-scroll" id="settings-subview-users" style="padding:24px 28px; overflow-y:auto; flex:1; display:none; flex-direction:column; gap:24px; width:100%; max-width:100%; margin:0;">
      <div class="dash-section-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 class="section-title"><i class="ti ti-users" style="color:var(--gold)"></i> Controle de Usuários</h3>
          <button class="btn gold btn-sm" onclick="openUserModal()"><i class="ti ti-plus"></i> Novo Usuário</button>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:13px;">
            <thead>
              <tr style="border-bottom:1px solid var(--border); color:var(--muted);">
                <th style="padding:12px;">Nome</th>
                <th style="padding:12px;">E-mail</th>
                <th style="padding:12px;">Cargo</th>
                <th style="padding:12px; text-align:right;">Ações</th>
              </tr>
            </thead>
            <tbody id="users-table-body"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Subview: Departamentos -->
    <div class="settings-scroll" id="settings-subview-depts" style="padding:24px 28px; overflow-y:auto; flex:1; display:none; flex-direction:column; gap:24px; width:100%; max-width:100%; margin:0;">
      <div class="dash-section-card">
        <h3 class="section-title" style="margin-bottom:12px;"><i class="ti ti-building-community" style="color:var(--gold)"></i> Gerenciar Departamentos</h3>
        <form id="dept-form" onsubmit="saveDepartment(event)" style="display:flex; gap:10px; margin-bottom:20px; align-items:flex-end;">
          <div class="field" style="flex:1; margin-bottom:0;">
            <label style="font-size:12px; color:var(--muted); font-weight:600; display:block; margin-bottom:6px;">NOME DO NOVO DEPARTAMENTO</label>
            <input type="text" id="dept-name" placeholder="Ex: Tecnologia, Marketing, Vendas..." required style="width:100%; height:41px; box-sizing:border-box;" />
          </div>
          <button class="btn gold" type="submit" style="height:41px; box-sizing:border-box; display:inline-flex; align-items:center; justify-content:center; gap:6px;"><i class="ti ti-plus"></i> Adicionar</button>
        </form>

        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; text-align:left; font-size:13px;">
            <thead>
              <tr style="border-bottom:1px solid var(--border); color:var(--muted);">
                <th style="padding:12px;">Nome do Departamento</th>
                <th style="padding:12px;">Tipo</th>
                <th style="padding:12px; text-align:right;">Ações</th>
              </tr>
            </thead>
            <tbody id="depts-table-body"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Subview: Importar via CSV -->
    <div class="settings-scroll" id="settings-subview-csvimport" style="padding:24px 28px; overflow-y:auto; flex:1; display:none; flex-direction:column; gap:24px; width:100%; max-width:100%; margin:0;">
      <div class="dash-section-card">
        <h3 class="section-title"><i class="ti ti-upload" style="color:var(--gold)"></i> Importação de Dados via CSV</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:16px;">
          <div class="file-dropzone-card" onclick="document.getElementById('csv-file-cadastro').click()">
            <input type="file" id="csv-file-cadastro" accept=".csv" style="display:none;" onchange="updateFileLabel('csv-file-cadastro', 'csv-label-cadastro')" />
            <div style="display:flex; align-items:center; gap:14px;">
              <div style="width:44px; height:44px; border-radius:10px; background:rgba(223,178,108,0.1); border:1px solid rgba(223,178,108,0.25); color:var(--gold); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;">
                <i class="ti ti-file-spreadsheet"></i>
              </div>
              <div style="flex:1; min-width:0;">
                <div style="font-size:13px; font-weight:600; color:var(--text);">1. Formulário de Cadastro (CSV)</div>
                <div style="font-size:11px; color:var(--muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" id="csv-label-cadastro">Clique para selecionar o arquivo .csv</div>
              </div>
              <span class="btn gold btn-sm" style="pointer-events:none; flex-shrink:0;"><i class="ti ti-upload"></i> Escolher</span>
            </div>
          </div>

          <div class="file-dropzone-card" onclick="document.getElementById('csv-file-diagnostico').click()">
            <input type="file" id="csv-file-diagnostico" accept=".csv" style="display:none;" onchange="updateFileLabel('csv-file-diagnostico', 'csv-label-diagnostico')" />
            <div style="display:flex; align-items:center; gap:14px;">
              <div style="width:44px; height:44px; border-radius:10px; background:rgba(223,178,108,0.1); border:1px solid rgba(223,178,108,0.25); color:var(--gold); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;">
                <i class="ti ti-activity"></i>
              </div>
              <div style="flex:1; min-width:0;">
                <div style="font-size:13px; font-weight:600; color:var(--text);">2. Formulário de Diagnóstico (CSV)</div>
                <div style="font-size:11px; color:var(--muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" id="csv-label-diagnostico">Clique para selecionar o arquivo .csv</div>
              </div>
              <span class="btn gold btn-sm" style="pointer-events:none; flex-shrink:0;"><i class="ti ti-upload"></i> Escolher</span>
            </div>
          </div>
        </div>
        
        <div style="margin-top:20px; display:flex; justify-content:flex-end;">
          <button class="btn gold" onclick="processCSVFiles()"><i class="ti ti-loader"></i> Processar Arquivos</button>
        </div>
      </div>
    </div>

  </div>
</section>

<?php
require_once __DIR__ . '/includes/footer.php';
?>
