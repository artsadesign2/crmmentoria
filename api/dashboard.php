<?php
require 'helpers.php';
require 'db.php';

$currentUser = require_auth();

// Apenas Master, Admin e Funcionário podem ver as métricas do painel geral
if (!has_permission('members_read')) {
    error('Acesso negado: privilégios insuficientes', 403);
}

$member_id = $_GET['member_id'] ?? null;

// GET ?member_id= — histórico de status do membro
if ($member_id) {
    $rows = neon(
        "SELECT * FROM status_history WHERE member_id = $1 ORDER BY changed_at DESC",
        [$member_id]
    );
    respond($rows);
}

// GET sem parâmetros — estatísticas gerais
try {
    $first = date('Y-m-01');
    $sql = "SELECT 
        (SELECT COUNT(*) FROM members) AS total,
        (SELECT COUNT(*) FROM members WHERE status = 'cinza') AS cinza,
        (SELECT COUNT(*) FROM members WHERE status = 'azul') AS azul,
        (SELECT COUNT(*) FROM members WHERE status = 'verde') AS verde,
        (SELECT COUNT(*) FROM members WHERE status = 'amarela') AS amarela,
        (SELECT COUNT(*) FROM members WHERE status = 'vermelha') AS vermelha,
        (SELECT COUNT(*) FROM goals WHERE status = 'open') AS goals_open,
        (SELECT COUNT(*) FROM goals WHERE status = 'done') AS goals_done,
        (SELECT COUNT(*) FROM milestones) AS milestones_total,
        (SELECT COUNT(*) FROM contact_log WHERE contact_date >= $1) AS contacts_this_month";
        
    $stats = neon_first($sql, [$first]);
 
    respond([
        'total'               => (int)($stats['total'] ?? 0),
        'cinza'               => (int)($stats['cinza'] ?? 0),
        'azul'                => (int)($stats['azul'] ?? 0),
        'verde'               => (int)($stats['verde'] ?? 0),
        'amarela'             => (int)($stats['amarela'] ?? 0),
        'vermelha'            => (int)($stats['vermelha'] ?? 0),
        'goals_open'          => (int)($stats['goals_open'] ?? 0),
        'goals_done'          => (int)($stats['goals_done'] ?? 0),
        'milestones_total'    => (int)($stats['milestones_total'] ?? 0),
        'contacts_this_month' => (int)($stats['contacts_this_month'] ?? 0),
    ]);
} catch (Exception $e) {
    error($e->getMessage(), 500);
}
