<?php
require 'helpers.php';
require 'db.php';

$currentUser = require_auth();

$action = $_GET['action'] ?? $_POST['action'] ?? null;
$id     = $_GET['id'] ?? null;

// Função auxiliar para determinar o ID do membro vinculado ao usuário da sessão
function get_session_member_id($currentUser) {
    $uuidPattern = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i';

    if (!empty($currentUser['member_id']) && preg_match($uuidPattern, $currentUser['member_id'])) {
        return $currentUser['member_id'];
    }
    
    // Tenta encontrar membro pelo email
    $email = $currentUser['email'] ?? '';
    if ($email) {
        $m = neon_first("SELECT id FROM members WHERE LOWER(email) = LOWER($1) LIMIT 1", [$email]);
        if ($m && !empty($m['id']) && preg_match($uuidPattern, $m['id'])) {
            return $m['id'];
        }
    }
    
    // Se for admin/master e não tiver membro correspondente, valida se o ID do usuário é UUID
    $userId = $currentUser['id'] ?? '';
    if (!empty($userId) && preg_match($uuidPattern, $userId)) {
        return $userId;
    }

    return '00000000-0000-0000-0000-000000000000';
}

$memberId = get_session_member_id($currentUser);

// -------------------------------------------------------------
// GET — Consultas da Plataforma E-Learning
// -------------------------------------------------------------
if (method() === 'GET') {
    $action = $action ?: 'courses';

    // 1. GET ?action=courses — Lista todos os cursos com métricas de progresso do aluno
    if ($action === 'courses') {
        try {
            $sql = "SELECT c.*, 
                    (SELECT COUNT(*) FROM academy_lessons l JOIN academy_modules m ON l.module_id = m.id WHERE m.course_id = c.id) as total_lessons,
                    (SELECT COUNT(*) FROM academy_progress p JOIN academy_lessons l ON p.lesson_id = l.id JOIN academy_modules m ON l.module_id = m.id WHERE m.course_id = c.id AND p.member_id = $1 AND p.completed = TRUE) as completed_lessons
                    FROM academy_courses c 
                    ORDER BY c.position ASC, c.created_at DESC";
            
            $courses = neon($sql, [$memberId]);

            // Calcular porcentagem de progresso para cada curso
            foreach ($courses as &$c) {
                $tot = (int)($c['total_lessons'] ?? 0);
                $comp = (int)($c['completed_lessons'] ?? 0);
                $c['progress_percent'] = ($tot > 0) ? min(100, round(($comp / $tot) * 100)) : 0;
            }

            respond($courses);
        } catch (Throwable $e) {
            error($e->getMessage(), 500);
        }
    }

    // 2. GET ?action=course_details&id={id} — Detalhes completos do curso, módulos e aulas
    if ($action === 'course_details') {
        if (!$id) error('ID do curso é obrigatório');

        try {
            $course = neon_first("SELECT * FROM academy_courses WHERE id = $1", [$id]);
            if (!$course) error('Curso não encontrado', 404);

            // Buscar módulos
            $modules = neon("SELECT * FROM academy_modules WHERE course_id = $1 ORDER BY position ASC, created_at ASC", [$id]);

            // Buscar aulas com dados de progresso e anotações do aluno logado
            foreach ($modules as &$mod) {
                $lessons = neon(
                    "SELECT l.*, 
                            COALESCE(p.completed, FALSE) as is_completed, 
                            COALESCE(p.last_watched_second, 0) as last_watched_second,
                            p.notes as student_notes
                     FROM academy_lessons l 
                     LEFT JOIN academy_progress p ON l.id = p.lesson_id AND p.member_id = $2
                     WHERE l.module_id = $1 
                     ORDER BY l.position ASC, l.created_at ASC",
                    [$mod['id'], $memberId]
                );

                // Tratar anexos em JSON se existirem
                foreach ($lessons as &$les) {
                    $les['attachments_list'] = !empty($les['attachments']) ? json_decode($les['attachments'], true) : [];
                    $les['is_completed'] = (bool)$les['is_completed'];
                }

                $mod['lessons'] = $lessons;
            }

            $course['modules'] = $modules;
            respond($course);
        } catch (Throwable $e) {
            error($e->getMessage(), 500);
        }
    }

    // 3. GET ?action=comments&lesson_id={id} — Busca comentários e dúvidas da aula
    if ($action === 'comments') {
        $lessonId = $_GET['lesson_id'] ?? null;
        if (!$lessonId) error('ID da aula é obrigatório');

        try {
            $comments = neon(
                "SELECT c.*, 
                        COALESCE(u.name, m.name, 'Usuário') as author_name,
                        COALESCE(u.role, 'funcionario') as author_role
                 FROM academy_comments c
                 LEFT JOIN users u ON c.user_id = u.id
                 LEFT JOIN members m ON c.member_id = m.id
                 WHERE c.lesson_id = $1
                 ORDER BY c.created_at ASC",
                [$lessonId]
            );

            respond($comments);
        } catch (Throwable $e) {
            error($e->getMessage(), 500);
        }
    }
}

// -------------------------------------------------------------
// POST — Ações de Progresso e Gerenciamento Administrativo
// -------------------------------------------------------------
if (method() === 'POST') {
    $b = body();
    $action = $b['action'] ?? $action;

    // 1. POST ?action=toggle_progress — Marcar/Desmarcar aula como concluída
    if ($action === 'toggle_progress') {
        $lessonId = $b['lesson_id'] ?? null;
        $completed = isset($b['completed']) ? (bool)$b['completed'] : true;

        if (!$lessonId) error('ID da aula é obrigatório');

        try {
            neon(
                "INSERT INTO academy_progress (id, member_id, lesson_id, completed, updated_at) 
                 VALUES (gen_random_uuid(), $1, $2, $3, NOW()) 
                 ON CONFLICT (member_id, lesson_id) 
                 DO UPDATE SET completed = EXCLUDED.completed, updated_at = NOW()",
                [$memberId, $lessonId, $completed ? 'true' : 'false']
            );

            respond(['ok' => true, 'completed' => $completed]);
        } catch (Throwable $e) {
            error($e->getMessage(), 500);
        }
    }

    // 2. POST ?action=save_notes — Salvar anotações pessoais do mentee na aula
    if ($action === 'save_notes') {
        $lessonId = $b['lesson_id'] ?? null;
        $notes    = trim($b['notes'] ?? '');

        if (!$lessonId) error('ID da aula é obrigatório');

        try {
            neon(
                "INSERT INTO academy_progress (id, member_id, lesson_id, notes, updated_at) 
                 VALUES (gen_random_uuid(), $1, $2, $3, NOW()) 
                 ON CONFLICT (member_id, lesson_id) 
                 DO UPDATE SET notes = EXCLUDED.notes, updated_at = NOW()",
                [$memberId, $lessonId, $notes]
            );

            respond(['ok' => true, 'message' => 'Anotações salvas com sucesso']);
        } catch (Throwable $e) {
            error($e->getMessage(), 500);
        }
    }

    // 3. POST ?action=save_comment — Criar comentário/dúvida em aula
    if ($action === 'save_comment') {
        $lessonId = $b['lesson_id'] ?? null;
        $parentId = $b['parent_id'] ?? null;
        $content  = trim($b['content'] ?? '');

        if (!$lessonId) error('ID da aula é obrigatório');
        if (empty($content)) error('Conteúdo do comentário é obrigatório');

        $userId   = preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $currentUser['id'] ?? '') ? $currentUser['id'] : null;
        $memId    = ($memberId !== '00000000-0000-0000-0000-000000000000') ? $memberId : null;

        try {
            $commentId = gen_uuid();
            neon(
                "INSERT INTO academy_comments (id, lesson_id, user_id, member_id, parent_id, content) 
                 VALUES ($1, $2, $3, $4, $5, $6)",
                [$commentId, $lessonId, $userId, $memId, $parentId, $content]
            );

            respond(['ok' => true, 'id' => $commentId, 'message' => 'Comentário enviado com sucesso']);
        } catch (Throwable $e) {
            error($e->getMessage(), 500);
        }
    }

    // 4. POST ?action=delete_comment — Deletar comentário
    if ($action === 'delete_comment') {
        $commentId = $b['id'] ?? null;
        if (!$commentId) error('ID do comentário é obrigatório');

        $userRole = $currentUser['role'] ?? 'funcionario';

        try {
            $existing = neon_first("SELECT * FROM academy_comments WHERE id = $1", [$commentId]);
            if (!$existing) error('Comentário não encontrado', 404);

            $isAuthor = ($existing['user_id'] === ($currentUser['id'] ?? '') || $existing['member_id'] === $memberId);
            $isAdmin  = ($userRole === 'master' || $userRole === 'admin');

            if (!$isAuthor && !$isAdmin) {
                error('Permissão negada para excluir este comentário', 403);
            }

            neon("DELETE FROM academy_comments WHERE id = $1", [$commentId]);
            respond(['ok' => true, 'message' => 'Comentário excluído com sucesso']);
        } catch (Throwable $e) {
            error($e->getMessage(), 500);
        }
    }

    // ---------------------------------------------------------
    // AÇÕES ADMINISTRATIVAS (Requer permissão Admin/Master)
    // ---------------------------------------------------------
    $userRole = $currentUser['role'] ?? 'funcionario';
    if ($userRole !== 'master' && $userRole !== 'admin') {
        error('Acesso negado: privilégios insuficientes para gerenciar a Academy', 403);
    }

    // 3. POST ?action=save_course — Criar ou Editar Curso
    if ($action === 'save_course') {
        $cId         = $b['id'] ?? null;
        $title       = trim($b['title'] ?? '');
        $description = trim($b['description'] ?? '');
        $category    = trim($b['category'] ?? 'Geral');
        $coverImage  = trim($b['cover_image'] ?? '');
        $bannerImage = trim($b['banner_image'] ?? '');
        $status      = trim($b['status'] ?? 'published');
        $position    = (int)($b['position'] ?? 0);

        if (empty($title)) error('Título do curso é obrigatório');

        try {
            if ($cId) {
                neon(
                    "UPDATE academy_courses 
                     SET title = $1, description = $2, category = $3, cover_image = $4, banner_image = $5, status = $6, position = $7, updated_at = NOW() 
                     WHERE id = $8",
                    [$title, $description, $category, $coverImage, $bannerImage, $status, $position, $cId]
                );
            } else {
                $cId = gen_uuid();
                neon(
                    "INSERT INTO academy_courses (id, title, description, category, cover_image, banner_image, status, position) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
                    [$cId, $title, $description, $category, $coverImage, $bannerImage, $status, $position]
                );
            }

            respond(['ok' => true, 'id' => $cId, 'message' => 'Curso salvo com sucesso']);
        } catch (Throwable $e) {
            error($e->getMessage(), 500);
        }
    }

    // 4. POST ?action=save_module — Criar ou Editar Módulo
    if ($action === 'save_module') {
        $mId         = $b['id'] ?? null;
        $courseId    = $b['course_id'] ?? null;
        $title       = trim($b['title'] ?? '');
        $description = trim($b['description'] ?? '');
        $position    = (int)($b['position'] ?? 0);

        if (!$courseId) error('ID do curso é obrigatório');
        if (empty($title)) error('Título do módulo é obrigatório');

        try {
            if ($mId) {
                neon(
                    "UPDATE academy_modules SET title = $1, description = $2, position = $3 WHERE id = $4",
                    [$title, $description, $position, $mId]
                );
            } else {
                $mId = gen_uuid();
                neon(
                    "INSERT INTO academy_modules (id, course_id, title, description, position) VALUES ($1, $2, $3, $4, $5)",
                    [$mId, $courseId, $title, $description, $position]
                );
            }

            respond(['ok' => true, 'id' => $mId, 'message' => 'Módulo salvo com sucesso']);
        } catch (Throwable $e) {
            error($e->getMessage(), 500);
        }
    }

    // 5. POST ?action=save_lesson — Criar ou Editar Aula
    if ($action === 'save_lesson') {
        $lId             = $b['id'] ?? null;
        $moduleId        = $b['module_id'] ?? null;
        $title           = trim($b['title'] ?? '');
        $description     = trim($b['description'] ?? '');
        $videoProvider   = trim($b['video_provider'] ?? 'youtube');
        $videoUrl        = trim($b['video_url'] ?? '');
        $durationSeconds = (int)($b['duration_seconds'] ?? 0);
        $attachments     = is_array($b['attachments'] ?? null) ? json_encode($b['attachments']) : ($b['attachments'] ?? '');
        $position        = (int)($b['position'] ?? 0);

        if (!$moduleId) error('ID do módulo é obrigatório');
        if (empty($title)) error('Título da aula é obrigatório');

        try {
            if ($lId) {
                neon(
                    "UPDATE academy_lessons 
                     SET title = $1, description = $2, video_provider = $3, video_url = $4, duration_seconds = $5, attachments = $6, position = $7 
                     WHERE id = $8",
                    [$title, $description, $videoProvider, $videoUrl, $durationSeconds, $attachments, $position, $lId]
                );
            } else {
                $lId = gen_uuid();
                neon(
                    "INSERT INTO academy_lessons (id, module_id, title, description, video_provider, video_url, duration_seconds, attachments, position) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
                    [$lId, $moduleId, $title, $description, $videoProvider, $videoUrl, $durationSeconds, $attachments, $position]
                );
            }

            respond(['ok' => true, 'id' => $lId, 'message' => 'Aula salva com sucesso']);
        } catch (Throwable $e) {
            error($e->getMessage(), 500);
        }
    }

    // 6. POST ?action=delete_course, delete_module, delete_lesson — Exclusão
    if (in_array($action, ['delete_course', 'delete_module', 'delete_lesson'])) {
        $deleteId = $b['id'] ?? null;
        if (!$deleteId) error('ID é obrigatório para exclusão');

        try {
            if ($action === 'delete_course') {
                neon("DELETE FROM academy_courses WHERE id = $1", [$deleteId]);
            } elseif ($action === 'delete_module') {
                neon("DELETE FROM academy_modules WHERE id = $1", [$deleteId]);
            } elseif ($action === 'delete_lesson') {
                neon("DELETE FROM academy_lessons WHERE id = $1", [$deleteId]);
            }

            respond(['ok' => true, 'message' => 'Item excluído com sucesso']);
        } catch (Throwable $e) {
            error($e->getMessage(), 500);
        }
    }
}

error('Ação inválida ou método não suportado', 400);
