<?php
require 'helpers.php';
require 'db.php';

$action = $_GET['action'] ?? null;

// POST /api/auth.php?action=login — Realiza o login
if (method() === 'POST' && $action === 'login') {
    $b = body();
    $email = trim($b['email'] ?? '');
    $password = $b['password'] ?? '';

    if (empty($email) || empty($password)) {
        error('E-mail e senha são obrigatórios', 400);
    }

    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

    try {
        // Clean up attempts older than 15 minutes
        neon("DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '15 minutes'");

        // Check if there are too many failed login attempts from this IP or email in the last 15 minutes
        $attempts = neon_first(
            "SELECT COUNT(*) as count FROM login_attempts WHERE (email = $1 OR ip = $2) AND attempted_at >= NOW() - INTERVAL '15 minutes'",
            [$email, $ip]
        );

        if ($attempts && (int)$attempts['count'] >= 5) {
            error('Muitas tentativas de login. Por favor, tente novamente em 15 minutos.', 429);
        }

        $user = neon_first("SELECT id, email, password_hash, name, role FROM users WHERE email = $1", [$email]);
        if (!$user || !password_verify($password, $user['password_hash'])) {
            // Register failed attempt
            neon("INSERT INTO login_attempts (ip, email) VALUES ($1, $2)", [$ip, $email]);
            error('E-mail ou senha incorretos', 401);
        }

        // Clear failed attempts upon successful login
        neon("DELETE FROM login_attempts WHERE email = $1 OR ip = $2", [$email, $ip]);

        // Regenerate session ID to prevent session fixation attacks
        session_regenerate_id(true);

        // Armazena na sessão do PHP
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['user_name'] = $user['name'];
        $_SESSION['user_role'] = $user['role'];

        respond([
            'ok' => true,
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'name' => $user['name'],
                'role' => $user['role']
            ]
        ]);
    } catch (Exception $e) {
        error($e->getMessage(), 500);
    }
}

// POST /api/auth.php?action=logout — Destrói a sessão
if (method() === 'POST' && $action === 'logout') {
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    session_destroy();
    respond(['ok' => true]);
}

// GET /api/auth.php?action=me — Retorna o estado atual
if (method() === 'GET' && $action === 'me') {
    $user = get_current_user_data();
    if (!$user) {
        respond(['authenticated' => false]);
        exit;
    }

    // Calcula todas as permissões ativas para enviar ao frontend
    $permissions = [];
    if ($user['role'] === 'master') {
        $permissions = ['*'];
    } elseif ($user['role'] === 'admin') {
        // Admins têm acesso total a tudo exceto gestão de permissões avançadas do Master
        $permissions = ['members_read', 'members_write', 'contacts_read', 'contacts_write', 'goals_read', 'goals_write', 'milestones_read', 'milestones_write', 'wiki_read', 'wiki_write', 'departments_read', 'departments_write'];
    } elseif ($user['role'] === 'funcionario') {
        // Leitura básica padrão
        $permissions = ['members_read', 'contacts_read', 'goals_read', 'milestones_read', 'wiki_read', 'departments_read'];
        
        // Pega overrides customizados
        try {
            $rows = neon("SELECT permission FROM user_permissions WHERE user_id = $1", [$user['id']]);
            foreach ($rows as $row) {
                if (!in_array($row['permission'], $permissions)) {
                    $permissions[] = $row['permission'];
                }
            }
        } catch (Exception $e) {
            // Ignore
        }
    } elseif ($user['role'] === 'cliente') {
        $permissions = ['wiki_read_public'];
    }

    respond([
        'authenticated' => true,
        'user' => $user,
        'permissions' => $permissions
    ]);
}

error('Ação inválida ou rota não encontrada', 404);
