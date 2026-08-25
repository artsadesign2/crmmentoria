<?php
require 'helpers.php';
require 'db.php';

$currentUser = require_auth();

// Apenas Master ou Admin podem acessar ou gerenciar usuários
if ($currentUser['role'] !== 'master' && $currentUser['role'] !== 'admin') {
    error('Acesso negado: privilégios insuficientes', 403);
}

$id     = $_GET['id'] ?? null;
$action = $_GET['action'] ?? null;

// GET /api/users.php — Lista todos os usuários e suas permissões
if (method() === 'GET' && !$id) {
    try {
        $users = neon("SELECT id, email, name, role, created_at FROM users ORDER BY name ASC");
        
        // Se for Master, carregar também os overrides de permissão de todos os funcionários
        if ($currentUser['role'] === 'master') {
            foreach ($users as &$u) {
                $u['permissions'] = [];
                if ($u['role'] === 'funcionario') {
                    $perms = neon("SELECT permission FROM user_permissions WHERE user_id = $1", [$u['id']]);
                    $u['permissions'] = array_column($perms, 'permission');
                }
            }
        }
        respond($users);
    } catch (Exception $e) {
        error($e->getMessage(), 500);
    }
}

// POST /api/users.php — Cadastra novo usuário
if (method() === 'POST' && !$id && !$action) {
    $b = body();
    $name = trim($b['name'] ?? '');
    $email = trim($b['email'] ?? '');
    $password = $b['password'] ?? '';
    $role = $b['role'] ?? 'funcionario';

    if (empty($name) || empty($email) || empty($password)) {
        error('Nome, e-mail e senha são obrigatórios');
    }

    if (strlen($password) < 6) {
        error('A senha deve ter pelo menos 6 caracteres');
    }

    $valid_roles = ['admin', 'funcionario', 'cliente'];
    if ($currentUser['role'] === 'master') {
        $valid_roles[] = 'master';
    }
    if (!in_array($role, $valid_roles)) {
        error('Cargo inválido');
    }

    try {
        // Verifica duplicidade de e-mail
        $exists = neon_first("SELECT 1 FROM users WHERE email = $1", [$email]);
        if ($exists) {
            error('Este e-mail já está cadastrado');
        }

        $uuid = gen_uuid();
        $hash = password_hash($password, PASSWORD_DEFAULT);

        neon(
            "INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)",
            [$uuid, $name, $email, $hash, $role]
        );

        $created = neon_first("SELECT id, name, email, role, created_at FROM users WHERE id = $1", [$uuid]);
        respond($created, 201);
    } catch (Exception $e) {
        error($e->getMessage(), 500);
    }
}

// PATCH /api/users.php?id={uuid} — Atualiza usuário
if (method() === 'PATCH' && $id) {
    $b = body();
    
    // Verifica se usuário alvo existe
    $target = neon_first("SELECT id, role, email FROM users WHERE id = $1", [$id]);
    if (!$target) {
        error('Usuário não encontrado', 404);
    }

    // Apenas Master pode alterar Master ou Admin. Admin não pode alterar Master nem outro Admin.
    if ($currentUser['role'] === 'admin' && ($target['role'] === 'master' || $target['role'] === 'admin')) {
        error('Acesso negado: você não tem permissão para alterar este usuário', 403);
    }

    $sets = [];
    $vals = [];
    $idx = 1;

    if (isset($b['name'])) {
        $sets[] = "name = \$$idx"; $vals[] = trim($b['name']); $idx++;
    }
    if (isset($b['email'])) {
        $email = trim($b['email']);
        // Verifica duplicidade
        $exists = neon_first("SELECT 1 FROM users WHERE email = $1 AND id <> $2", [$email, $id]);
        if ($exists) {
            error('Este e-mail já está cadastrado por outro usuário');
        }
        $sets[] = "email = \$$idx"; $vals[] = $email; $idx++;
    }
    if (isset($b['password']) && !empty($b['password'])) {
        if (strlen($b['password']) < 6) {
            error('A senha deve ter pelo menos 6 caracteres');
        }
        $sets[] = "password_hash = \$$idx"; $vals[] = password_hash($b['password'], PASSWORD_DEFAULT); $idx++;
    }
    if (isset($b['role'])) {
        $role = $b['role'];
        $valid_roles = ['admin', 'funcionario', 'cliente'];
        if ($currentUser['role'] === 'master') {
            $valid_roles[] = 'master';
        }
        if (!in_array($role, $valid_roles)) {
            error('Cargo inválido');
        }
        // Não permitir mudar o cargo do próprio Master se for o último
        if ($target['role'] === 'master' && $role !== 'master') {
            $masters_count = neon_first("SELECT COUNT(*) as count FROM users WHERE role = 'master'");
            if ($masters_count['count'] <= 1) {
                error('Não é possível alterar o cargo do único usuário Master ativo.');
            }
        }
        $sets[] = "role = \$$idx"; $vals[] = $role; $idx++;
    }

    if (empty($sets)) {
        error('Nada para atualizar');
    }

    $vals[] = $id;
    try {
        neon("UPDATE users SET " . implode(', ', $sets) . " WHERE id = \$$idx", $vals);
        $updated = neon_first("SELECT id, name, email, role FROM users WHERE id = $1", [$id]);
        respond($updated);
    } catch (Exception $e) {
        error($e->getMessage(), 500);
    }
}

// POST /api/users.php?action=set_permissions — Grava overrides de permissão (Apenas Master)
if (method() === 'POST' && $action === 'set_permissions') {
    if ($currentUser['role'] !== 'master') {
        error('Acesso negado: apenas o usuário Master pode gerenciar permissões', 403);
    }

    $b = body();
    $target_user_id = $b['user_id'] ?? null;
    $permissions = $b['permissions'] ?? []; // Array de strings

    if (!$target_user_id) {
        error('ID do usuário alvo é obrigatório');
    }

    try {
        $target = neon_first("SELECT role FROM users WHERE id = $1", [$target_user_id]);
        if (!$target) {
            error('Usuário alvo não encontrado', 404);
        }
        if ($target['role'] !== 'funcionario') {
            error('Permissões granulares só podem ser atribuídas a usuários com o cargo de Funcionário');
        }

        // Limpa permissões antigas
        neon("DELETE FROM user_permissions WHERE user_id = $1", [$target_user_id]);

        // Insere as novas
        $valid_permissions = ['members_write', 'contacts_write', 'goals_write', 'milestones_write', 'wiki_write', 'departments_write'];
        foreach ($permissions as $perm) {
            if (in_array($perm, $valid_permissions)) {
                neon("INSERT INTO user_permissions (user_id, permission) VALUES ($1, $2)", [$target_user_id, $perm]);
            }
        }

        respond(['ok' => true, 'message' => 'Permissões atualizadas com sucesso']);
    } catch (Exception $e) {
        error($e->getMessage(), 500);
    }
}

// DELETE /api/users.php?id={uuid} — Remove usuário
if (method() === 'DELETE' && $id) {
    try {
        $target = neon_first("SELECT role FROM users WHERE id = $1", [$id]);
        if (!$target) {
            error('Usuário não encontrado', 404);
        }

        // Apenas Master pode remover Master ou Admin. Admin não pode remover Master nem outro Admin.
        if ($currentUser['role'] === 'admin' && ($target['role'] === 'master' || $target['role'] === 'admin')) {
            error('Acesso negado: privilégios insuficientes', 403);
        }

        if ($target['role'] === 'master') {
            $masters_count = neon_first("SELECT COUNT(*) as count FROM users WHERE role = 'master'");
            if ($masters_count['count'] <= 1) {
                error('Não é possível remover o único usuário Master ativo.');
            }
        }

        neon("DELETE FROM users WHERE id = $1", [$id]);
        respond(null, 204);
    } catch (Exception $e) {
        error($e->getMessage(), 500);
    }
}

error('Rota não encontrada', 404);
