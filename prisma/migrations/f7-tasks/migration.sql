-- ---------------------------------------------------------------------------
-- F7 — Gestão de Projetos e Tarefas (ClickUp + Notion + Todoist)
--
-- Tabelas para projetos, colunas do quadro, tarefas, subtarefas, comentários,
-- tags e configurações de feed de calendário (Google Calendar / iCal).
--
-- Toda instrução é idempotente: rodar duas vezes não causa erro.
-- ---------------------------------------------------------------------------

-- 1. Projetos ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  description     TEXT,
  icon            VARCHAR(50)  NOT NULL DEFAULT 'folder',
  color_hex       VARCHAR(20)  NOT NULL DEFAULT '#EAB308',
  is_archived     BOOLEAN      NOT NULL DEFAULT false,
  created_by_id   UUID         REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_projects_org_idx ON task_projects (organization_id, is_archived);

-- 2. Colunas do Quadro (Kanban Stages) --------------------------------------
CREATE TABLE IF NOT EXISTS task_columns (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID         NOT NULL REFERENCES task_projects(id) ON DELETE CASCADE,
  name                 VARCHAR(100) NOT NULL,
  color_hex            VARCHAR(20)  NOT NULL DEFAULT '#64748B',
  position             INT          NOT NULL DEFAULT 0,
  is_completed_column  BOOLEAN      NOT NULL DEFAULT false,
  created_at           TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_columns_proj_idx ON task_columns (project_id, position);

-- 3. Tarefas Principais -----------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      UUID         NOT NULL REFERENCES task_projects(id) ON DELETE CASCADE,
  column_id       UUID         NOT NULL REFERENCES task_columns(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  -- URGENTE | ALTA | MEDIA | BAIXA
  priority        VARCHAR(20)  NOT NULL DEFAULT 'MEDIA',
  position        INT          NOT NULL DEFAULT 0,
  start_date      TIMESTAMP,
  due_date        TIMESTAMP,
  assigned_to_id  UUID         REFERENCES users(id) ON DELETE SET NULL,
  created_by_id   UUID         REFERENCES users(id) ON DELETE SET NULL,
  google_event_id VARCHAR(255),
  is_archived     BOOLEAN      NOT NULL DEFAULT false,
  completed_at    TIMESTAMP,
  created_at      TIMESTAMP    NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_org_proj_idx ON tasks (organization_id, project_id, column_id);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks (organization_id, due_date);
CREATE INDEX IF NOT EXISTS tasks_assigned_idx ON tasks (assigned_to_id, is_archived);

-- 4. Subtarefas (Checklists rápidos estilo Todoist) --------------------------
CREATE TABLE IF NOT EXISTS task_subtasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID         NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  is_completed BOOLEAN      NOT NULL DEFAULT false,
  position     INT          NOT NULL DEFAULT 0,
  completed_at TIMESTAMP,
  created_at   TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_subtasks_task_idx ON task_subtasks (task_id, position);

-- 5. Comentários da Tarefa (Discussão da Equipe) -----------------------------
CREATE TABLE IF NOT EXISTS task_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID      NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT      NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_comments_task_idx ON task_comments (task_id, created_at);

-- 6. Configurações de Calendário & Feed iCal ---------------------------------
CREATE TABLE IF NOT EXISTS calendar_settings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID         NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  feed_token           VARCHAR(64)  NOT NULL UNIQUE,
  google_calendar_id   VARCHAR(255),
  google_refresh_token TEXT,
  sync_enabled         BOOLEAN      NOT NULL DEFAULT false,
  created_at           TIMESTAMP    NOT NULL DEFAULT now(),
  updated_at           TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calendar_settings_token_idx ON calendar_settings (feed_token);
