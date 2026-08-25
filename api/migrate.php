<?php
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Acesso negado: execução permitida apenas via linha de comando (CLI).']);
    exit;
}

require 'helpers.php';
require 'db.php';

$queries = [
    "ALTER TABLE members ADD COLUMN IF NOT EXISTS age VARCHAR(50)",
    "ALTER TABLE members ADD COLUMN IF NOT EXISTS birthdate DATE",
    "ALTER TABLE members ADD COLUMN IF NOT EXISTS birthplace VARCHAR(200)",
    "ALTER TABLE members ADD COLUMN IF NOT EXISTS residence VARCHAR(200)",
    "ALTER TABLE members ADD COLUMN IF NOT EXISTS phone VARCHAR(50)",
    "ALTER TABLE members ADD COLUMN IF NOT EXISTS instagram VARCHAR(100)",
    "ALTER TABLE members ADD COLUMN IF NOT EXISTS email VARCHAR(150)",
    "ALTER TABLE members ADD COLUMN IF NOT EXISTS interests TEXT",
    "ALTER TABLE members ADD COLUMN IF NOT EXISTS hobbies TEXT",
    "ALTER TABLE members ADD COLUMN IF NOT EXISTS cover_image TEXT",
    "ALTER TABLE members ADD COLUMN IF NOT EXISTS exclude_from_book BOOLEAN DEFAULT FALSE",
    "ALTER TABLE members ADD COLUMN IF NOT EXISTS card_template_model VARCHAR(50)",
    "ALTER TABLE members ADD COLUMN IF NOT EXISTS card_photo_align VARCHAR(50)",
    "ALTER TABLE members ADD COLUMN IF NOT EXISTS members_book_model VARCHAR(50)",

    // Tabelas da Plataforma de E-Learning (Rocket Academy)
    "CREATE TABLE IF NOT EXISTS academy_courses (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title       VARCHAR(250) NOT NULL,
        description TEXT,
        category    VARCHAR(100) DEFAULT 'Geral',
        cover_image TEXT,
        banner_image TEXT,
        status      VARCHAR(20) DEFAULT 'published',
        position    INTEGER DEFAULT 0,
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
    )",

    "CREATE TABLE IF NOT EXISTS academy_modules (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id   UUID NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
        title       VARCHAR(250) NOT NULL,
        description TEXT,
        position    INTEGER DEFAULT 0,
        created_at  TIMESTAMP DEFAULT NOW()
    )",

    "CREATE TABLE IF NOT EXISTS academy_lessons (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        module_id        UUID NOT NULL REFERENCES academy_modules(id) ON DELETE CASCADE,
        title            VARCHAR(250) NOT NULL,
        description      TEXT,
        video_provider   VARCHAR(30) DEFAULT 'youtube',
        video_url        TEXT,
        duration_seconds INTEGER DEFAULT 0,
        attachments      TEXT,
        position         INTEGER DEFAULT 0,
        is_free_preview  BOOLEAN DEFAULT FALSE,
        created_at       TIMESTAMP DEFAULT NOW()
    )",

    "CREATE TABLE IF NOT EXISTS academy_progress (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        member_id           UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        lesson_id           UUID NOT NULL REFERENCES academy_lessons(id) ON DELETE CASCADE,
        completed           BOOLEAN DEFAULT TRUE,
        last_watched_second INTEGER DEFAULT 0,
        notes               TEXT,
        updated_at          TIMESTAMP DEFAULT NOW(),
        CONSTRAINT unique_member_lesson UNIQUE (member_id, lesson_id)
    )",

    "CREATE TABLE IF NOT EXISTS academy_comments (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lesson_id   UUID NOT NULL REFERENCES academy_lessons(id) ON DELETE CASCADE,
        user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
        member_id   UUID REFERENCES members(id) ON DELETE SET NULL,
        parent_id   UUID REFERENCES academy_comments(id) ON DELETE CASCADE,
        content     TEXT NOT NULL,
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
    )",

    // Índices de Desempenho
    "CREATE INDEX IF NOT EXISTS idx_members_status_pos_name ON members(status, position, name)",
    "CREATE INDEX IF NOT EXISTS idx_members_email ON members(email)",
    "CREATE INDEX IF NOT EXISTS idx_status_history_member ON status_history(member_id, changed_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_contact_log_member_date ON contact_log(member_id, contact_date DESC)",
    "CREATE INDEX IF NOT EXISTS idx_goals_member ON goals(member_id)",
    "CREATE INDEX IF NOT EXISTS idx_milestones_member ON milestones(member_id)",
    "CREATE INDEX IF NOT EXISTS idx_wiki_articles_dept ON wiki_articles(department_id, is_public)",
    "CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(email, ip, attempted_at)",
    "CREATE INDEX IF NOT EXISTS idx_academy_modules_course ON academy_modules(course_id, position)",
    "CREATE INDEX IF NOT EXISTS idx_academy_lessons_module ON academy_lessons(module_id, position)",
    "CREATE INDEX IF NOT EXISTS idx_academy_progress_member ON academy_progress(member_id, lesson_id)",
    "CREATE INDEX IF NOT EXISTS idx_academy_comments_lesson ON academy_comments(lesson_id, created_at ASC)",
    "ALTER TABLE academy_lessons ADD COLUMN IF NOT EXISTS cover_image TEXT",
    "ALTER TABLE academy_courses ADD COLUMN IF NOT EXISTS level VARCHAR(50) DEFAULT 'Geral'",
    "ALTER TABLE wiki_articles ADD COLUMN IF NOT EXISTS summary TEXT",
    "ALTER TABLE wiki_articles ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Geral'",
    "ALTER TABLE wiki_articles ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0"
];

try {
    foreach ($queries as $sql) {
        neon($sql);
    }
    respond(['ok' => true, 'message' => 'Colunas adicionadas com sucesso']);
} catch (Exception $e) {
    error($e->getMessage(), 500);
}
