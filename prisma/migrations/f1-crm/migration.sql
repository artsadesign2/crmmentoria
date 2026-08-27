-- ---------------------------------------------------------------------------
-- F1 — Fundação de dados do CRM
--
-- Nove tabelas novas. Nenhuma tabela existente é alterada, então não há risco
-- para os 33 membros, 5 cursos, 10 aulas e 4 artigos já cadastrados.
--
-- Toda instrução é idempotente: rodar duas vezes não causa erro.
--
-- Convenções herdadas da F0:
--   - snake_case no banco, camelCase no Prisma via @map
--   - enums como VARCHAR, para não quebrar a camada de SQL cru
--   - dinheiro como NUMERIC, nunca ponto flutuante
-- ---------------------------------------------------------------------------

-- 1. Funis --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pipelines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  is_default      BOOLEAN      NOT NULL DEFAULT false,
  position        INT          NOT NULL DEFAULT 0,
  created_at      TIMESTAMP    NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pipelines_org_idx ON pipelines (organization_id, position);

-- 2. Etapas do funil ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS stages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID         NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  name        VARCHAR(150) NOT NULL,
  -- Barra colorida no topo da coluna do Kanban.
  color_hex   VARCHAR(20)  NOT NULL DEFAULT '#2563EB',
  position    INT          NOT NULL DEFAULT 0,
  -- Marca etapas terminais, para não contarem no total de oportunidades abertas.
  is_won      BOOLEAN      NOT NULL DEFAULT false,
  is_lost     BOOLEAN      NOT NULL DEFAULT false,
  created_at  TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stages_pipeline_idx ON stages (pipeline_id, position);

-- 3. Contatos -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  -- Normalizado para E.164 sem "+" (ex.: 5511987654321) por lib/crm/phone.ts.
  phone           VARCHAR(30),
  email           VARCHAR(150),
  document_cpf    VARCHAR(20),
  avatar_url      TEXT,
  company         VARCHAR(200),
  -- LEAD | CUSTOMER | PARTNER
  type            VARCHAR(20)  NOT NULL DEFAULT 'LEAD',
  -- Origem do contato: Instagram, Indicação, Tráfego Pago, WhatsApp Direct...
  source          VARCHAR(50),
  notes           TEXT,
  -- Campos livres da pessoa; o Nó de Captura do bot (F6) grava aqui.
  custom_fields   JSONB,
  created_at      TIMESTAMP    NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP    NOT NULL DEFAULT now()
);

-- Telefone único por organização, não globalmente: o mesmo número pode ser
-- lead de dois tenants distintos. Índice parcial porque phone é opcional.
CREATE UNIQUE INDEX IF NOT EXISTS contacts_org_phone_key
  ON contacts (organization_id, phone)
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS contacts_org_name_idx ON contacts (organization_id, name);
CREATE INDEX IF NOT EXISTS contacts_org_email_idx ON contacts (organization_id, email);

-- 4. Oportunidades (os cards do Kanban) ---------------------------------------
CREATE TABLE IF NOT EXISTS deal_cards (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id        UUID          NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  stage_id          UUID          NOT NULL REFERENCES stages(id),
  assigned_user_id  UUID          REFERENCES users(id) ON DELETE SET NULL,
  department_id     UUID          REFERENCES departments(id) ON DELETE SET NULL,
  -- WHATSAPP | INSTAGRAM | VOIP | WEBCHAT | WEBHOOK
  channel           VARCHAR(20)   NOT NULL DEFAULT 'WHATSAPP',
  title             VARCHAR(250)  NOT NULL,
  -- NUMERIC, nunca ponto flutuante: 0.1 + 0.2 !== 0.3 em float.
  deal_value        NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- LOW | MEDIUM | HIGH | URGENT
  priority          VARCHAR(20)   NOT NULL DEFAULT 'MEDIUM',
  position          INT           NOT NULL DEFAULT 0,
  last_message_text TEXT,
  last_message_at   TIMESTAMP,
  reminder_at       TIMESTAMP,
  sla_due_at        TIMESTAMP,
  total_tasks       INT           NOT NULL DEFAULT 0,
  completed_tasks   INT           NOT NULL DEFAULT 0,
  -- Visível apenas ao responsável e a quem tem rank de Administrador para cima.
  is_private        BOOLEAN       NOT NULL DEFAULT false,
  lost_reason       TEXT,
  -- Campos de qualificação do negócio (faturamento, gargalo, meta...).
  custom_fields     JSONB,
  created_at        TIMESTAMP     NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP     NOT NULL DEFAULT now()
);

-- Consulta principal do Kanban: cards de uma etapa, na ordem da coluna.
CREATE INDEX IF NOT EXISTS deal_cards_stage_idx ON deal_cards (stage_id, position);
CREATE INDEX IF NOT EXISTS deal_cards_org_idx ON deal_cards (organization_id, stage_id);
-- Filtro de visibilidade por atendente.
CREATE INDEX IF NOT EXISTS deal_cards_assigned_idx ON deal_cards (organization_id, assigned_user_id);
CREATE INDEX IF NOT EXISTS deal_cards_contact_idx ON deal_cards (contact_id);

-- 5. Tags ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  color_hex       VARCHAR(20)  NOT NULL DEFAULT '#64748B',
  created_at      TIMESTAMP    NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS contact_tags (
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

CREATE INDEX IF NOT EXISTS contact_tags_tag_idx ON contact_tags (tag_id);

-- 6. Histórico de atividades --------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id      UUID         NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  deal_card_id    UUID         REFERENCES deal_cards(id) ON DELETE SET NULL,
  user_id         UUID         REFERENCES users(id) ON DELETE SET NULL,
  -- WHATSAPP | INSTAGRAM | VOIP | WEBCHAT | WEBHOOK | NOTE | SYSTEM
  channel         VARCHAR(20)  NOT NULL DEFAULT 'WHATSAPP',
  title           VARCHAR(250) NOT NULL,
  -- Resumo estruturado gerado pela IA no encerramento do atendimento (F4).
  ai_summary      TEXT,
  raw_history     JSONB,
  created_at      TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_logs_contact_idx
  ON activity_logs (contact_id, created_at DESC);

-- 7. Conversas ----------------------------------------------------------------
-- Ausentes do PRD original; sem elas a F3 não teria onde gravar o histórico.
CREATE TABLE IF NOT EXISTS conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id       UUID        NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  deal_card_id     UUID        REFERENCES deal_cards(id) ON DELETE SET NULL,
  assigned_user_id UUID        REFERENCES users(id) ON DELETE SET NULL,
  department_id    UUID        REFERENCES departments(id) ON DELETE SET NULL,
  channel          VARCHAR(20) NOT NULL DEFAULT 'WHATSAPP',
  -- OPEN | PENDING | CLOSED
  status           VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  -- Identificador da thread no gateway (ex.: JID do WhatsApp).
  external_id      VARCHAR(150),
  unread_count     INT         NOT NULL DEFAULT 0,
  last_message_at  TIMESTAMP,
  closed_at        TIMESTAMP,
  created_at       TIMESTAMP   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS conversations_org_external_key
  ON conversations (organization_id, channel, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS conversations_org_status_idx
  ON conversations (organization_id, status, last_message_at DESC);

-- 8. Mensagens ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  -- Autor humano do lado da empresa; nulo quando veio do cliente ou do bot.
  user_id         UUID        REFERENCES users(id) ON DELETE SET NULL,
  -- INBOUND | OUTBOUND
  direction       VARCHAR(10) NOT NULL,
  -- TEXT | IMAGE | AUDIO | VIDEO | DOCUMENT | LOCATION | STICKER
  content_type    VARCHAR(20) NOT NULL DEFAULT 'TEXT',
  content         TEXT,
  media_url       TEXT,
  -- Transcrição de áudio gerada na F4; separada de `content` para preservar
  -- a distinção entre o que foi dito e o que a IA entendeu.
  transcription   TEXT,
  -- PENDING | SCHEDULED | SENT | DELIVERED | READ | FAILED
  status          VARCHAR(20) NOT NULL DEFAULT 'SENT',
  external_id     VARCHAR(150),
  is_from_bot     BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMP   NOT NULL DEFAULT now()
);

-- Consulta principal do Inbox: mensagens de uma conversa, em ordem cronológica.
CREATE INDEX IF NOT EXISTS messages_conversation_idx
  ON messages (conversation_id, created_at);

-- Evita gravar a mesma mensagem duas vezes quando o gateway reenvia o webhook.
CREATE UNIQUE INDEX IF NOT EXISTS messages_org_external_key
  ON messages (organization_id, external_id)
  WHERE external_id IS NOT NULL;
