<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$currentUser = [
    'id' => $_SESSION['user_id'] ?? null,
    'name' => $_SESSION['user_name'] ?? 'Tripulante',
    'email' => $_SESSION['user_email'] ?? 'tripulante@rocketclub.com.br',
    'role' => $_SESSION['user_role'] ?? 'funcionario'
];

$pageTitle = $pageTitle ?? 'Rocket Club — Painel da Tripulação';
$currentPage = $currentPage ?? 'dashboard';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta name="robots" content="noindex, nofollow"/>
<title><?= htmlspecialchars($pageTitle) ?></title>
<link id="app-favicon" rel="icon" type="image/webp" href="api/favicon.webp"/>
<link rel="preload" as="image" href="api/system_logo.webp"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.css"/>
<link rel="stylesheet" href="assets/css/style.css?v=2.2.0"/>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<script>
  window.currentUser = <?= json_encode($currentUser) ?>;
  window.currentPage = "<?= htmlspecialchars($currentPage) ?>";
</script>
</head>
<body>

<div class="sidebar-overlay" id="sidebar-overlay" onclick="toggleMobileSidebar()"></div>

<div class="main-container">
