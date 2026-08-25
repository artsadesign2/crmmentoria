<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Se já estiver logado, redireciona para a página principal (dashboard.php)
if (!empty($_SESSION['user_id'])) {
    header('Location: dashboard.php');
    exit;
}

// Se não estiver logado, redireciona para dashboard.php que exibirá a tela de login
header('Location: dashboard.php');
exit;
