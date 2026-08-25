<?php
// Carregador simples para o arquivo .env
$envPath = dirname(__DIR__) . '/.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $key = trim($parts[0]);
            $val = trim($parts[1]);
            // Remove aspas caso existam no arquivo .env
            $val = trim($val, "\"'");
            if (!array_key_exists($key, $_SERVER) && !array_key_exists($key, $_ENV)) {
                putenv("$key=$val");
                $_ENV[$key] = $val;
                $_SERVER[$key] = $val;
            }
        }
    }
}

define('NEON_HOST', $_ENV['NEON_HOST'] ?? getenv('NEON_HOST') ?: '');
define('NEON_USER', $_ENV['NEON_USER'] ?? getenv('NEON_USER') ?: '');
define('NEON_PASS', $_ENV['NEON_PASS'] ?? getenv('NEON_PASS') ?: '');
define('NEON_DB',   $_ENV['NEON_DB']   ?? getenv('NEON_DB')   ?: '');

function neon(string $sql, array $params = []): array {
    $url  = 'https://' . NEON_HOST . '/sql';

    $payload = json_encode([
        'query'  => $sql,
        'params' => array_map(function($v) {
            if (is_null($v)) return null;
            if (is_int($v) || is_float($v) || is_bool($v)) return $v;
            return (string)$v;
        }, array_values($params)),
    ]);

    // Detecção dinâmica de CA bundle para verificação SSL
    $caPath = ini_get('curl.cainfo') ?: ini_get('openssl.cafile');
    if (!$caPath || !file_exists($caPath)) {
        $possibleCas = [
            'C:/wamp64/apps/phpmyadmin5.2.1/vendor/composer/ca-bundle/res/cacert.pem',
            dirname(__DIR__) . '/vendor/composer/ca-bundle/res/cacert.pem',
            '/etc/ssl/certs/ca-certificates.crt',
            '/etc/pki/tls/certs/ca-bundle.crt'
        ];
        foreach ($possibleCas as $ca) {
            if (file_exists($ca)) {
                $caPath = $ca;
                break;
            }
        }
    }

    $curlOpts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Accept: application/json',
            'Connection: keep-alive',
            'Neon-Connection-String: postgresql://' . NEON_USER . ':' . rawurlencode(NEON_PASS) . '@' . NEON_HOST . '/' . NEON_DB . '?sslmode=require',
        ],
        CURLOPT_TIMEOUT        => 60,
    ];

    if ($caPath && file_exists($caPath)) {
        $curlOpts[CURLOPT_SSL_VERIFYPEER] = true;
        $curlOpts[CURLOPT_SSL_VERIFYHOST] = 2;
        $curlOpts[CURLOPT_CAINFO]         = $caPath;
    } else {
        $isLocal = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1']) || php_sapi_name() === 'cli';
        $curlOpts[CURLOPT_SSL_VERIFYPEER] = !$isLocal;
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, $curlOpts);

    $raw  = curl_exec($ch);
    $cerr = curl_error($ch);
    curl_close($ch);

    if ($cerr) throw new Exception('Curl error: ' . $cerr);
    if (!$raw)  throw new Exception('Resposta vazia do servidor');

    $data = json_decode($raw, true);
    if (!is_array($data)) throw new Exception('JSON inválido: ' . substr($raw, 0, 300));
    
    // Tratamento de erros do Neon
    if (isset($data['error'])) {
        $msg = is_array($data['error'])
            ? ($data['error']['message'] ?? json_encode($data['error']))
            : (string)$data['error'];
        throw new Exception($msg);
    }
    if (isset($data['message'])) {
        throw new Exception($data['message']);
    }

    if (empty($data['fields'])) return [];

    $cols = array_column($data['fields'], 'name');
    $rows = $data['rows'] ?? [];

    return array_map(function($row) use ($cols) {
        $vals = array_values(is_array($row) ? $row : (array)$row);
        return array_combine($cols, $vals);
    }, $rows);
}

function neon_first(string $sql, array $params = []): ?array {
    $rows = neon($sql, $params);
    return $rows[0] ?? null;
}

function gen_uuid(): string {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // v4
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80); // RFC 4122
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}
