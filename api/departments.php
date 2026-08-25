<?php
require 'helpers.php';
require 'db.php';

$currentUser = require_auth();

$id = $_GET['id'] ?? null;

// GET /api/departments.php — Lista os departamentos
if (method() === 'GET') {
    if (!has_permission('departments_read')) {
        error('Acesso negado: privilégios insuficientes', 403);
    }

    try {
        $rows = neon("SELECT id, name, is_fixed FROM departments ORDER BY name ASC");
        respond($rows);
    } catch (Exception $e) {
        error($e->getMessage(), 500);
    }
}

// POST /api/departments.php — Cria novo departamento dinâmico
if (method() === 'POST') {
    if (!has_permission('departments_write')) {
        error('Acesso negado: privilégios insuficientes', 403);
    }

    $b = body();
    $name = trim($b['name'] ?? '');
    if (empty($name)) {
        error('Nome do departamento é obrigatório');
    }

    try {
        // Verifica duplicidade
        $exists = neon_first("SELECT 1 FROM departments WHERE LOWER(name) = LOWER($1)", [$name]);
        if ($exists) {
            error('Este departamento já existe');
        }

        $uuid = gen_uuid();
        neon("INSERT INTO departments (id, name, is_fixed) VALUES ($1, $2, FALSE)", [$uuid, $name]);

        $created = neon_first("SELECT id, name, is_fixed FROM departments WHERE id = $1", [$uuid]);
        respond($created, 201);
    } catch (Exception $e) {
        error($e->getMessage(), 500);
    }
}

// PUT /api/departments.php?id= — Atualiza o nome do departamento
if ((method() === 'PUT' || method() === 'PATCH') && $id) {
    if (!has_permission('departments_write')) {
        error('Acesso negado: privilégios insuficientes', 403);
    }

    $b = body();
    $name = trim($b['name'] ?? '');
    if (empty($name)) {
        error('Nome do departamento é obrigatório');
    }

    try {
        $exists = neon_first("SELECT 1 FROM departments WHERE LOWER(name) = LOWER($1) AND id != $2", [$name, $id]);
        if ($exists) {
            error('Já existe outro departamento com este nome');
        }

        neon("UPDATE departments SET name = $1 WHERE id = $2", [$name, $id]);
        $updated = neon_first("SELECT id, name, is_fixed FROM departments WHERE id = $1", [$id]);
        respond($updated);
    } catch (Exception $e) {
        error($e->getMessage(), 500);
    }
}

// DELETE /api/departments.php?id= — Remove departamento dinâmico
if (method() === 'DELETE' && $id) {
    if (!has_permission('departments_write')) {
        error('Acesso negado: privilégios insuficientes', 403);
    }

    try {
        $dept = neon_first("SELECT is_fixed FROM departments WHERE id = $1", [$id]);
        if (!$dept) {
            error('Departamento não encontrado', 404);
        }

        if ($dept['is_fixed']) {
            error('Departamentos padrão do sistema não podem ser removidos.', 400);
        }

        neon("DELETE FROM departments WHERE id = $1", [$id]);
        respond(null, 204);
    } catch (Exception $e) {
        error($e->getMessage(), 500);
    }
}

error('Rota não encontrada', 404);
