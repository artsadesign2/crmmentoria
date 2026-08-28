-- F6 — Bot builder e motor de execução
--
-- A última fase do módulo, e a única em que o sistema fala com o cliente sem
-- uma pessoa no meio.
--
-- Toda instrução é idempotente. Nenhum DROP, nenhuma coluna removida. Nenhuma
-- coluna nova em tabela existente: `messages.is_from_bot` e
-- `contacts.custom_fields` estão de pé desde a F1, vazios, esperando esta fase.
--
-- Os dados existentes (1 organização, 1 usuário, 4 setores, 4 contatos,
-- 4 oportunidades, 6 etapas) permanecem.

-- 1. Fluxos ------------------------------------------------------------------
-- O rascunho. `graph` é o que o canvas edita e o que ninguém executa.
--
-- Separar rascunho de versão publicada é o que impede o pior modo de falha
-- desta fase: editar o fluxo às 14h e fazer quem está no meio de um
-- atendimento pular para um nó que não existe mais.

CREATE TABLE IF NOT EXISTS bot_flows (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_user_id UUID         REFERENCES users(id) ON DELETE SET NULL,
  name               VARCHAR(200) NOT NULL,
  graph              JSONB        NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  -- DRAFT | PUBLISHED
  status             VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
  -- Fluxo que atende conversa nova. No máximo um por organização (índice 5).
  is_trigger         BOOLEAN      NOT NULL DEFAULT false,
  -- Versão que está rodando. NULL enquanto nunca foi publicado.
  published_version  INT,
  created_at         TIMESTAMP    NOT NULL DEFAULT now(),
  updated_at         TIMESTAMP    NOT NULL DEFAULT now()
);


-- 2. Versões publicadas ------------------------------------------------------
-- Imutável por construção: nada aqui é atualizado, só inserido. Uma conversa em
-- andamento termina na versão em que começou.

CREATE TABLE IF NOT EXISTS bot_flow_versions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id              UUID      NOT NULL REFERENCES bot_flows(id) ON DELETE CASCADE,
  organization_id      UUID      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  version              INT       NOT NULL,
  graph                JSONB     NOT NULL,
  published_at         TIMESTAMP NOT NULL DEFAULT now(),
  published_by_user_id UUID      REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS bot_flow_versions_flow_version_key
  ON bot_flow_versions (flow_id, version);


-- 3. Sessões -----------------------------------------------------------------
-- O estado de uma conversa dentro de um fluxo.
--
-- `version` é o que amarra a sessão à versão congelada: o executor carrega o
-- grafo de bot_flow_versions, nunca de bot_flows.

CREATE TABLE IF NOT EXISTS bot_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  flow_id         UUID        NOT NULL REFERENCES bot_flows(id) ON DELETE CASCADE,
  version         INT         NOT NULL,
  current_node_id VARCHAR(80),
  -- O que os nós de captura guardaram, e o que as condições leem.
  variables       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  -- Teto de trocas com a IA. Sem ele, a conversa com o robô não termina.
  ai_turns        INT         NOT NULL DEFAULT 0,
  awaiting_input  BOOLEAN     NOT NULL DEFAULT false,
  -- RUNNING | HANDED_OFF | DONE | ABORTED
  status          VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
  started_at      TIMESTAMP   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP   NOT NULL DEFAULT now()
);


-- 4. Trilha ------------------------------------------------------------------
-- Sem isto, "o bot mandou uma coisa estranha para o cliente" é impossível de
-- investigar: o histórico mostra o texto, mas não por qual nó ele passou.

CREATE TABLE IF NOT EXISTS bot_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID        NOT NULL REFERENCES bot_sessions(id) ON DELETE CASCADE,
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  node_id         VARCHAR(80),
  -- ENTER | SEND | CAPTURE | TRANSFER | AI | ABORT
  kind            VARCHAR(30) NOT NULL,
  detail          TEXT,
  created_at      TIMESTAMP   NOT NULL DEFAULT now()
);


-- 5. Uma sessão ativa por conversa -------------------------------------------
-- Parcial de propósito: sessões encerradas podem se acumular sem conflito, mas
-- duas RUNNING na mesma conversa fariam o bot responder duas vezes a cada
-- mensagem. O Prisma não sabe declarar índice parcial — ele vive só aqui,
-- como o departments_default_inbox_key da F3.

CREATE UNIQUE INDEX IF NOT EXISTS bot_sessions_active_key
  ON bot_sessions (conversation_id)
  WHERE status = 'RUNNING';


-- 6. Um fluxo-gatilho por organização ----------------------------------------
-- Dois gatilhos significariam duas sessões abertas para a mesma conversa nova.

CREATE UNIQUE INDEX IF NOT EXISTS bot_flows_trigger_key
  ON bot_flows (organization_id)
  WHERE is_trigger;


-- 7. Consultas do executor e da tela -----------------------------------------

CREATE INDEX IF NOT EXISTS bot_flows_org_status_idx
  ON bot_flows (organization_id, status);

CREATE INDEX IF NOT EXISTS bot_events_session_idx
  ON bot_events (session_id, created_at);

CREATE INDEX IF NOT EXISTS bot_sessions_org_status_idx
  ON bot_sessions (organization_id, status);
