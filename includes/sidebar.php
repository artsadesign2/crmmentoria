<?php
$cp = $currentPage ?? 'dashboard';
?>
<!-- BARRA LATERAL (SIDEBAR) -->
<aside class="sidebar" id="sidebar">
  <div class="sidebar-brand">
    <div class="logo">
      <div class="logo-mark"><img src="api/system_logo.webp" alt="Rocket Club Logo" style="width:100%; height:100%; object-fit:contain;" onerror="this.style.display='none'; if(this.parentElement) this.parentElement.innerText='🚀';" /></div>
    </div>
  </div>
  
  <nav class="sidebar-menu">
    <a href="dashboard.php" class="menu-item <?= $cp === 'dashboard' ? 'active' : '' ?>" id="menu-dashboard" style="text-decoration:none;">
      <i class="ti ti-dashboard"></i>
      <span>Dashboard</span>
    </a>
    <a href="kanban.php" class="menu-item <?= $cp === 'kanban' ? 'active' : '' ?>" id="menu-kanban" style="text-decoration:none;">
      <i class="ti ti-layout-kanban"></i>
      <span>CRM Kanban</span>
    </a>
    <a href="academy.php" class="menu-item <?= $cp === 'academy' ? 'active' : '' ?>" id="menu-academy" style="text-decoration:none;">
      <i class="ti ti-school"></i>
      <span>Rocket Academy</span>
    </a>
    <a href="wiki.php" class="menu-item <?= $cp === 'wiki' ? 'active' : '' ?>" id="menu-wiki" style="text-decoration:none;">
      <i class="ti ti-books"></i>
      <span>Wiki & Conhecimento</span>
    </a>
    <a href="financial.php" class="menu-item <?= $cp === 'financial' ? 'active' : '' ?>" id="menu-financial" style="text-decoration:none;">
      <i class="ti ti-chart-line"></i>
      <span>Financeiro</span>
    </a>
    <a href="events.php" class="menu-item <?= $cp === 'events' ? 'active' : '' ?>" id="menu-events" style="text-decoration:none;">
      <i class="ti ti-calendar-event"></i>
      <span>Eventos</span>
    </a>
    <a href="settings.php" class="menu-item <?= $cp === 'settings' ? 'active' : '' ?>" id="menu-settings" style="text-decoration:none;">
      <i class="ti ti-settings"></i>
      <span>Configurações</span>
    </a>
  </nav>

  <div class="sidebar-footer">
    <div class="user-pill" style="display:flex; align-items:center; gap:10px; padding:8px 12px; background:var(--bg3); border-radius:12px; border:1px solid var(--border);">
      <div class="avatar-sm" style="background:var(--gold); color:#000; font-weight:700; display:flex; align-items:center; justify-content:center; border-radius:50%; width:32px; height:32px; flex-shrink:0;">
        <?= strtoupper(substr($currentUser['name'] ?? 'T', 0, 1)) ?>
      </div>
      <div class="user-info" style="overflow:hidden;">
        <span class="user-name" style="font-weight:600; font-size:13px; color:var(--text); display:block; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;"><?= htmlspecialchars($currentUser['name'] ?? 'Tripulante') ?></span>
        <span class="user-role" style="font-size:10px; color:var(--gold); text-transform:uppercase; font-weight:700; letter-spacing:0.5px;"><?= htmlspecialchars($currentUser['role'] ?? 'Tripulante') ?></span>
      </div>
    </div>
  </div>
</aside>

<main class="content-area">
  <!-- TOPBAR HEADER DE AÇÕES E PERFIL -->
  <header class="header">
    <div style="display:flex; align-items:center; gap:14px;">
      <button class="mobile-toggle" onclick="toggleMobileSidebar()" title="Abrir Menu">
        <i class="ti ti-menu-2"></i>
      </button>
      <h1 class="page-title" id="page-title-text" style="font-size:18px; font-weight:700; color:var(--text); margin:0;">
        <?php
          switch($cp) {
            case 'dashboard': echo 'Dashboard & Visão Geral'; break;
            case 'kanban': echo 'CRM Kanban de Vendas & Mentorados'; break;
            case 'academy': echo 'Rocket Academy — Sala de Aula'; break;
            case 'wiki': echo 'Wiki & Base de Conhecimento'; break;
            case 'financial': echo 'Gestão Financeira do Ecossistema'; break;
            case 'events': echo 'Eventos & Imersões Presenciais'; break;
            case 'settings': echo 'Configurações do Ecossistema'; break;
            default: echo 'Rocket Club CRM'; break;
          }
        ?>
      </h1>
    </div>

    <div class="topbar-actions" style="display:flex; align-items:center; gap:12px;">
      <button class="cmd-palette-trigger" onclick="openCommandPalette()" title="Buscar ou Executar (Ctrl+K)">
        <i class="ti ti-search" style="color:var(--gold)"></i>
        <span>Buscar ou executar...</span>
        <kbd>Ctrl K</kbd>
      </button>

      <button class="btn btn-sm" onclick="document.getElementById('mo-user').classList.add('open')" title="Meu Perfil">
        <i class="ti ti-user-cog" style="color:var(--gold)"></i> Perfil
      </button>
      <button class="btn btn-sm btn-danger" onclick="logout()" title="Sair do Sistema">
        <i class="ti ti-logout"></i> Sair
      </button>
    </div>
  </header>
