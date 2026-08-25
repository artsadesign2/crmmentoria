<?php
require 'helpers.php';
require 'db.php';

$currentUser = require_auth();

// Verificar permissões
if (method() === 'GET') {
    if (!has_permission('contacts_read')) {
        error('Acesso negado: privilégios insuficientes', 403);
    }
} else {
    if (!has_permission('contacts_write')) {
        error('Acesso negado: privilégios insuficientes', 403);
    }
}

$member_id = $_GET['member_id'] ?? null;
$id        = $_GET['id']        ?? null;

if (method() === 'GET' && $member_id) {
    $rows = neon(
        "SELECT * FROM contact_log WHERE member_id = $1 ORDER BY contact_date DESC, created_at DESC",
        [$member_id]
    );
    respond($rows);
}

if (method() === 'POST' && $member_id) {
    $b          = body();
    $types      = ['message', 'call', 'meeting', 'email', 'other'];
    $type       = in_array($b['type'] ?? '', $types) ? $b['type'] : 'message';
    $date       = $b['contact_date'] ?? date('Y-m-d');
    $followUp   = !empty($b['follow_up_date']) ? $b['follow_up_date'] : null;
    // Obter o nome completo do usuário logado diretamente da tabela users do banco
    $authorName = null;
    if (!empty($b['author_name'])) {
        $authorName = trim($b['author_name']);
    }
    if (empty($authorName) && !empty($currentUser['id'])) {
        $uRow = neon_first("SELECT name FROM users WHERE id = $1", [$currentUser['id']]);
        if ($uRow && !empty($uRow['name'])) {
            $authorName = $uRow['name'];
        }
    }
    if (empty($authorName)) {
        $authorName = $currentUser['name'] ?? $currentUser['email'] ?? 'Marcio Araujo';
    }

    $uuid       = gen_uuid();

    neon(
        "INSERT INTO contact_log (id, member_id, type, note, contact_date, author_name, follow_up_date) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [$uuid, $member_id, $type, $b['note'] ?? null, $date, $authorName, $followUp]
    );

    neon(
        "UPDATE members SET last_contact = $1, updated_at = NOW() WHERE id = $2 AND (last_contact IS NULL OR last_contact < $1)",
        [$date, $member_id]
    );

    $log = neon_first("SELECT * FROM contact_log WHERE id = $1", [$uuid]);
    respond($log, 201);
}

if (method() === 'DELETE' && $id) {
    $row = neon_first("SELECT id FROM contact_log WHERE id = $1", [$id]);
    if (!$row) error('Registro não encontrado', 404);
    neon("DELETE FROM contact_log WHERE id = $1", [$id]);
    respond(null, 204);
}

error('Rota não encontrada', 404);
