-- ---------------------------------------------------------------------------
-- F0 — Autenticação de servidor e multi-tenant
--
-- Migração INCREMENTAL: preserva todos os dados existentes (33 membros,
-- 5 cursos, 10 aulas, 4 artigos, 4 departamentos, 1 usuário).
--
-- Estratégia para colunas NOT NULL em tabelas com linhas:
--   1. adicionar a coluna como NULL
--   2. backfill apontando para a organização padrão
--   3. só então aplicar SET NOT NULL
--
-- Toda instrução é idempotente: rodar duas vezes não causa erro.
--
-- Convenção: o banco usa snake_case (criado por lib/neon-db.ts). O
-- schema.prisma mapeia com @map em vez de renomear colunas, para não quebrar
-- a camada de SQL cru que ainda alimenta a aplicação.
-- ---------------------------------------------------------------------------

-- 1. Organizações -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(200) NOT NULL,
  slug          VARCHAR(100) NOT NULL UNIQUE,
  domain        VARCHAR(200),
  plan          VARCHAR(20)  NOT NULL DEFAULT 'STARTER',
  logo_url      TEXT,
  primary_color VARCHAR(20)  NOT NULL DEFAULT '#EAB308',
  features      JSONB        NOT NULL DEFAULT '{"kanban":true,"academy":true,"wiki":true,"financial":true,"events":true}'::jsonb,
  created_at    TIMESTAMP    NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT now()
);

INSERT INTO organizations (name, slug)
VALUES ('Rocket Club', 'rocket-club')
ON CONFLICT (slug) DO NOTHING;

-- 2. Colunas novas em users -------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id   UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone             VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url        TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status            VARCHAR(20) NOT NULL DEFAULT 'ATIVO';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_primary_master BOOLEAN     NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at    TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id     UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMP   NOT NULL DEFAULT now();

-- 3. Backfill da organização em users ---------------------------------------
UPDATE users
   SET organization_id = (SELECT id FROM organizations WHERE slug = 'rocket-club')
 WHERE organization_id IS NULL;

ALTER TABLE users ALTER COLUMN organization_id SET NOT NULL;

-- 4. Departamentos passam a pertencer à organização -------------------------
ALTER TABLE departments ADD COLUMN IF NOT EXISTS organization_id UUID;

UPDATE departments
   SET organization_id = (SELECT id FROM organizations WHERE slug = 'rocket-club')
 WHERE organization_id IS NULL;

ALTER TABLE departments ALTER COLUMN organization_id SET NOT NULL;

-- 5. Chaves estrangeiras ----------------------------------------------------
-- PostgreSQL não suporta ADD CONSTRAINT IF NOT EXISTS; o bloco DO torna
-- a instrução idempotente.
DO $$ BEGIN
  ALTER TABLE users
    ADD CONSTRAINT users_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE users
    ADD CONSTRAINT users_department_id_fkey
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE departments
    ADD CONSTRAINT departments_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Normalizar o vocabulário de papéis -------------------------------------
-- O banco guardava 'master' / 'funcionario'. Passa a usar o mesmo vocabulário
-- de lib/permissions.ts, em maiúsculas e sem acento.
UPDATE users
   SET role = CASE lower(role)
     WHEN 'master'        THEN 'MASTER'
     WHEN 'admin'         THEN 'ADMINISTRADOR'
     WHEN 'administrador' THEN 'ADMINISTRADOR'
     WHEN 'editor'        THEN 'EDITOR'
     WHEN 'cliente'       THEN 'CLIENTE'
     ELSE 'USUARIO'
   END
 WHERE role NOT IN ('MASTER', 'ADMINISTRADOR', 'EDITOR', 'CLIENTE', 'USUARIO');

ALTER TABLE users ALTER COLUMN role SET DEFAULT 'USUARIO';

-- 7. Marcar o Master principal ----------------------------------------------
-- O mais antigo dos Masters não pode ser excluído nem rebaixado.
UPDATE users
   SET is_primary_master = true
 WHERE id = (
   SELECT id FROM users
    WHERE role = 'MASTER'
    ORDER BY created_at ASC NULLS LAST
    LIMIT 1
 )
   AND NOT EXISTS (SELECT 1 FROM users WHERE is_primary_master = true);

-- 8. E-mail único por organização, não globalmente --------------------------
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS users_organization_id_email_key
  ON users (organization_id, email);

CREATE INDEX IF NOT EXISTS users_organization_id_role_idx
  ON users (organization_id, role);

-- 9. Códigos de recuperação de senha ----------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash  VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP    NOT NULL,
  used_at    TIMESTAMP,
  created_at TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_expires_idx
  ON password_reset_tokens (user_id, expires_at);

-- 10. Matriz de permissões por papel ----------------------------------------
CREATE TABLE IF NOT EXISTS role_permissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role            VARCHAR(20) NOT NULL,
  permissions     JSONB       NOT NULL,
  UNIQUE (organization_id, role)
);
