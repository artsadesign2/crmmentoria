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
    if (!has_permission('members_write')) {
        error('Acesso negado: privilégios insuficientes', 403);
    }
}

$id     = $_GET['id']     ?? null;
$action = $_GET['action'] ?? null;

// GET — lista todos
if (method() === 'GET' && !$id) {
    // Omitimos cover_image da listagem geral para economizar banda e evitar timeouts com imagens grandes em base64.
    $rows = neon("SELECT id, name, specialty, status, last_contact, notes, position, created_at, updated_at, age, birthdate, birthplace, residence, phone, instagram, email, interests, hobbies, cpf, rg, professional_register, marital_status, register_pj, cnpj, company_name, trade_name, municipal_register, commercial_address, nationality, social_media, website, linkedin, facebook, youtube, twitter, professional_experience, work_locations, work_description_hours, monthly_revenue, mentorship_interest, main_goal, biggest_challenge, content_consumption, weekly_availability, how_did_you_find_us, spouse_info, children_info, pets_info, emergency_contact, sports_info, exclude_from_book, card_template_model, card_photo_align, members_book_model FROM members ORDER BY status, position, name");
    respond($rows);
}

// GET ?id= — busca um
if (method() === 'GET' && $id) {
    $row = neon_first("SELECT * FROM members WHERE id = $1", [$id]);
    if (!$row) error('Membro não encontrado', 404);
    respond($row);
}

// Funções auxiliares para comparação de nomes (desduplicação)
function normalize_name_php($name) {
    if (!$name) return "";
    $name = mb_strtolower($name, 'UTF-8');
    
    // Remove acentos
    $name = str_replace(
        ['á','à','â','ã','ä','é','è','ê','ë','í','ì','î','ï','ó','ò','ô','õ','ö','ú','ù','û','ü','ç','ñ','ã','õ'],
        ['a','a','a','a','a','e','e','e','e','i','i','i','i','o','o','o','o','o','u','u','u','u','c','n','a','o'],
        $name
    );
    
    // Remover caracteres não alfanuméricos e simplificar espaços
    $name = preg_replace('/[^a-z0-9\s]/', ' ', $name);
    $name = trim(preg_replace('/\s+/', ' ', $name));
    return $name;
}

function is_name_match_php($db_name, $csv_name) {
    $db_norm = normalize_name_php($db_name);
    $csv_norm = normalize_name_php($csv_name);
    
    if ($db_norm === $csv_norm) return true;
    if ($db_norm && $csv_norm) {
        if (strpos($csv_norm, $db_norm) !== false || strpos($db_norm, $csv_norm) !== false) {
            return true;
        }
    }
    
    $db_words = array_values(array_filter(explode(' ', $db_norm), fn($w) => !in_array($w, ['de', 'da', 'do', 'e'])));
    $csv_words = array_values(array_filter(explode(' ', $csv_norm), fn($w) => !in_array($w, ['de', 'da', 'do', 'e'])));
    
    if (count($db_words) >= 2 && count($csv_words) >= 2) {
        if ($db_words[0] === $csv_words[0] && end($db_words) === end($csv_words)) {
            return true;
        }
    }
    return false;
}

function normalize_name_case_php($name) {
    if (!$name) return "";
    $words = explode(' ', trim(preg_replace('/\s+/', ' ', $name)));
    $lower_exceptions = ['de', 'di', 'da', 'do', 'dos', 'das', 'e', 'la', 'lo'];
    $capitalized_words = [];
    foreach ($words as $idx => $w) {
        $w_lower = mb_strtolower($w, 'UTF-8');
        if (in_array($w_lower, $lower_exceptions) && $idx > 0 && $idx < count($words) - 1) {
            $capitalized_words[] = $w_lower;
        } else {
            $first = mb_substr($w, 0, 1, 'UTF-8');
            $rest = mb_substr($w, 1, null, 'UTF-8');
            $capitalized_words[] = mb_strtoupper($first, 'UTF-8') . mb_strtolower($rest, 'UTF-8');
        }
    }
    return implode(' ', $capitalized_words);
}

function normalize_phone_php($phone) {
    if (!$phone) return "";
    $digits = preg_replace('/\D/', '', $phone);
    if (strpos($digits, '55') === 0 && strlen($digits) > 10) {
        $digits = substr($digits, 2);
    }
    if (strlen($digits) === 11) {
        return "(" . substr($digits, 0, 2) . ") " . substr($digits, 2, 5) . "-" . substr($digits, 7);
    } elseif (strlen($digits) === 10) {
        return "(" . substr($digits, 0, 2) . ") " . substr($digits, 2, 4) . "-" . substr($digits, 6);
    }
    return trim($phone);
}

function normalize_cpf_php($cpf) {
    if (!$cpf) return "";
    $digits = preg_replace('/\D/', '', $cpf);
    if (strlen($digits) === 11) {
        return substr($digits, 0, 3) . "." . substr($digits, 3, 3) . "." . substr($digits, 6, 3) . "-" . substr($digits, 9);
    }
    return trim($cpf);
}

function normalize_cnpj_php($cnpj) {
    if (!$cnpj) return "";
    $digits = preg_replace('/\D/', '', $cnpj);
    if (strlen($digits) === 14) {
        return substr($digits, 0, 2) . "." . substr($digits, 2, 3) . "." . substr($digits, 5, 3) . "/" . substr($digits, 8, 4) . "-" . substr($digits, 12);
    }
    return trim($cnpj);
}

function normalize_instagram_php($instagram) {
    if (!$instagram) return "";
    $handle = trim($instagram);
    $handle = preg_replace('/^(https?:\/\/)?(www\.)?instagram\.com\//i', '', $handle);
    $handle = rtrim($handle, '/');
    if ($handle && $handle[0] !== '@') {
        $handle = '@' . $handle;
    }
    return $handle;
}

function normalize_marital_status_php($status) {
    if (!$status) return "";
    $s = mb_strtolower(trim($status), 'UTF-8');
    if (strpos($s, 'casado') !== false) return 'Casado';
    if (strpos($s, 'solteiro') !== false) return 'Solteiro';
    if (strpos($s, 'divorciado') !== false) return 'Divorciado';
    if (strpos($s, 'viúvo') !== false || strpos($s, 'viuvo') !== false) return 'Viúvo';
    if (strpos($s, 'união estável') !== false || strpos($s, 'uniao estavel') !== false) return 'União Estável';
    
    $first = mb_substr($status, 0, 1, 'UTF-8');
    $rest = mb_substr($status, 1, null, 'UTF-8');
    return mb_strtoupper($first, 'UTF-8') . mb_strtolower($rest, 'UTF-8');
}

function normalize_register_pj_php($val) {
    if (!$val) return "";
    $v = mb_strtolower(trim($val), 'UTF-8');
    if (strpos($v, 'sim') !== false) return 'Sim';
    if (strpos($v, 'não') !== false || strpos($v, 'nao') !== false || strpos($v, 'necessário') !== false || strpos($v, 'necessario') !== false) return 'Não';
    
    $first = mb_substr($val, 0, 1, 'UTF-8');
    $rest = mb_substr($val, 1, null, 'UTF-8');
    return mb_strtoupper($first, 'UTF-8') . mb_strtolower($rest, 'UTF-8');
}

function normalize_city_state_php($val) {
    if (!$val) return "";
    $val = trim(preg_replace('/\s+/', ' ', $val));
    
    $states = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", 
               "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
    
    $state_regex = implode('|', $states);
    $pattern = '/\b([A-Za-zÀ-ÿ\s]+?)\s*[-\/,;\s]\s*\b(' . $state_regex . ')\b/ui';
    
    if (preg_match($pattern, $val, $matches)) {
        $city = normalize_name_case_php(trim($matches[1]));
        $state = strtoupper(trim($matches[2]));
        return $city . '/' . $state;
    } else {
        return normalize_name_case_php($val);
    }
}

function normalize_member_updates(array $updates): array {
    if (isset($updates['name'])) $updates['name'] = normalize_name_case_php($updates['name']);
    if (isset($updates['email'])) $updates['email'] = mb_strtolower(trim($updates['email']), 'UTF-8');
    if (isset($updates['phone'])) $updates['phone'] = normalize_phone_php($updates['phone']);
    if (isset($updates['cpf'])) $updates['cpf'] = normalize_cpf_php($updates['cpf']);
    if (isset($updates['cnpj'])) $updates['cnpj'] = normalize_cnpj_php($updates['cnpj']);
    if (isset($updates['instagram'])) $updates['instagram'] = normalize_instagram_php($updates['instagram']);
    if (isset($updates['marital_status'])) $updates['marital_status'] = normalize_marital_status_php($updates['marital_status']);
    if (isset($updates['register_pj'])) $updates['register_pj'] = normalize_register_pj_php($updates['register_pj']);
    if (isset($updates['birthplace'])) $updates['birthplace'] = normalize_city_state_php($updates['birthplace']);
    if (isset($updates['residence'])) $updates['residence'] = normalize_city_state_php($updates['residence']);
    return $updates;
}

// POST — cria novo ou realiza importação em lote
if (method() === 'POST' && !$id) {
    $b = normalize_member_updates(body());
    
    if ($action === 'bulk_import') {
        $names = $b['names'] ?? [];
        if (empty($names)) error('Nenhum nome enviado');
        $valid  = ['cinza', 'azul', 'verde', 'amarela', 'vermelha'];
        $status = in_array($b['status'] ?? '', $valid) ? $b['status'] : 'cinza';

        $created = [];
        foreach ($names as $name) {
            $name = trim($name);
            if (empty($name)) continue;
            $name = normalize_name_case_php($name);

            $uuid = gen_uuid();
            neon(
                "INSERT INTO members (id, name, specialty, status) VALUES ($1, $2, NULL, $3)",
                [$uuid, $name, $status]
            );

            $hid = gen_uuid();
            neon(
                "INSERT INTO status_history (id, member_id, from_status, to_status, reason) VALUES ($1, $2, NULL, $3, 'Membro importado')",
                [$hid, $uuid, $status]
            );

            $created[] = neon_first("SELECT * FROM members WHERE id = $1", [$uuid]);
        }
        respond($created, 201);
    } elseif ($action === 'csv_import') {
        // body() foi normalizado, mas members está dentro de body(), então vamos normalizar cada membro da lista
        $importList = $b['members'] ?? [];
        if (empty($importList)) error('Nenhum membro enviado para importação');
        
        $db_members = neon("SELECT id, name FROM members");
        
        $updated = 0;
        $inserted = 0;
        
        $fields = [
            'specialty', 'notes', 'age', 'birthdate', 'birthplace', 'residence',
            'phone', 'instagram', 'email', 'interests', 'hobbies', 'cpf', 'rg', 'professional_register',
            'marital_status', 'register_pj', 'cnpj', 'company_name', 'trade_name', 'municipal_register', 'commercial_address',
            'nationality', 'social_media', 'website', 'linkedin', 'facebook', 'youtube', 'twitter', 'professional_experience', 'work_locations', 'work_description_hours',
            'monthly_revenue', 'mentorship_interest', 'main_goal', 'biggest_challenge', 'content_consumption', 'weekly_availability',
            'how_did_you_find_us', 'spouse_info', 'children_info', 'pets_info', 'emergency_contact', 'sports_info'
        ];
        
        foreach ($importList as $member) {
            $member = normalize_member_updates($member);
            $name = trim($member['name'] ?? '');
            if (empty($name)) continue;
            
            $db_match = null;
            foreach ($db_members as $db_m) {
                if (is_name_match_php($db_m['name'], $name)) {
                    $db_match = $db_m;
                    break;
                }
            }
            
            $updates = [];
            foreach ($fields as $f) {
                if (isset($member[$f]) && $member[$f] !== '' && $member[$f] !== null) {
                    $updates[$f] = $member[$f];
                }
            }
            
            if ($db_match) {
                // Atualizar existente
                if (!empty($updates)) {
                    $sets = [];
                    $vals = [];
                    $i = 1;
                    foreach ($updates as $k => $v) {
                        $sets[] = "$k = $" . $i;
                        $vals[] = $v;
                        $i++;
                    }
                    $vals[] = $db_match['id'];
                    neon("UPDATE members SET " . implode(', ', $sets) . ", updated_at = NOW() WHERE id = $" . $i, $vals);
                    $updated++;
                }
            } else {
                // Inserir novo
                $uuid = gen_uuid();
                $updates['id'] = $uuid;
                $updates['name'] = $name;
                $updates['status'] = 'cinza';
                
                $cols = array_keys($updates);
                $placeholders = array_map(fn($idx) => '$' . ($idx + 1), range(0, count($cols) - 1));
                $vals = array_values($updates);
                
                neon("INSERT INTO members (" . implode(', ', $cols) . ") VALUES (" . implode(', ', $placeholders) . ")", $vals);
                
                // Status history
                $hid = gen_uuid();
                neon(
                    "INSERT INTO status_history (id, member_id, from_status, to_status, reason) VALUES ($1, $2, NULL, $3, $4)",
                    [$hid, $uuid, 'cinza', 'Membro importado via CSV web']
                );
                
                $inserted++;
            }
        }
        
        respond([
            'ok' => true, 
            'message' => 'Importação finalizada', 
            'updated' => $updated, 
            'inserted' => $inserted
        ]);
    } else {
        if (empty($b['name'])) error('Nome obrigatório');
        $valid  = ['cinza', 'azul', 'verde', 'amarela', 'vermelha'];
        $status = in_array($b['status'] ?? '', $valid) ? $b['status'] : 'cinza';

        $uuid = gen_uuid();
        $cols = [
            'id', 'name', 'specialty', 'status', 'last_contact', 'notes', 'age', 'birthdate', 'birthplace', 'residence',
            'phone', 'instagram', 'email', 'interests', 'hobbies', 'cover_image', 'cpf', 'rg', 'professional_register',
            'marital_status', 'register_pj', 'cnpj', 'company_name', 'trade_name', 'municipal_register', 'commercial_address',
            'nationality', 'social_media', 'website', 'linkedin', 'facebook', 'youtube', 'twitter', 'professional_experience', 'work_locations', 'work_description_hours',
            'monthly_revenue', 'mentorship_interest', 'main_goal', 'biggest_challenge', 'content_consumption', 'weekly_availability',
            'how_did_you_find_us', 'spouse_info', 'children_info', 'pets_info', 'emergency_contact', 'sports_info', 'exclude_from_book'
        ];
        
        $placeholders = array_map(fn($idx) => '$' . $idx, range(1, count($cols)));
        
        $vals = [
            $uuid,
            trim($b['name']),
            $b['specialty'] ?? null,
            $status,
            $b['last_contact'] ?? null,
            $b['notes'] ?? null,
            $b['age'] ?? null,
            $b['birthdate'] ?? null,
            $b['birthplace'] ?? null,
            $b['residence'] ?? null,
            $b['phone'] ?? null,
            $b['instagram'] ?? null,
            $b['email'] ?? null,
            $b['interests'] ?? null,
            $b['hobbies'] ?? null,
            $b['cover_image'] ?? null,
            $b['cpf'] ?? null,
            $b['rg'] ?? null,
            $b['professional_register'] ?? null,
            $b['marital_status'] ?? null,
            $b['register_pj'] ?? null,
            $b['cnpj'] ?? null,
            $b['company_name'] ?? null,
            $b['trade_name'] ?? null,
            $b['municipal_register'] ?? null,
            $b['commercial_address'] ?? null,
            $b['nationality'] ?? null,
            $b['social_media'] ?? null,
            $b['website'] ?? null,
            $b['linkedin'] ?? null,
            $b['facebook'] ?? null,
            $b['youtube'] ?? null,
            $b['twitter'] ?? null,
            $b['professional_experience'] ?? null,
            $b['work_locations'] ?? null,
            $b['work_description_hours'] ?? null,
            $b['monthly_revenue'] ?? null,
            $b['mentorship_interest'] ?? null,
            $b['main_goal'] ?? null,
            $b['biggest_challenge'] ?? null,
            $b['content_consumption'] ?? null,
            $b['weekly_availability'] ?? null,
            $b['how_did_you_find_us'] ?? null,
            $b['spouse_info'] ?? null,
            $b['children_info'] ?? null,
            $b['pets_info'] ?? null,
            $b['emergency_contact'] ?? null,
            $b['sports_info'] ?? null,
            (isset($b['exclude_from_book']) && $b['exclude_from_book']) ? 'true' : 'false'
        ];
        
        neon("INSERT INTO members (" . implode(', ', $cols) . ") VALUES (" . implode(', ', $placeholders) . ")", $vals);

        $hid = gen_uuid();
        neon(
            "INSERT INTO status_history (id, member_id, from_status, to_status, reason) VALUES ($1, $2, NULL, $3, 'Membro cadastrado')",
            [$hid, $uuid, $status]
        );

        $member = neon_first("SELECT * FROM members WHERE id = $1", [$uuid]);
        respond($member, 201);
    }
}

// PATCH ?id= — atualiza campos
if (method() === 'PATCH' && $id) {
    $b       = normalize_member_updates(body());
    $allowed = [
        'name', 'specialty', 'status', 'last_contact', 'notes', 'position',
        'age', 'birthdate', 'birthplace', 'residence', 'phone', 'instagram', 'email', 'interests', 'hobbies', 'cover_image',
        'cpf', 'rg', 'professional_register', 'marital_status', 'register_pj', 'cnpj', 'company_name', 'trade_name',
        'municipal_register', 'commercial_address', 'nationality', 'social_media', 'website', 'linkedin', 'facebook', 'youtube', 'twitter', 'professional_experience',
        'work_locations', 'work_description_hours', 'monthly_revenue', 'mentorship_interest', 'main_goal', 'biggest_challenge',
        'content_consumption', 'weekly_availability', 'how_did_you_find_us', 'spouse_info', 'children_info', 'pets_info',
        'emergency_contact', 'sports_info', 'exclude_from_book',
        'membership_start_date', 'membership_expiration_date', 'contract_value', 'plan_name',
        'card_template_model', 'card_photo_align', 'members_book_model'
    ];
    $sets    = [];
    $vals    = [];
    $i       = 1;

    $statusChanged = false;
    $oldStatus = null;
    $newStatus = null;

    if (isset($b['status'])) {
        $current = neon_first("SELECT status FROM members WHERE id = $1", [$id]);
        if ($current && $current['status'] !== $b['status']) {
            $statusChanged = true;
            $oldStatus = $current['status'];
            $newStatus = $b['status'];
        }
    }

    foreach ($allowed as $f) {
        if (array_key_exists($f, $b)) {
            $sets[] = "$f = \$$i";
            $val = $b[$f];
            if ($f === 'exclude_from_book') {
                $val = $val ? 'true' : 'false';
            }
            $vals[] = $val;
            $i++;
        }
    }
    if (empty($sets)) error('Nada para atualizar');

    $sets[] = "updated_at = NOW()";
    $vals[] = $id;

    neon("UPDATE members SET " . implode(', ', $sets) . " WHERE id = \$$i", $vals);

    if ($statusChanged) {
        $hid = gen_uuid();
        $authorName = null;
        if (!empty($currentUser['id'])) {
            $uRow = neon_first("SELECT name FROM users WHERE id = $1", [$currentUser['id']]);
            if ($uRow && !empty($uRow['name'])) $authorName = $uRow['name'];
        }
        if (empty($authorName)) $authorName = $currentUser['name'] ?? $currentUser['email'] ?? 'Marcio Araujo';

        neon(
            "INSERT INTO status_history (id, member_id, from_status, to_status, reason, author_name) VALUES ($1, $2, $3, $4, $5, $6)",
            [$hid, $id, $oldStatus, $newStatus, 'Status editado pelo formulário', $authorName]
        );
    }

    $row = neon_first("SELECT * FROM members WHERE id = $1", [$id]);
    respond($row);
}

// POST ?id=&action=move
if (method() === 'POST' && $id && $action === 'move') {
    $b     = body();
    $valid = ['cinza', 'azul', 'verde', 'amarela', 'vermelha'];
    if (!in_array($b['status'] ?? '', $valid)) error('Status inválido');

    $current = neon_first("SELECT status FROM members WHERE id = $1", [$id]);
    if (!$current) error('Membro não encontrado', 404);

    neon("UPDATE members SET status = $1, updated_at = NOW() WHERE id = $2", [$b['status'], $id]);

    $authorName = null;
    if (!empty($currentUser['id'])) {
        $uRow = neon_first("SELECT name FROM users WHERE id = $1", [$currentUser['id']]);
        if ($uRow && !empty($uRow['name'])) $authorName = $uRow['name'];
    }
    if (empty($authorName)) $authorName = $currentUser['name'] ?? $currentUser['email'] ?? 'Marcio Araujo';

    $hid = gen_uuid();
    neon(
        "INSERT INTO status_history (id, member_id, from_status, to_status, reason, author_name) VALUES ($1, $2, $3, $4, $5, $6)",
        [$hid, $id, $current['status'], $b['status'], $b['reason'] ?? null, $authorName]
    );

    $row = neon_first("SELECT * FROM members WHERE id = $1", [$id]);
    respond($row);
}

// DELETE ?id=
if (method() === 'DELETE' && $id) {
    $row = neon_first("SELECT id FROM members WHERE id = $1", [$id]);
    if (!$row) error('Membro não encontrado', 404);
    neon("DELETE FROM members WHERE id = $1", [$id]);
    respond(null, 204);
}

error('Rota não encontrada', 404);
