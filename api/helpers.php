<?php
ob_start();

if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    ini_set('session.cookie_samesite', 'Strict');
    
    // Set cookie_secure if protocol is HTTPS
    $isHttps = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') || 
               (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    if ($isHttps) {
        ini_set('session.cookie_secure', 1);
    }
    
    session_start();
}

// Tratador global de exceções para evitar vazamento de informações confidenciais
set_exception_handler(function (Throwable $e) {
    error_log($e->getMessage() . "\n" . $e->getTraceAsString());
    
    $isLocal = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1']) || php_sapi_name() === 'cli';
    
    if (ob_get_length()) ob_clean();
    if (!headers_sent()) {
        http_response_code(500);
    }
    
    $errorResponse = ['error' => 'Ocorreu um erro interno no servidor.'];
    if ($isLocal) {
        $errorResponse['message'] = $e->getMessage();
        $errorResponse['trace'] = $e->getTraceAsString();
    }
    
    echo json_encode($errorResponse, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
});

// Converter erros do PHP (warnings, notices) em exceções
set_error_handler(function ($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) {
        return;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

// Headers CORS, Segurança e JSON para todas as rotas da API
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-XSS-Protection: 1; mode=block');

// Configuração de CORS blindada para origens confiáveis
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed_origins = [
    'http://localhost',
    'http://127.0.0.1',
    'https://localhost',
    'https://127.0.0.1'
];
$server_host = $_SERVER['HTTP_HOST'] ?? '';
$server_proto = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
$self_origin = "$server_proto://$server_host";

if ($origin) {
    $is_allowed = false;
    if (in_array($origin, $allowed_origins)) {
        $is_allowed = true;
    } elseif (strcasecmp($origin, $self_origin) === 0) {
        $is_allowed = true;
    }
    
    if ($is_allowed) {
        header("Access-Control-Allow-Origin: $origin");
    } else {
        header("Access-Control-Allow-Origin: $self_origin");
    }
}

header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Inicializar e carregar variáveis do .env caso ainda não estejam no ambiente
$envPath = dirname(__DIR__) . '/.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $key = trim($parts[0]);
            $val = trim($parts[1]);
            $val = trim($val, "\"'");
            if (!array_key_exists($key, $_SERVER) && !array_key_exists($key, $_ENV)) {
                putenv("$key=$val");
                $_ENV[$key] = $val;
                $_SERVER[$key] = $val;
            }
        }
    }
}

// Autenticação opcional (HTTP Basic Auth) via variáveis do .env
$api_user = $_ENV['API_USER'] ?? getenv('API_USER') ?: '';
$api_pass = $_ENV['API_PASS'] ?? getenv('API_PASS') ?: '';

if ($api_user && $api_pass) {
    $authUser = $_SERVER['PHP_AUTH_USER'] ?? '';
    $authPass = $_SERVER['PHP_AUTH_PW'] ?? '';

    // Fallback para ler do cabeçalho Authorization caso esteja usando CGI/FastCGI
    if (!$authUser && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        if (preg_match('/Basic\s+(.*)$/i', $_SERVER['HTTP_AUTHORIZATION'], $matches)) {
            $credentials = explode(':', base64_decode($matches[1]), 2);
            if (count($credentials) === 2) {
                $authUser = $credentials[0];
                $authPass = $credentials[1];
            }
        }
    }

    if ($authUser !== $api_user || $authPass !== $api_pass) {
        header('WWW-Authenticate: Basic realm="Rocket Club API"');
        respond(['error' => 'Acesso não autorizado'], 401);
    }
}


function respond($data, int $code = 200): void {
    if (ob_get_length()) ob_clean();
    if (!headers_sent()) {
        http_response_code($code);
    }
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function error(string $msg, int $code = 400): void {
    respond(['error' => $msg], $code);
}

function body(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

function method(): string {
    return $_SERVER['REQUEST_METHOD'] ?? 'GET';
}

function get_current_user_data() {
    if (isset($_SESSION['user_id'])) {
        return [
            'id' => $_SESSION['user_id'],
            'email' => $_SESSION['user_email'],
            'name' => $_SESSION['user_name'],
            'role' => $_SESSION['user_role']
        ];
    }
    return null;
}

function require_auth() {
    $user = get_current_user_data();
    if (!$user) {
        error('Não autenticado', 401);
    }
    return $user;
}

function has_permission(string $permission): bool {
    $user = get_current_user_data();
    if (!$user) {
        return false;
    }
    
    // Master tem acesso a tudo
    if ($user['role'] === 'master') {
        return true;
    }
    
    // Admin tem acesso a tudo, exceto gerenciar permissões de nível Master
    if ($user['role'] === 'admin') {
        $admin_blocked = ['manage_permissions', 'manage_master'];
        if (in_array($permission, $admin_blocked)) {
            return false;
        }
        return true;
    }
    
    // Funcionário
    if ($user['role'] === 'funcionario') {
        // Por padrão, leitura de membros, contatos, metas, conquistas e wiki é liberada
        $default_read = [
            'members_read',
            'contacts_read',
            'goals_read',
            'milestones_read',
            'wiki_read',
            'departments_read'
        ];
        if (in_array($permission, $default_read)) {
            return true;
        }
        
        // Outras permissões checam overrides no banco
        try {
            $row = neon_first(
                "SELECT 1 FROM user_permissions WHERE user_id = $1 AND permission = $2",
                [$user['id'], $permission]
            );
            return !empty($row);
        } catch (Exception $e) {
            return false;
        }
    }
    
    // Cliente
    if ($user['role'] === 'cliente') {
        // Apenas leitura de wiki pública
        return $permission === 'wiki_read_public';
    }
    
    return false;
}

