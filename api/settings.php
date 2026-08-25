<?php
require 'helpers.php';
require 'db.php';

$currentUser = require_auth();

// Verificar permissões
if (method() === 'GET') {
    if (!has_permission('members_read')) {
        error('Acesso negado: privilégios insuficientes', 403);
    }
} else {
    if ($currentUser['role'] !== 'master' && $currentUser['role'] !== 'admin') {
        error('Acesso negado: privilégios insuficientes', 403);
    }
}

// Validador simples de JSON

function save_as_webp($base64Data, $targetWebpPath, $quality = 100) {
    $data = base64_decode($base64Data);
    $img = @imagecreatefromstring($data);
    if ($img) {
        imagealphablending($img, true);
        imagesavealpha($img, true);
        imagewebp($img, $targetWebpPath, $quality);
        imagedestroy($img);
        return true;
    }
    file_put_contents($targetWebpPath, $data);
    return false;
}

function is_valid_json($string) {
    json_decode($string);
    return (json_last_error() == JSON_ERROR_NONE);
}

// GET /api/settings.php — Retorna todas as configurações
if (method() === 'GET') {
    try {
        $rows = neon("SELECT key, value FROM settings");
        $settings = [];
        foreach ($rows as $row) {
            $settings[$row['key']] = json_decode($row['value'], true);
        }

        // Defaults se não existirem
        if (!isset($settings['members_list'])) {
            $settings['members_list'] = [
                "Angelo Loss", "Ariane Vicentim", "Bruno Mantovano", "Claudio Mendonça", "Cleber Kraus",
                "Daniela Cunha", "Daniella Rossi", "Elenilson Moura", "Eraldo Bittencourt", "Ervin San Martin",
                "Fabio Perisse", "Felipe Koeler", "Fernanda Portella", "Graziela Leão", "Helen Gama Cardoso Melo",
                "Higor Ramos", "Isabela Maciel", "Jacqueline Figueiredo", "Jan Sprey", "Lilian Ponzoni",
                "Luiye Galeano", "Magno Cerqueira", "Marcela Medeiros", "Maria Elisa Coimbra", "Mariana Benício",
                "Natalia Boechat", "Ognev Cosac", "Raquel Peixoto", "Renato Gentile", "Rodrigo Gatto",
                "Saskia Teixeira", "Simone Moreira", "Sonia Spohr", "Tainah De Castro", "Thiago Baena",
                "Victor Romano", "Vivian Koeler"
            ];
        }

        if (!isset($settings['pillars'])) {
            $settings['pillars'] = [
                1 => 'Mentalidade',
                2 => 'Comercial',
                3 => 'Posicionamento',
                4 => 'Estruturação',
                5 => 'Qualidade de Vida'
            ];
        }

        if (!isset($settings['members_book_cover'])) {
            $coverWebp = __DIR__ . '/cover_background.webp';
            $coverJpg  = __DIR__ . '/cover_background.jpg';
            if (file_exists($coverWebp)) {
                $settings['members_book_cover'] = 'api/cover_background.webp';
            } elseif (file_exists($coverJpg)) {
                $settings['members_book_cover'] = 'api/cover_background.jpg';
            } else {
                $settings['members_book_cover'] = '';
            }
        }

        if (empty($settings['system_logo'])) {
            if (file_exists(__DIR__ . '/system_logo.webp')) {
                $settings['system_logo'] = 'api/system_logo.webp';
            } elseif (file_exists(__DIR__ . '/system_logo.svg')) {
                $settings['system_logo'] = 'api/system_logo.svg';
            } elseif (file_exists(__DIR__ . '/system_logo.png')) {
                $settings['system_logo'] = 'api/system_logo.png';
            } elseif (file_exists(__DIR__ . '/birthday_card_logo.png')) {
                $settings['system_logo'] = 'api/birthday_card_logo.png';
            } else {
                $settings['system_logo'] = '';
            }
        }

        if (empty($settings['members_book_logo'])) {
            $settings['members_book_logo'] = $settings['system_logo'];
        }

        if (empty($settings['birthday_card_logo'])) {
            if (file_exists(__DIR__ . '/birthday_card_logo.png')) {
                $settings['birthday_card_logo'] = 'api/birthday_card_logo.png';
            } elseif (file_exists(__DIR__ . '/birthday_card_logo.svg')) {
                $settings['birthday_card_logo'] = 'api/birthday_card_logo.svg';
            } elseif (file_exists(__DIR__ . '/birthday_card_logo.webp')) {
                $settings['birthday_card_logo'] = 'api/birthday_card_logo.webp';
            } else {
                $settings['birthday_card_logo'] = $settings['system_logo'];
            }
        }

        if (empty($settings['system_favicon'])) {
            if (file_exists(__DIR__ . '/favicon.ico')) {
                $settings['system_favicon'] = 'api/favicon.ico';
            } elseif (file_exists(__DIR__ . '/favicon.webp')) {
                $settings['system_favicon'] = 'api/favicon.webp';
            } elseif (file_exists(__DIR__ . '/favicon.png')) {
                $settings['system_favicon'] = 'api/favicon.png';
            } else {
                $settings['system_favicon'] = $settings['system_logo'];
            }
        }

        if (!isset($settings['gdrive_folder_id'])) {
            $settings['gdrive_folder_id'] = '';
        }
        if (!isset($settings['gdrive_api_key'])) {
            $settings['gdrive_api_key'] = '';
        }

        respond($settings);
    } catch (Exception $e) {
        error($e->getMessage(), 500);
    }
}

// POST /api/settings.php — Atualiza uma ou mais configurações
if (method() === 'POST') {
    $b = body();
    if (empty($b)) {
        error('Corpo da requisição vazio');
    }

    try {
        foreach ($b as $key => $value) {
            if ($key === 'members_book_cover') {
                $coverWebp = __DIR__ . '/cover_background.webp';
                $coverJpg  = __DIR__ . '/cover_background.jpg';
                if (file_exists($coverWebp)) unlink($coverWebp);
                if (file_exists($coverJpg)) unlink($coverJpg);
                if (empty($value)) {
                    $value = '';
                } elseif (preg_match('/^data:image\/(\w+);base64,(.+)$/', $value, $matches)) {
                    save_as_webp($matches[2], $coverWebp, 100);
                    $value = 'api/cover_background.webp';
                }
            }

            if ($key === 'system_logo') {
                $logoWebp = __DIR__ . '/system_logo.webp';
                $logoPng  = __DIR__ . '/system_logo.png';
                $logoSvg  = __DIR__ . '/system_logo.svg';
                if (file_exists($logoWebp)) @unlink($logoWebp);
                if (file_exists($logoPng)) @unlink($logoPng);
                if (file_exists($logoSvg)) @unlink($logoSvg);
                if (empty($value)) {
                    $value = '';
                } elseif (preg_match('/^data:image\/svg\+xml;base64,(.+)$/', $value, $matches)) {
                    $data = base64_decode($matches[1]);
                    file_put_contents($logoSvg, $data);
                    $value = 'api/system_logo.svg';
                } elseif (preg_match('/^data:image\/(\w+);base64,(.+)$/', $value, $matches)) {
                    $data = base64_decode($matches[2]);
                    save_as_webp($matches[2], $logoWebp, 100);
                    $img = @imagecreatefromstring($data);
                    if ($img) {
                        imagealphablending($img, false);
                        imagesavealpha($img, true);
                        imagepng($img, $logoPng, 0);
                        imagedestroy($img);
                    } else {
                        file_put_contents($logoPng, $data);
                    }
                    $value = 'api/system_logo.webp';
                }
            }

            if ($key === 'members_book_logo') {
                $logoWebp = __DIR__ . '/members_book_logo.webp';
                $logoPng  = __DIR__ . '/members_book_logo.png';
                $logoSvg  = __DIR__ . '/members_book_logo.svg';
                $flattenedLogo = __DIR__ . '/logo_cover_flattened.png';
                if (file_exists($logoWebp)) unlink($logoWebp);
                if (file_exists($logoPng)) unlink($logoPng);
                if (file_exists($logoSvg)) unlink($logoSvg);
                if (file_exists($flattenedLogo)) unlink($flattenedLogo);
                if (empty($value)) {
                    $value = '';
                } elseif (preg_match('/^data:image\/svg\+xml;base64,(.+)$/', $value, $matches)) {
                    $data = base64_decode($matches[1]);
                    file_put_contents($logoSvg, $data);
                    $value = 'api/members_book_logo.svg';
                } elseif (preg_match('/^data:image\/(\w+);base64,(.+)$/', $value, $matches)) {
                    save_as_webp($matches[2], $logoWebp, 100);
                    $value = 'api/members_book_logo.webp';
                }
            }

            if ($key === 'birthday_card_logo') {
                $logoWebp = __DIR__ . '/birthday_card_logo.webp';
                $logoPng  = __DIR__ . '/birthday_card_logo.png';
                $logoSvg  = __DIR__ . '/birthday_card_logo.svg';
                if (file_exists($logoWebp)) unlink($logoWebp);
                if (file_exists($logoPng)) unlink($logoPng);
                if (file_exists($logoSvg)) unlink($logoSvg);
                if (empty($value)) {
                    $value = '';
                } elseif (preg_match('/^data:image\/svg\+xml;base64,(.+)$/', $value, $matches)) {
                    $data = base64_decode($matches[1]);
                    file_put_contents($logoSvg, $data);
                    $value = 'api/birthday_card_logo.svg';
                } elseif (preg_match('/^data:image\/(\w+);base64,(.+)$/', $value, $matches)) {
                    save_as_webp($matches[2], $logoWebp, 100);
                    $value = 'api/birthday_card_logo.webp';
                }
            }

            if ($key === 'system_favicon') {
                $favIco  = __DIR__ . '/favicon.ico';
                $favPng  = __DIR__ . '/favicon.png';
                $favWebp = __DIR__ . '/favicon.webp';
                if (file_exists($favIco)) unlink($favIco);
                if (file_exists($favPng)) unlink($favPng);
                if (file_exists($favWebp)) unlink($favWebp);
                if (empty($value)) {
                    $value = '';
                } elseif (preg_match('/^data:image\/(\w+);base64,(.+)$/', $value, $matches)) {
                    $ext = strtolower($matches[1]);
                    $data = base64_decode($matches[2]);
                    if ($ext === 'x-icon' || $ext === 'vnd.microsoft.icon' || $ext === 'ico') {
                        file_put_contents($favIco, $data);
                        $value = 'api/favicon.ico';
                    } else {
                        save_as_webp($matches[2], $favWebp, 100);
                        $value = 'api/favicon.webp';
                    }
                }
            }
            
            $json_value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            
            // Upsert
            neon(
                "INSERT INTO settings (key, value) VALUES ($1, $2)
                 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
                [$key, $json_value]
            );
        }
        respond(['ok' => true, 'message' => 'Configurações updated com sucesso']);
    } catch (Exception $e) {
        error($e->getMessage(), 500);
    }
}

error('Rota não encontrada', 404);
