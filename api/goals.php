<?php
require 'helpers.php';
require 'db.php';

$currentUser = require_auth();

// Verificar permissões
if (method() === 'GET') {
    if (!has_permission('goals_read')) {
        error('Acesso negado: privilégios insuficientes', 403);
    }
} else {
    if (!has_permission('goals_write')) {
        error('Acesso negado: privilégios insuficientes', 403);
    }
}

$member_id = $_GET['member_id'] ?? null;
$id        = $_GET['id']        ?? null;

if (method() === 'GET' && $member_id) {
    $rows = neon(
        "SELECT * FROM goals WHERE member_id = $1 ORDER BY status ASC, due_date ASC NULLS LAST",
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
        "INSERT INTO goals (id, member_id, pillar, title, description, due_date) VALUES ($1, $2, $3, $4, $5, $6)",
        [$uuid, $member_id, $pillar, trim($b['title']), $b['description'] ?? null, $b['due_date'] ?? null]
    );

    $row = neon_first("SELECT * FROM goals WHERE id = $1", [$uuid]);
    respond($row, 201);
}

if (method() === 'PATCH' && $id) {
    $b    = body();
    $sets = [];
    $vals = [];
    $i    = 1;

    if (isset($b['status'])) {
        $sets[] = "status = \$$i"; $vals[] = $b['status']; $i++;
        if ($b['status'] === 'done') {
            $sets[] = "completed_at = CURRENT_DATE";
        } else {
            $sets[] = "completed_at = NULL";
        }
    }
    if (isset($b['title']))       { $sets[] = "title = \$$i";       $vals[] = $b['title'];       $i++; }
    if (isset($b['description'])) { $sets[] = "description = \$$i"; $vals[] = $b['description']; $i++; }
    if (isset($b['due_date']))    { $sets[] = "due_date = \$$i";    $vals[] = $b['due_date'];    $i++; }

    if (empty($sets)) error('Nada para atualizar');
    $vals[] = $id;
    neon("UPDATE goals SET " . implode(', ', $sets) . " WHERE id = \$$i", $vals);

    $row = neon_first("SELECT * FROM goals WHERE id = $1", [$id]);
    respond($row);
}

if (method() === 'DELETE' && $id) {
    $row = neon_first("SELECT id FROM goals WHERE id = $1", [$id]);
    if (!$row) error('Meta não encontrada', 404);
    neon("DELETE FROM goals WHERE id = $1", [$id]);
    respond(null, 204);
}

error('Rota não encontrada', 404);
