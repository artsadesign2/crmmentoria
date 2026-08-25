<?php
/**
 * Rocket Club — Members Book PDF Generator
 * 
 * Generates a premium dark-theme PDF with:
 * - Cover page
 * - Alphabetical index
 * - Individual member profile pages with photos and all fields
 */

ini_set('memory_limit', '512M');
ini_set('max_execution_time', 300);

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/db.php';

// Validar autenticação (caso falhe, retorna 401 JSON em vez de 302)
$currentUser = get_current_user_data();
if (!$currentUser || !has_permission('members_read')) {
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Sessão expirada ou sem permissão de acesso. Por favor, faça login novamente.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// ── Brand Colors ─────────────────────────────────────────────
define('C_BG',      [10, 50, 75]);        // #0a324b  AZUL escuro (fundo)
define('C_BG2',     [15, 40, 60]);        // Variação mais escura
define('C_GOLD',    [175, 138, 89]);      // #af8a59  DOURADO
define('C_PURPLE',  [89, 55, 123]);       // #59377b  ROXO
define('C_WHITE',   [241, 245, 249]);     // Texto claro
define('C_MUTED',   [148, 163, 184]);     // Texto secundário
define('C_SECTION', [20, 60, 90]);        // Fundo de seção
define('C_LINE',    [30, 75, 110]);       // Linhas divisoras

// ── Status colors ────────────────────────────────────────────
$STATUS_COLORS = [
    'cinza'    => [148, 163, 184],
    'azul'     => [59, 130, 246],
    'verde'    => [16, 185, 129],
    'amarela'  => [245, 158, 11],
    'vermelha' => [239, 68, 68],
];
$STATUS_LABELS = [
    'cinza'    => 'Não Alocado',
    'azul'     => 'Iniciante',
    'verde'    => 'Engajado',
    'amarela'  => 'Morno',
    'vermelha' => 'Atenção Urgente',
];

$targetMemberId = $_GET['member_id'] ?? $_GET['id'] ?? null;
$isSingleMember = false;

if ($targetMemberId) {
    $members = neon("SELECT * FROM members WHERE id = $1", [$targetMemberId]);
    if (empty($members)) {
        http_response_code(404);
        echo json_encode(['error' => 'Membro não encontrado']);
        exit;
    }
    $isSingleMember = true;
} else {
    $members = neon("SELECT id, name, specialty, status, cover_image, last_contact, notes, position, created_at, updated_at, age, birthdate, birthplace, residence, phone, instagram, email, interests, hobbies, cpf, rg, professional_register, marital_status, register_pj, cnpj, company_name, trade_name, municipal_register, commercial_address, nationality, social_media, website, linkedin, facebook, youtube, twitter, professional_experience, work_locations, work_description_hours, monthly_revenue, mentorship_interest, main_goal, biggest_challenge, content_consumption, weekly_availability, how_did_you_find_us, spouse_info, children_info, pets_info, emergency_contact, sports_info FROM members WHERE exclude_from_book IS NOT TRUE AND status != 'cinza' ORDER BY name ASC");
}

if (empty($members)) {
    http_response_code(404);
    echo json_encode(['error' => 'Nenhum membro encontrado']);
    exit;
}

// ── Normalização de Especialidades ───────────────────────────
// Mapeia variações para nomenclaturas canônicas padronizadas
function normalizeSpecialty(string $raw): string {
    $s = mb_strtolower(trim($raw), 'UTF-8');

    // Fisioterapia (qualquer variação)
    if (str_contains($s, 'fisioterapi')) {
        if (str_contains($s, 'esporti') || str_contains($s, 'desporti') || str_contains($s, 'perform')) {
            return 'Fisioterapia Esportiva';
        }
        return 'Fisioterapia';
    }

    // Psicologia / Neuropsicologia
    if (str_contains($s, 'neuropsic') || str_contains($s, 'neurocient')) {
        return 'Neuropsicologia';
    }
    if (str_contains($s, 'psicol')) {
        return 'Psicologia';
    }

    // Odontologia e especializações
    if (str_contains($s, 'harmoniza')) {
        return 'Odontologia e Harmonização Facial';
    }
    if (str_contains($s, 'implantodont') && str_contains($s, 'pr')) {
        return 'Implantodontia e Prótese Dentária';
    }
    if (str_contains($s, 'ortodont')) {
        return 'Ortodontia';
    }
    if (str_contains($s, 'odontol') || str_contains($s, 'dentíst') || str_contains($s, 'dentist')) {
        return 'Odontologia';
    }

    // Cirurgias
    if (str_contains($s, 'cirurgi') || str_contains($s, 'cirugi')) {
        if (str_contains($s, 'pl')) return 'Cirurgia Plástica';
        if (str_contains($s, 'vascul')) return 'Cirurgia Vascular';
        return 'Cirurgia Geral';
    }

    // Ortopedia / Medicina Esportiva
    if (str_contains($s, 'ortopedi') || str_contains($s, 'traumatol')) {
        return 'Ortopedia e Traumatologia';
    }
    if (str_contains($s, 'ortopedist')) {
        return 'Ortopedia e Traumatologia';
    }

    // Medicina Chinesa
    if (str_contains($s, 'medicina chin') || str_contains($s, 'medicine chin')) {
        return 'Medicina Chinesa';
    }

    // Nutrição
    if (str_contains($s, 'nutri')) {
        return 'Nutrição';
    }

    // Dermatologia
    if (str_contains($s, 'dermatol')) {
        return 'Dermatologia';
    }

    // Biomedicina / Farmácia
    if (str_contains($s, 'biomédic') || str_contains($s, 'biomedic') || str_contains($s, 'farmac')) {
        return 'Biomedicina';
    }

    // Ciências Biológicas / Dados
    if (str_contains($s, 'biólog') || str_contains($s, 'biolog') || str_contains($s, 'cientist')) {
        return 'Ciências Biológicas';
    }

    // Educação Física
    if (str_contains($s, 'educa') && str_contains($s, 'fís')) {
        return 'Educação Física';
    }
    if (str_contains($s, 'educador físic') || str_contains($s, 'educador fisic')) {
        return 'Educação Física';
    }

    // Saúde / Agente
    if (str_contains($s, 'agente de saúde') || str_contains($s, 'agente de saude')) {
        return 'Agente de Saúde';
    }

    // Osteopatia
    if (str_contains($s, 'osteopat')) {
        return 'Osteopatia';
    }

    // Otorrinolaringologia
    if (str_contains($s, 'otorrin')) {
        return 'Otorrinolaringologia';
    }

    // Pediatria
    if (str_contains($s, 'pediatri')) {
        return 'Pediatria';
    }

    // Análises Clínicas
    if (str_contains($s, 'analista cl') || str_contains($s, 'patologi')) {
        return 'Análises Clínicas';
    }

    // Direito / Advocacia
    if (str_contains($s, 'advogad') || str_contains($s, 'direito')) {
        return 'Direito';
    }

    // Pedagogia / Educação
    if (str_contains($s, 'pedagogi') || str_contains($s, 'educa')) {
        return 'Pedagogia';
    }

    // Neurociência
    if (str_contains($s, 'neurociên') || str_contains($s, 'neurocienc')) {
        return 'Neurociência';
    }

    // Retorna capitalizado se não houver mapeamento
    return mb_convert_case(trim($raw), MB_CASE_TITLE, 'UTF-8');
}

// Helper robusto para tratar Cidade/UF (para Residência e Cidade Natal)
function formatCityState($val) {
    if (empty($val) || $val === '—') return '';
    $val = trim(preg_replace('/\s+/', ' ', $val));
    
    $states = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", 
               "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
    $state_regex = implode('|', $states);
    
    $val = preg_replace('/(?i)cep:?\s*\d{5}-?\d{3}/', '', $val);
    $val = trim($val);

    $pattern = '/(?:,\s*|-|\/|\b)\s*([A-Za-zÀ-ÖØ-öø-ÿ\s\.\'\-]+?)\s*[\/\-,;\s]+\s*\b(' . $state_regex . ')\b/ui';
    if (preg_match_all($pattern, $val, $allMatches, PREG_SET_ORDER)) {
        $lastMatch = end($allMatches);
        $cidadeRaw = trim($lastMatch[1]);
        $uf = strtoupper(trim($lastMatch[2]));
        
        if (strpos($cidadeRaw, ',') !== false) {
            $parts = explode(',', $cidadeRaw);
            $cidadeRaw = trim(end($parts));
        }
        if (strpos($cidadeRaw, '-') !== false) {
            $parts = explode('-', $cidadeRaw);
            $cidadeRaw = trim(end($parts));
        }
        
        $cidadeRaw = preg_replace('/^(?i)(apto|apartamento|bloco|bl|nº|no|rua|av|avenida|praça|praca)\s+[^,\-]+[,\-]\s*/ui', '', $cidadeRaw);
        $cidadeRaw = trim($cidadeRaw);
        
        $cidade = mb_convert_case($cidadeRaw, MB_CASE_TITLE, "UTF-8");
        return $cidade . '/' . $uf;
    }

    if (strpos($val, ',') !== false) {
        $parts = explode(',', $val);
        $val = trim(end($parts));
    }
    if (strpos($val, '/') !== false) {
        $parts = explode('/', $val);
        $cidade = mb_convert_case(trim($parts[0]), MB_CASE_TITLE, "UTF-8");
        $uf = strtoupper(trim($parts[1] ?? ''));
        if (strlen($uf) >= 2) {
            return $cidade . '/' . substr($uf, 0, 2);
        }
        return $cidade;
    }

    return mb_convert_case(trim($val), MB_CASE_TITLE, "UTF-8");
}

// Helper para carregar e obter o logotipo do sistema em alta definição para o TCPDF
function getCleanSystemLogoPath() {
    $possibleLogos = [
        __DIR__ . '/members_book_logo.png',
        __DIR__ . '/system_logo_clean.png',
        __DIR__ . '/system_logo.png',
        __DIR__ . '/system_logo.webp',
        __DIR__ . '/system_logo.svg',
        __DIR__ . '/birthday_card_logo.png'
    ];

    $sourceFile = null;
    foreach ($possibleLogos as $lFile) {
        if (file_exists($lFile) && filesize($lFile) > 50) {
            $sourceFile = $lFile;
            break;
        }
    }

    if (!$sourceFile) return null;

    if (str_ends_with(strtolower($sourceFile), '.png') || str_ends_with(strtolower($sourceFile), '.svg')) {
        return $sourceFile;
    }

    $raw = @file_get_contents($sourceFile);
    if (!$raw) return $sourceFile;

    $img = @imagecreatefromstring($raw);
    if (!$img) return $sourceFile;

    $w = imagesx($img);
    $h = imagesy($img);

    $canvas = imagecreatetruecolor($w, $h);
    imagealphablending($canvas, false);
    imagesavealpha($canvas, true);
    $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
    imagefill($canvas, 0, 0, $transparent);
    imagealphablending($canvas, true);
    imagecopy($canvas, $img, 0, 0, 0, 0, $w, $h);

    $cleanPath = __DIR__ . '/system_logo_clean.png';
    imagesavealpha($canvas, true);
    imagepng($canvas, $cleanPath, 0);
    imagedestroy($img);
    imagedestroy($canvas);

    return $cleanPath;
}

// Aplica normalização em todos os membros mantendo a especialidade original completa
foreach ($members as &$m) {
    $m['raw_specialty'] = $m['specialty'] ?? '';
    if (!empty($m['specialty'])) {
        $m['specialty'] = normalizeSpecialty($m['specialty']);
    }
}
unset($m);

// Helper: fetch cover_image for a single member (to avoid bulk download)
function getMemberImage($memberId) {
    try {
        $row = neon_first("SELECT cover_image FROM members WHERE id = $1", [$memberId]);
        return $row['cover_image'] ?? null;
    } catch (Exception $e) {
        return null;
    }
}

// ── Create PDF ───────────────────────────────────────────────
class MembersBookPDF extends TCPDF {
    public function Header() {
        // Sem cabeçalho
    }
    public function Footer() {
        $pageW = $this->getPageWidth();
        $savedLeft  = $this->lMargin;
        $savedRight = $this->rMargin;
        $this->lMargin  = 0;
        $this->rMargin  = 0;
        $this->SetXY(0, $this->getPageHeight() - 12);
        $this->SetFont('outfit', '', 8);
        $this->SetTextColor(148, 163, 184); // C_MUTED
        $this->Cell($pageW, 10, "Rocket Club — Members Book " . date('Y'), 0, 0, 'C');
        $this->lMargin  = $savedLeft;
        $this->rMargin  = $savedRight;
    }
}

$pdf = new MembersBookPDF('P', 'mm', 'A4', true, 'UTF-8', false);
$pdf->SetCreator('Rocket Club');
$pdf->SetAuthor('Rocket Club');
$pdf->SetTitle('Rocket Club — Members Book ' . date('Y'));
$pdf->SetSubject('Members Book');
$pdf->SetMargins(15, 12, 15);
$pdf->SetAutoPageBreak(true, 15);
$pdf->setPrintHeader(false);
$pdf->setPrintFooter(false);

// ══════════════════════════════════════════════════════════════
// COVER PAGE (CAPA GERADA VIA CÓDIGO COM DESIGN OFICIAL)
// ══════════════════════════════════════════════════════════════
$pdf->SetAutoPageBreak(false, 0);
$pdf->SetMargins(0, 0, 0);
$pdf->AddPage();

// Fundo Azul Marinho com Gradiente Radial Centralizado
$pdf->SetFillColor(7, 25, 43);
$pdf->Rect(0, 0, 210, 297, 'F');
try {
    $pdf->RadialGradient(0, 0, 210, 297, [14, 50, 78], [4, 13, 22], [0.5, 0.5, 0.5, 0.5, 1]);
} catch (Exception $e) {}

// Faixa Superior Dourada Inclinada (5.71°)
$topPointsCover = [0, 0, 210, 0, 210, 11, 0, 32];
$pdf->SetFillColor(179, 131, 69);
$pdf->Polygon($topPointsCover, 'F');

// Logotipo Central da Capa (Logotipo do Sistema sem Fundo Preto e sem Distorção)
$systemLogoFile = getCleanSystemLogoPath();

if ($systemLogoFile) {
    if (str_ends_with(strtolower($systemLogoFile), '.svg')) {
        $pdf->ImageSVG($systemLogoFile, 55, 90, 100, 0, '', '', 'C');
    } else {
        list($origW, $origH) = @getimagesize($systemLogoFile);
        $targetW = 115; // Largura proporcional de 115mm (excelente legibilidade e alta definição)
        $targetH = ($origW > 0 && $origH > 0) ? $targetW * ($origH / $origW) : 27.7;
        $targetX = (210 - $targetW) / 2; // Centralização horizontal perfeita (A4 = 210mm)
        $targetY = 88;
        $pdf->Image($systemLogoFile, $targetX, $targetY, $targetW, $targetH, 'PNG');
    }
}

// Título Principal da Capa
$pdf->SetXY(0, 135);
$pdf->SetFont('outfit', 'B', 36);
$pdf->SetTextColor(223, 178, 108); // Gold
$pdf->Cell(210, 16, 'MEMBERS BOOK', 0, 1, 'C');

// Rodapé Branco Slanted com Recorte Roxo na Capa (Sem Logo)
$whitePointsCover = [0, 274.5, 210, 253.5, 210, 297, 0, 297];
$pdf->SetFillColor(255, 255, 255);
$pdf->Polygon($whitePointsCover, 'F');

$purplePointsCover = [166, 297, 210, 195, 210, 297];
$pdf->SetFillColor(74, 46, 112);
$pdf->Polygon($purplePointsCover, 'F');

// ══════════════════════════════════════════════════════════════
// INDEX PAGE (ÍNDICE GERADO VIA CÓDIGO COM DESIGN OFICIAL)
// ══════════════════════════════════════════════════════════════
$pdf->AddPage();

// Fundo Gradiente Radial Centralizado
$pdf->SetFillColor(7, 25, 43);
$pdf->Rect(0, 0, 210, 297, 'F');
try {
    $pdf->RadialGradient(0, 0, 210, 297, [14, 50, 78], [4, 13, 22], [0.5, 0.5, 0.5, 0.5, 1]);
} catch (Exception $e) {}

// Faixa Superior Dourada Inclinada
$pdf->SetFillColor(179, 131, 69);
$pdf->Polygon($topPointsCover, 'F');

// Título do Índice
$pdf->SetXY(0, 36);
$pdf->SetFont('outfit', 'B', 22);
$pdf->SetTextColor(223, 178, 108);
$pdf->Cell(210, 10, 'ÍNDICE DE MENTORADOS', 0, 1, 'C');

$pdf->SetDrawColor(223, 178, 108);
$pdf->SetLineWidth(0.4);
$pdf->Line(70, 48, 140, 48);

$indexPerPage = 40;
$totalPagesForIndex = ceil(count($members) / $indexPerPage);

for ($i = 0; $i < count($members); $i++) {
    $m = $members[$i];
    
    if ($i > 0 && $i % $indexPerPage === 0) {
        $pdf->AddPage();
        $pdf->SetFillColor(7, 25, 43);
        $pdf->Rect(0, 0, 210, 297, 'F');
        try {
            $pdf->RadialGradient(0, 0, 210, 297, [14, 50, 78], [4, 13, 22], [0.5, 0.5, 0.5, 0.5, 1]);
        } catch (Exception $e) {}
        
        $pdf->SetFillColor(179, 131, 69);
        $pdf->Polygon($topPointsCover, 'F');

        $pdf->SetXY(0, 36);
        $pdf->SetFont('outfit', 'B', 22);
        $pdf->SetTextColor(223, 178, 108);
        $pdf->Cell(210, 10, 'ÍNDICE DE MENTORADOS', 0, 1, 'C');
        
        $pdf->SetDrawColor(223, 178, 108);
        $pdf->SetLineWidth(0.4);
        $pdf->Line(70, 48, 140, 48);
    }
    
    $localIdx = $i % $indexPerPage;
    $col = intval($localIdx / 20);
    $row = $localIdx % 20;
    
    $itemX = ($col === 0) ? 14 : 110;
    $itemY = 54 + $row * 9.5;
    $pageNo = 1 + $totalPagesForIndex + 1 + $i;
    
    $link = $pdf->AddLink();
    $pdf->SetLink($link, 0, $pageNo);
    
    $pdf->SetXY($itemX, $itemY);
    $pdf->SetFont('outfit', 'B', 9.5);
    $pdf->SetTextColor(255, 255, 255);
    $displayName = mb_strimwidth($m['name'], 0, 28, '…');
    $pdf->Cell(52, 6, $displayName, 0, 0, '', false, $link);

    $pdf->SetFont('outfit', 'I', 8.5);
    $pdf->SetTextColor(160, 174, 192);
    $displaySpec = !empty($m['specialty']) ? ' — ' . mb_strimwidth($m['specialty'], 0, 24, '…') : '';
    $pdf->Cell(34, 6, $displaySpec, 0, 1, '', false, $link);

    $pdf->SetDrawColor(40, 65, 88);
    $pdf->SetLineWidth(0.08);
    $pdf->Line($itemX, $itemY + 7.5, $itemX + 86, $itemY + 7.5);
}

// ══════════════════════════════════════════════════════════════
// MEMBER PAGES (APENAS MODELO 1 APRIMORADO — SEM TEXTO NO TOPO E SEM RODAPÉ BRANCO)
// ══════════════════════════════════════════════════════════════
function formatLinks($value) {
    if (empty($value) || $value === '—' || $value === null) return '';
    $valClean = mb_strtolower(trim($value));
    $negatives = [
        '-', '—', 'não tenho', 'nao tenho', 'não possuo', 'nao possuo',
        'nenhuma', 'mais nenhuma', 'não tenho outra mídia profissional',
        'não uso nenhuma profissionalmente', 'apenas instagram',
        'não tenho outras mídias', 'nao atuo em outras. apenas instagram.',
        'não sei.', 'não sei', 'ainda não tenho', 'site'
    ];
    if (in_array($valClean, $negatives)) return '';

    $parts = preg_split('/[,;\s\/]+\s*@/', $value);
    $htmlParts = [];
    
    if (count($parts) > 1) {
        foreach ($parts as $idx => $part) {
            $part = trim($part);
            if (empty($part)) continue;
            if ($idx > 0 && !str_starts_with($part, '@')) {
                $part = '@' . $part;
            }
            if (preg_match('/^@([a-zA-Z0-9_\.]+)/', $part, $matches)) {
                $handle = $matches[1];
                $url = 'https://instagram.com/' . $handle;
                $htmlParts[] = '<a href="' . $url . '" style="color:#a8833a; text-decoration:none; font-weight:bold;">@' . htmlspecialchars($handle) . '</a>';
            }
        }
        if (!empty($htmlParts)) return implode(', ', $htmlParts);
    }

    $parts = preg_split('/[,;]+/', $value);
    foreach ($parts as $part) {
        $part = trim($part);
        if (empty($part)) continue;
        if (in_array(mb_strtolower($part), $negatives)) continue;

        if (preg_match('/^(https?:\/\/|www\.)[^\s]+/i', $part) || preg_match('/^[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}(\/[^\s]*)?$/i', $part)) {
            $url = $part;
            if (!preg_match('/^https?:\/\//i', $url)) {
                $url = 'https://' . $url;
            }
            if (preg_match('/instagram\.com\/([a-zA-Z0-9_\.]+)/i', $url, $matches)) {
                $handle = $matches[1];
                $label = '@' . $handle;
            } else {
                $label = preg_replace('/^https?:\/\/(www\.)?/i', '', $part);
                $label = mb_strimwidth($label, 0, 30, '…');
            }
            $htmlParts[] = '<a href="' . htmlspecialchars($url) . '" style="color:#a8833a; text-decoration:none; font-weight:bold;">' . htmlspecialchars($label) . '</a>';
        } elseif (preg_match('/^@([a-zA-Z0-9_\.]+)/', $part, $matches)) {
            $handle = $matches[1];
            $url = 'https://www.instagram.com/' . $handle;
            $htmlParts[] = '<a href="' . $url . '" style="color:#a8833a; text-decoration:none; font-weight:bold;">@' . htmlspecialchars($handle) . '</a>';
        } else {
            $htmlParts[] = htmlspecialchars($part);
        }
    }
    return implode(', ', $htmlParts);
}

function renderMemberPageModel1($pdf, $m) {
    // 1. Fundo Azul Marinho Profundo com Gradiente Radial Centralizado
    $pdf->SetFillColor(7, 25, 43);
    $pdf->Rect(0, 0, 210, 297, 'F');
    try {
        $pdf->RadialGradient(0, 0, 210, 297, [14, 50, 78], [4, 13, 22], [0.5, 0.5, 0.5, 0.5, 1]);
    } catch (Exception $e) {}

    // 2. Faixa Superior Dourada Inclinada (5.71°) — SEM TEXTO INTERNO
    $topPoints = [
        0, 0,
        210, 0,
        210, 11,
        0, 32
    ];
    $pdf->SetFillColor(179, 131, 69); // #b38345
    $pdf->Polygon($topPoints, 'F');

    // 3. Foto do Mentorado (Esquerda X = 14mm, Y = 36mm)
    $photoWidth = 48;
    $photoHeight = 64;
    $photoX = 14;
    $photoY = 36;

    $coverImage = $m['cover_image'] ?? null;
    $imgBinary = null;
    if (!empty($coverImage) && strlen($coverImage) > 100) {
        try {
            $imgData = $coverImage;
            if (strpos($imgData, 'base64,') !== false) {
                $imgData = explode('base64,', $imgData)[1];
            }
            $imgBinary = base64_decode($imgData);
        } catch (Exception $e) { $imgBinary = null; }
    }

    $hasPhoto = false;
    if ($imgBinary !== null && strlen($imgBinary) > 100) {
        // Moldura Dupla Dourada
        $pdf->SetDrawColor(223, 178, 108);
        $pdf->SetLineWidth(0.9);
        $pdf->Rect($photoX - 1.2, $photoY - 1.2, $photoWidth + 2.4, $photoHeight + 2.4, 'D');
        $pdf->Image('@' . $imgBinary, $photoX, $photoY, $photoWidth, $photoHeight, '', '', '', true, 300, '', false, false, 0, 'CM');
        $hasPhoto = true;
    }

    if (!$hasPhoto) {
        $pdf->SetFillColor(15, 17, 26);
        $pdf->SetDrawColor(223, 178, 108);
        $pdf->SetLineWidth(0.9);
        $pdf->Rect($photoX, $photoY, $photoWidth, $photoHeight, 'DF');

        $pdf->SetDrawColor(83, 111, 129);
        $pdf->SetLineWidth(0.2);
        $pdf->Circle($photoX + $photoWidth/2, $photoY + $photoHeight/2, 19, 0, 360, 'D');

        $parts = explode(' ', trim($m['name']));
        $initials = count($parts) === 1
            ? strtoupper(mb_substr($parts[0], 0, 2))
            : strtoupper(mb_substr($parts[0], 0, 1) . mb_substr($parts[count($parts)-1], 0, 1));

        $pdf->SetFont('outfit', 'B', 26);
        $pdf->SetTextColor(223, 178, 108);
        $pdf->SetXY($photoX, $photoY + ($photoHeight / 2) - 7.5);
        $pdf->Cell($photoWidth, 15, $initials, 0, 0, 'C');
    }

    // 4. Cabeçalho com Nome & Especialidade (Direita X = 68mm)
    $rightX = 68;
    $rightW = 128;
    $topY = 36;

    $pdf->SetXY($rightX, $topY);
    $pdf->SetFont('outfit', 'B', 19);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->MultiCell($rightW, 8, $m['name'], 0, 'L', false, 1);
    
    $specY = $pdf->GetY() + 0.5;
    $pdf->SetXY($rightX, $specY);
    $pdf->SetFont('outfit', 'I', 12);
    $pdf->SetTextColor(223, 178, 108);
    $specText = !empty($m['raw_specialty']) ? $m['raw_specialty'] : 'Membro Rocket Club';
    $pdf->MultiCell($rightW, 5.5, $specText, 0, 'L', false, 1);

    // Linha Sutil Separadora
    $headerSubY = $pdf->GetY() + 2;
    $pdf->SetDrawColor(83, 111, 129);
    $pdf->SetLineWidth(0.12);
    $pdf->Line($rightX, $headerSubY, 196, $headerSubY);

    // Grid de Informações de Contato & Perfil
    $topInfoY = $headerSubY + 3;

    $headerField = function($label, $value, $x, &$y, $w = 60, $isHTML = false) use ($pdf) {
        if (empty($value) || $value === '—' || $value === null) return;
        $pdf->SetXY($x, $y);
        $pdf->SetFont('outfit', 'B', 8.5);
        $pdf->SetTextColor(160, 174, 192);
        $pdf->Cell($w, 3.5, mb_strtoupper($label), 0, 1, 'L');
        $y += 3.5;

        $pdf->SetXY($x, $y);
        $pdf->SetFont('outfit', '', 10.5);
        $pdf->SetTextColor(255, 255, 255);
        if ($isHTML) {
            $pdf->writeHTMLCell($w, 4.5, $x, $y, $value, 0, 1, false, true, 'L', true);
        } else {
            $pdf->MultiCell($w, 4.5, $value, 0, 'L', false, 1);
        }
        $y = $pdf->GetY() + 1.8;
    };

    $birthday = '';
    if (!empty($m['birthdate'])) {
        $d = DateTime::createFromFormat('Y-m-d', $m['birthdate']);
        if ($d) $birthday = $d->format('d/m');
    }

    $birthplaceCityUF = formatCityState($m['birthplace'] ?? '');
    $residenceCityUF  = formatCityState($m['residence'] ?? '');

    $col1X = 68;
    $col1Y = $topInfoY;
    $headerField('Idade', !empty($m['age']) ? (strpos($m['age'], 'anos') !== false ? $m['age'] : $m['age'] . ' anos') : '', $col1X, $col1Y, 60);
    $headerField('Aniversário', $birthday, $col1X, $col1Y, 60);
    $headerField('Nacionalidade', $m['nationality'] ?? '', $col1X, $col1Y, 60);
    $headerField('Cidade Natal', $birthplaceCityUF, $col1X, $col1Y, 60);
    $headerField('Residência', $residenceCityUF, $col1X, $col1Y, 60);

    $col2X = 132;
    $col2Y = $topInfoY;
    $headerField('Telefone', $m['phone'] ?? '', $col2X, $col2Y, 64);
    $headerField('E-mail', $m['email'] ?? '', $col2X, $col2Y, 64);
    $headerField('Instagram', formatLinks($m['instagram'] ?? ''), $col2X, $col2Y, 64, true);
    if (!empty($m['linkedin'])) $headerField('LinkedIn', formatLinks($m['linkedin']), $col2X, $col2Y, 64, true);
    if (!empty($m['website']))  $headerField('Website', formatLinks($m['website']), $col2X, $col2Y, 64, true);

    $topBlockEndY = max($photoY + $photoHeight, $col1Y, $col2Y) + 4;

    // Linha Divisória Iluminada
    $pdf->SetDrawColor(83, 111, 129);
    $pdf->SetLineWidth(0.15);
    $pdf->Line(14, $topBlockEndY, 196, $topBlockEndY);

    // 5. Cartões Executivos Limpos com Fundo #0a1f33 e Bordas Finas Douradas
    $curY = $topBlockEndY + 6;
    $cardW = 182;
    $cardX = 14;

    $sectionTitle = function($title) use ($pdf, &$curY, $cardX, $cardW) {
        $pdf->SetFillColor(10, 31, 51); // #0a1f33
        $pdf->SetDrawColor(29, 61, 89);
        $pdf->SetLineWidth(0.3);
        $pdf->Rect($cardX, $curY, $cardW, 7, 'DF');
        
        $pdf->SetXY($cardX + 4, $curY + 1.2);
        $pdf->SetFont('outfit', 'B', 10.5);
        $pdf->SetTextColor(223, 178, 108);
        $pdf->Cell($cardW - 8, 5, mb_strtoupper($title), 0, 1);
        $curY += 9.0;
    };

    $fieldRow = function($label, $value, $isHTML = false) use ($pdf, &$curY, $cardX, $cardW) {
        if (empty($value) || $value === '—' || $value === null) return;
        
        $pdf->SetXY($cardX + 3, $curY);
        $pdf->SetFont('outfit', 'B', 9.5);
        $pdf->SetTextColor(160, 174, 192);
        $pdf->Cell(48, 4.5, $label . ':', 0, 0);
        
        $pdf->SetXY($cardX + 52, $curY);
        $pdf->SetFont('outfit', '', 10);
        $pdf->SetTextColor(255, 255, 255);
        if ($isHTML) {
            $pdf->writeHTMLCell($cardW - 55, 4.5, $cardX + 52, $curY, $value, 0, 1, false, true, 'L', true);
        } else {
            $pdf->MultiCell($cardW - 55, 4.5, $value, 0, 'L', false, 1);
        }
        $curY = $pdf->GetY() + 1.8;
        
        $pdf->SetDrawColor(40, 65, 88);
        $pdf->SetLineWidth(0.08);
        $pdf->Line($cardX + 3, $curY, $cardX + $cardW - 3, $curY);
        $curY += 2.5;
    };

    $hasProfessional = !empty($m['professional_register']) || !empty($m['professional_experience']) || !empty($m['work_locations']) || !empty($m['trade_name']) || !empty($m['commercial_address']);
    if ($hasProfessional) {
        $sectionTitle('ATUAÇÃO PROFISSIONAL & PJ');
        $fieldRow('Registro Profissional', $m['professional_register'] ?? '');
        $fieldRow('Nome Fantasia', $m['trade_name'] ?? '');
        $fieldRow('Razão Social', $m['company_name'] ?? '');
        $fieldRow('CNPJ', $m['cnpj'] ?? '');
        $fieldRow('Endereço Comercial', $m['commercial_address'] ?? '');
        $fieldRow('Experiência Profissional', $m['professional_experience'] ?? '');
        $fieldRow('Locais de Trabalho', $m['work_locations'] ?? '');
        $curY += 2.5;
    }

    $hasPersonal = !empty($m['hobbies']) || !empty($m['interests']) || !empty($m['sports_info']);
    if ($hasPersonal) {
        $sectionTitle('VIDA PESSOAL & FAMÍLIA');
        $fieldRow('Esportes', $m['sports_info'] ?? '');
        $fieldRow('Hobbies', $m['hobbies'] ?? '');
        $fieldRow('Interesses', $m['interests'] ?? '');
        $curY += 2.5;
    }
}

foreach ($members as $idx => $m) {
    $pdf->AddPage();
    $pdf->SetAutoPageBreak(false);
    renderMemberPageModel1($pdf, $m);
}

// ══════════════════════════════════════════════════════════════
// OUTPUT
// ══════════════════════════════════════════════════════════════
// Generate PDF as a raw binary string
$pdfData = $pdf->Output('', 'S');

// Clean download headers
if ($isSingleMember && !empty($members[0]['name'])) {
    $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $members[0]['name']);
    $filename = 'Ficha_' . $safeName . '.pdf';
} else {
    $year = date('Y');
    $filename = 'Members_Book_' . $year . '.pdf';
}

if (ob_get_length()) {
    ob_clean();
}

header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . strlen($pdfData));
header('Cache-Control: private, max-age=0, must-revalidate');
header('Pragma: public');

echo $pdfData;
exit;
