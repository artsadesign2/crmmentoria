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
    "CREATE EXTENSION IF NOT EXISTS pgcrypto",

    "CREATE TABLE IF NOT EXISTS members (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(200) NOT NULL,
        specialty   VARCHAR(200),
        status      VARCHAR(20) NOT NULL DEFAULT 'cinza',
        last_contact DATE,
        notes       TEXT,
        position    INTEGER DEFAULT 0,
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW(),
        age         VARCHAR(50),
        birthdate   DATE,
        birthplace  VARCHAR(200),
        residence   VARCHAR(200),
        phone       VARCHAR(50),
        instagram   VARCHAR(100),
        email       VARCHAR(150),
        interests   TEXT,
        hobbies     TEXT,
        cover_image TEXT,
        cpf         VARCHAR(50),
        rg          VARCHAR(50),
        professional_register VARCHAR(100),
        marital_status VARCHAR(50),
        register_pj VARCHAR(10),
        cnpj        VARCHAR(50),
        company_name VARCHAR(200),
        trade_name  VARCHAR(200),
        municipal_register VARCHAR(50),
        commercial_address VARCHAR(300),
        nationality VARCHAR(100),
        social_media TEXT,
        website     VARCHAR(200),
        linkedin    VARCHAR(200),
        facebook    VARCHAR(200),
        youtube     VARCHAR(200),
        twitter     VARCHAR(200),
        professional_experience VARCHAR(100),
        work_locations TEXT,
        work_description_hours TEXT,
        monthly_revenue VARCHAR(100),
        mentorship_interest TEXT,
        main_goal   TEXT,
        biggest_challenge TEXT,
        content_consumption TEXT,
        weekly_availability VARCHAR(100),
        how_did_you_find_us VARCHAR(200),
        spouse_info VARCHAR(200),
        children_info TEXT,
        pets_info   TEXT,
        emergency_contact VARCHAR(200),
        sports_info TEXT,
        exclude_from_book BOOLEAN DEFAULT FALSE,
        card_template_model VARCHAR(50),
        card_photo_align VARCHAR(50),
        members_book_model VARCHAR(50)
    )",

    "CREATE TABLE IF NOT EXISTS contact_log (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        member_id    UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        type         VARCHAR(50) DEFAULT 'message',
        note         TEXT,
        contact_date DATE DEFAULT CURRENT_DATE,
        created_at   TIMESTAMP DEFAULT NOW()
    )",

    "CREATE TABLE IF NOT EXISTS milestones (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        member_id   UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        pillar      INTEGER NOT NULL,
        title       VARCHAR(300) NOT NULL,
        description TEXT,
        achieved_at DATE DEFAULT CURRENT_DATE,
        created_at  TIMESTAMP DEFAULT NOW()
    )",

    "CREATE TABLE IF NOT EXISTS goals (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        member_id    UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        pillar       INTEGER NOT NULL,
        title        VARCHAR(300) NOT NULL,
        description  TEXT,
        status       VARCHAR(20) DEFAULT 'open',
        due_date     DATE,
        completed_at DATE,
        created_at   TIMESTAMP DEFAULT NOW()
    )",

    "CREATE TABLE IF NOT EXISTS status_history (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        member_id   UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        from_status VARCHAR(20),
        to_status   VARCHAR(20) NOT NULL,
        reason      TEXT,
        changed_at  TIMESTAMP DEFAULT NOW()
    )",

    "CREATE TABLE IF NOT EXISTS settings (
        key         VARCHAR(100) PRIMARY KEY,
        value       TEXT NOT NULL
    )",

    "CREATE TABLE IF NOT EXISTS departments (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name       VARCHAR(100) UNIQUE NOT NULL,
        is_fixed   BOOLEAN DEFAULT FALSE
    )",

    "CREATE TABLE IF NOT EXISTS users (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email         VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name          VARCHAR(150) NOT NULL,
        role          VARCHAR(20) NOT NULL DEFAULT 'funcionario',
        created_at    TIMESTAMP DEFAULT NOW()
    )",

    "CREATE TABLE IF NOT EXISTS user_permissions (
        user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
        permission VARCHAR(50) NOT NULL,
        PRIMARY KEY (user_id, permission)
    )",

    "CREATE TABLE IF NOT EXISTS wiki_articles (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title         VARCHAR(200) NOT NULL,
        summary       TEXT,
        content       TEXT NOT NULL,
        category      VARCHAR(100) DEFAULT 'Geral',
        department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
        is_public     BOOLEAN DEFAULT FALSE,
        views_count   INTEGER DEFAULT 0,
        created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at    TIMESTAMP DEFAULT NOW(),
        updated_at    TIMESTAMP DEFAULT NOW()
    )",
    
    "CREATE TABLE IF NOT EXISTS login_attempts (
        ip           VARCHAR(50) NOT NULL,
        email        VARCHAR(150) NOT NULL,
        attempted_at TIMESTAMP DEFAULT NOW()
    )",

    // Índices de Desempenho
    "CREATE INDEX IF NOT EXISTS idx_members_status_pos_name ON members(status, position, name)",
    "CREATE INDEX IF NOT EXISTS idx_members_email ON members(email)",
    "CREATE INDEX IF NOT EXISTS idx_status_history_member ON status_history(member_id, changed_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_contact_log_member_date ON contact_log(member_id, contact_date DESC)",
    "CREATE INDEX IF NOT EXISTS idx_goals_member ON goals(member_id)",
    "CREATE INDEX IF NOT EXISTS idx_milestones_member ON milestones(member_id)",
    "CREATE INDEX IF NOT EXISTS idx_wiki_articles_dept ON wiki_articles(department_id, is_public)",
    "CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(email, ip, attempted_at)"
];

try {
    foreach ($queries as $sql) {
        neon($sql);
    }

    // Seed departments
    $departmentsSeed = [
        ['Operacional', true],
        ['Comercial', true],
        ['Financeiro', true],
        ['Jurídico', true]
    ];
    foreach ($departmentsSeed as $dept) {
        neon(
            "INSERT INTO departments (name, is_fixed) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING",
            [$dept[0], $dept[1] ? 'true' : 'false']
        );
    }

    // Seed default master user
    $masterUser = neon_first("SELECT id FROM users WHERE email = 'master@rocketclub.com'");
    if (!$masterUser) {
        $hash = password_hash('master123', PASSWORD_DEFAULT);
        neon(
            "INSERT INTO users (email, password_hash, name, role) VALUES ('master@rocketclub.com', $1, 'Tripulação Master', 'master')",
            [$hash]
        );
    }

    respond(['ok' => true, 'message' => 'Tabelas criadas e alimentadas com sucesso']);
} catch (Exception $e) {
    error($e->getMessage(), 500);
}
