<?php
require 'helpers.php';
require 'db.php';

$currentUser = require_auth();

// GET /api/export_gdrive.php?action=download_zip
if (method() === 'GET') {
    if (!has_permission('members_read')) {
        error('Acesso negado: privilégios insuficientes', 403);
    }

    $action = $_GET['action'] ?? '';
    if ($action === 'download_zip') {
        $exportDir = __DIR__ . '/../exports/cards/';
        if (!file_exists($exportDir)) {
            error('Nenhum card foi gerado ainda.', 404);
        }

        $files = glob($exportDir . '*.png');
        if (empty($files)) {
            error('Nenhum card encontrado na pasta de exportação.', 404);
        }

        $zipPath = __DIR__ . '/../exports/Cards_Aniversario_Rocket_Club.zip';
        if (file_exists($zipPath)) {
            @unlink($zipPath);
        }

        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === TRUE) {
            foreach ($files as $file) {
                $zip->addFile($file, basename($file));
            }
            $zip->close();
        } else {
            error('Erro ao gerar o arquivo ZIP no servidor.', 500);
        }

        if (file_exists($zipPath)) {
            header('Content-Type: application/zip');
            header('Content-Disposition: attachment; filename="Cards_Aniversario_Rocket_Club.zip"');
            header('Content-Length: ' . filesize($zipPath));
            header('Pragma: no-cache');
            header('Expires: 0');
            readfile($zipPath);
            exit;
        } else {
            error('Arquivo ZIP não pôde ser lido.', 500);
        }
    }
}

function get_active_gdrive_token($provided_access_token, $provided_client_id, $provided_client_secret, $provided_refresh_token, &$token_refreshed_auto, &$token_error, $force_refresh = false) {
    $token_refreshed_auto = false;
    $token_error = null;

    $cId = trim($provided_client_id);
    $cSec = trim($provided_client_secret);
    $rTok = trim($provided_refresh_token);
    $aTok = trim($provided_access_token);

    // Buscar no banco se campos estiverem vazios
    if (empty($cId) || empty($cSec) || empty($rTok) || empty($aTok)) {
        try {
            $dbRows = neon("SELECT key, value FROM settings WHERE key IN ('gdrive_client_id', 'gdrive_client_secret', 'gdrive_refresh_token', 'gdrive_api_key')");
            foreach ($dbRows as $row) {
                $val = json_decode($row['value'], true);
                if ($row['key'] === 'gdrive_client_id' && empty($cId)) $cId = is_string($val) ? trim($val) : '';
                if ($row['key'] === 'gdrive_client_secret' && empty($cSec)) $cSec = is_string($val) ? trim($val) : '';
                if ($row['key'] === 'gdrive_refresh_token' && empty($rTok)) $rTok = is_string($val) ? trim($val) : '';
                if ($row['key'] === 'gdrive_api_key' && empty($aTok)) $aTok = is_string($val) ? trim($val) : '';
            }
        } catch (Throwable $e) { /* ignore */ }
    }

    // 1. Se tivermos Refresh Token, Client ID e Client Secret -> RENOVAÇÃO AUTOMÁTICA PERPÉTUA
    if (!empty($cId) && !empty($cSec) && !empty($rTok) && (empty($aTok) || $force_refresh)) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://oauth2.googleapis.com/token');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
            'client_id' => $cId,
            'client_secret' => $cSec,
            'refresh_token' => $rTok,
            'grant_type' => 'refresh_token'
        ]));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $tokenRes = curl_exec($ch);
        $tokenHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($tokenHttpCode === 200) {
            $tokenData = json_decode($tokenRes, true);
            if (!empty($tokenData['access_token'])) {
                $newTok = $tokenData['access_token'];
                $token_refreshed_auto = true;
                // Salvar novo Access Token renovado no banco de dados automaticamente
                try {
                    $jsonVal = json_encode($newTok);
                    neon("INSERT INTO settings (key, value) VALUES ('gdrive_api_key', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [$jsonVal]);
                } catch (Throwable $e) {}
                return $newTok;
            }
        } else {
            $tErrData = json_decode($tokenRes, true);
            $token_error = 'Erro ao renovar token via Refresh Token: ' . ($tErrData['error_description'] ?? $tErrData['error'] ?? ("HTTP " . $tokenHttpCode));
        }
    }

    return $aTok;
}

// POST /api/export_gdrive.php
if (method() === 'POST') {
    if (!has_permission('members_read')) {
        error('Acesso negado: privilégios insuficientes', 403);
    }

    $b = body();
    $action = $b['action'] ?? 'upload_card';

    if ($action === 'test_connection') {
        $folderId = trim($b['folder_id'] ?? '');
        if (empty($folderId)) {
            try {
                $dbFolder = neon("SELECT value FROM settings WHERE key = 'gdrive_folder_id' LIMIT 1");
                if (!empty($dbFolder[0]['value'])) {
                    $folderId = json_decode($dbFolder[0]['value'], true) ?: '';
                }
            } catch (Throwable $e) {}
        }

        if (empty($folderId)) {
            error('Por favor, informe o ID da pasta do Google Drive.');
        }

        if (preg_match('#/folders/([a-zA-Z0-9_-]+)#', $folderId, $mFolder)) {
            $folderId = $mFolder[1];
        }

        $tokenRefreshed = false;
        $tokenErr = null;
        $accessToken = get_active_gdrive_token(
            $b['access_token'] ?? '',
            $b['client_id'] ?? '',
            $b['client_secret'] ?? '',
            $b['refresh_token'] ?? '',
            $tokenRefreshed,
            $tokenErr
        );

        if (empty($accessToken)) {
            respond(['success' => false, 'message' => $tokenErr ?: 'Token OAuth/Access Token do Google Drive não configurado.'], 200);
        }

        $url = "https://www.googleapis.com/drive/v3/files/" . urlencode($folderId) . "?fields=id,name,mimeType";
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $accessToken
        ]);
        $res = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        // Se 401, tentar renovar token e tentar novamente
        if ($code === 401) {
            $accessToken = get_active_gdrive_token($b['access_token'] ?? '', $b['client_id'] ?? '', $b['client_secret'] ?? '', $b['refresh_token'] ?? '', $tokenRefreshed, $tokenErr, true);
            if (!empty($accessToken)) {
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $url);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'Authorization: Bearer ' . $accessToken
                ]);
                $res = curl_exec($ch);
                $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
            }
        }

        if ($code === 200) {
            $data = json_decode($res, true);
            $msg = 'Conexão com o Google Drive estabelecida com sucesso!';
            if ($tokenRefreshed) $msg .= ' (Renovado automaticamente via Refresh Token)';
            respond(['success' => true, 'folder_name' => $data['name'] ?? 'Pasta Conectada', 'message' => $msg]);
        } else {
            $gErr = json_decode($res, true);
            $errMsg = $gErr['error']['message'] ?? ("HTTP " . $code . ": Não foi possível validar a pasta.");
            respond(['success' => false, 'message' => $errMsg], 200);
        }
    }

    if ($action === 'clear_cards') {
        $exportDir = __DIR__ . '/../exports/cards/';
        if (file_exists($exportDir)) {
            $files = glob($exportDir . '*.png');
            foreach ($files as $file) {
                if (is_file($file)) @unlink($file);
            }
        }
        respond(['success' => true]);
    }

    if ($action === 'upload_card') {
        $member_name   = trim($b['member_name'] ?? 'Membro');
        $card_base64    = $b['card_base64'] ?? '';
        $folder_id      = trim($b['folder_id'] ?? '');
        $provided_token = trim($b['access_token'] ?? '');
        $provided_cId   = trim($b['client_id'] ?? '');
        $provided_cSec  = trim($b['client_secret'] ?? '');
        $provided_rTok  = trim($b['refresh_token'] ?? '');

        if (empty($card_base64)) {
            error('Conteúdo da imagem do card não fornecido.');
        }

        if (preg_match('#/folders/([a-zA-Z0-9_-]+)#', $folder_id, $mFolder)) {
            $folder_id = $mFolder[1];
        }

        // Salvar cópia local de segurança na pasta exports/cards/
        $exportDir = __DIR__ . '/../exports/cards/';
        if (!file_exists($exportDir)) {
            @mkdir($exportDir, 0777, true);
        }
        $cleanName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $member_name);
        $filename = 'Aniversario_' . $cleanName . '.png';
        $localPath = $exportDir . $filename;
        
        $rawImage = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $card_base64));
        file_put_contents($localPath, $rawImage);

        // Obter Access Token ativo (seja fornecido diretamente ou renovado automaticamente via Refresh Token)
        $tokenRefreshed = false;
        $tokenErr = null;
        $accessToken = get_active_gdrive_token($provided_token, $provided_cId, $provided_cSec, $provided_rTok, $tokenRefreshed, $tokenErr);

        $gdrive_uploaded = false;
        $gdrive_file_id = null;
        $gdrive_error = null;

        if (!empty($folder_id)) {
            if (empty($accessToken)) {
                $gdrive_error = $tokenErr ?: 'O ID da pasta foi informado, mas a Chave/Access Token do Google Drive não foi configurada nas Configurações.';
            } else {
                $sendUpload = function($tok) use ($filename, $folder_id, $rawImage) {
                    $metadata = json_encode([
                        'name' => $filename,
                        'parents' => [$folder_id],
                        'mimeType' => 'image/png'
                    ]);

                    $boundary = '-------' . microtime(true);
                    $multipartRequestBody =
                        "--" . $boundary . "\r\n" .
                        "Content-Type: application/json; charset=UTF-8\r\n\r\n" .
                        $metadata . "\r\n" .
                        "--" . $boundary . "\r\n" .
                        "Content-Type: image/png\r\n" .
                        "Content-Transfer-Encoding: base64\r\n\r\n" .
                        base64_encode($rawImage) . "\r\n" .
                        "--" . $boundary . "--";

                    $ch = curl_init();
                    curl_setopt($ch, CURLOPT_URL, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
                    curl_setopt($ch, CURLOPT_POST, true);
                    curl_setopt($ch, CURLOPT_HTTPHEADER, [
                        'Authorization: Bearer ' . $tok,
                        'Content-Type: multipart/related; boundary="' . $boundary . '"',
                        'Content-Length: ' . strlen($multipartRequestBody)
                    ]);
                    curl_setopt($ch, CURLOPT_POSTFIELDS, $multipartRequestBody);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

                    $gRes = curl_exec($ch);
                    $gCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    $curlErr = curl_error($ch);
                    curl_close($ch);

                    return ['code' => $gCode, 'res' => $gRes, 'err' => $curlErr];
                };

                $uRes = $sendUpload($accessToken);
                $gCode = $uRes['code'];

                // Se der 401 e tivermos credenciais de refresh token, tenta renovar forçadamente
                if ($gCode === 401 && !$tokenRefreshed) {
                    $refreshedTok = get_active_gdrive_token($provided_token, $provided_cId, $provided_cSec, $provided_rTok, $tokenRefreshed, $tokenErr, true);
                    if (!empty($refreshedTok) && $refreshedTok !== $accessToken) {
                        $accessToken = $refreshedTok;
                        $uRes = $sendUpload($accessToken);
                        $gCode = $uRes['code'];
                    }
                }

                if ($gCode === 200 || $gCode === 201) {
                    $gData = json_decode($uRes['res'], true);
                    $gdrive_uploaded = true;
                    $gdrive_file_id = $gData['id'] ?? null;
                } else {
                    $gData = json_decode($uRes['res'], true);
                    $rawMsg = $gData['error']['message'] ?? ($uRes['err'] ?: ("HTTP " . $gCode . ": Erro ao autenticar no Google Drive"));
                    if (strpos($rawMsg, 'invalid authentication credentials') !== false || strpos($rawMsg, 'Invalid Credentials') !== false || $gCode === 401) {
                        $gdrive_error = 'Token de Acesso expirado ou inválido (HTTP 401). Insira o Client ID, Client Secret e Refresh Token nas Configurações para renovação automática perpétua.';
                    } else {
                        $gdrive_error = $rawMsg;
                    }
                }
            }
        }

        respond([
            'success' => true,
            'filename' => $filename,
            'local_url' => 'exports/cards/' . $filename,
            'gdrive_uploaded' => $gdrive_uploaded,
            'gdrive_file_id' => $gdrive_file_id,
            'gdrive_error' => $gdrive_error
        ]);
    }
}

error('Método não suportado', 405);
