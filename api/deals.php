<?php
require 'helpers.php';
require 'db.php';

$currentUser = require_auth();

if (method() === 'GET') {
    if (!has_permission('members_read')) {
        error('Acesso negado: privilégios insuficientes', 403);
    }
} else {
    if (!has_permission('members_write')) {
        error('Acesso negado: privilégios insuficientes', 403);
    }
}

$member_id = $_GET['member_id'] ?? null;
$id        = $_GET['id']        ?? null;

if (method() === 'GET' && $member_id) {
    $rows = neon(
        "SELECT * FROM member_deals WHERE member_id = $1 ORDER BY deal_date DESC, created_at DESC",
        [$member_id]
    );
    respond($rows);
}

if (method() === 'POST' && $member_id) {
    $b         = body();
    $title     = trim($b['title'] ?? '');
    if (empty($title)) error('Título do negócio obrigatório');

    $partner   = trim($b['partner_member_name'] ?? '');
    $value     = floatval($b['deal_value'] ?? 0);
    $date      = $b['deal_date'] ?? date('Y-m-d');
    $notes     = $b['notes'] ?? null;
    $uuid      = gen_uuid();

    neon(
        "INSERT INTO member_deals (id, member_id, partner_member_name, title, deal_value, deal_date, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [$uuid, $member_id, $partner, $title, $value, $date, $notes]
    );

    $row = neon_first("SELECT * FROM member_deals WHERE id = $1", [$uuid]);
    respond($row, 201);
}

if (method() === 'DELETE' && $id) {
    $row = neon_first("SELECT id FROM member_deals WHERE id = $1", [$id]);
    if (!$row) error('Negócio não encontrado', 404);
    neon("DELETE FROM member_deals WHERE id = $1", [$id]);
    respond(null, 204);
}

error('Rota não encontrada', 404);
