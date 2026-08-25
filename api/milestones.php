<?php
require 'helpers.php';
require 'db.php';

$currentUser = require_auth();

// Verificar permissões
if (method() === 'GET') {
    if (!has_permission('milestones_read')) {
        error('Acesso negado: privilégios insuficientes', 403);
    }
} else {
    if (!has_permission('milestones_write')) {
        error('Acesso negado: privilégios insuficientes', 403);
    }
}

$member_id = $_GET['member_id'] ?? null;
$id        = $_GET['id']        ?? null;

if (method() === 'GET' && $member_id) {
    $rows = neon(
        "SELECT * FROM milestones WHERE member_id = $1 ORDER BY achieved_at DESC",
        [$member_id]
    );
    respond($rows);
}

if (method() === 'POST' && $member_id) {
    $b      = body();
    if (empty($b['title'])) error('Título obrigatório');
    $pillar = intval($b['pillar'] ?? 1);
    if ($pillar < 1 || $pillar > 5) error('Pilar deve ser entre 1 e 5');
    $uuid = gen_uuid();

    neon(
        "INSERT INTO milestones (id, member_id, pillar, title, description, achieved_at) VALUES ($1, $2, $3, $4, $5, $6)",
        [$uuid, $member_id, $pillar, trim($b['title']), $b['description'] ?? null, $b['achieved_at'] ?? date('Y-m-d')]
    );

    $row = neon_first("SELECT * FROM milestones WHERE id = $1", [$uuid]);
    respond($row, 201);
}

if (method() === 'DELETE' && $id) {
    $row = neon_first("SELECT id FROM milestones WHERE id = $1", [$id]);
    if (!$row) error('Conquista não encontrada', 404);
    neon("DELETE FROM milestones WHERE id = $1", [$id]);
    respond(null, 204);
}

error('Rota não encontrada', 404);
