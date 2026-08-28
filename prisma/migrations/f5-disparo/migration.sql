-- F5 — Disparo, fila e anti-bloqueio
--
-- Tira o disparo em massa do navegador e o coloca numa fila no banco.
--
-- Toda instrução é idempotente. Nenhum DROP, nenhuma coluna removida.
-- Os dados existentes (1 usuário, 4 setores, 4 contatos, 4 oportunidades,
-- 6 etapas) permanecem.

-- 1. Campanhas ---------------------------------------------------------------
-- A campanha guarda a mensagem e os contadores; quem recebe o quê está em
-- dispatch_targets, porque cada destinatário tem estado próprio e precisa
-- sobreviver a uma falha no meio da lista.

CREATE TABLE IF NOT EXISTS dispatch_campaigns (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_user_id UUID        REFERENCES users(id) ON DELETE SET NULL,
  name               VARCHAR(200) NOT NULL,
  -- Aceita {{nome}} e {{empresa}}, resolvidos por destinatário no envio.
  message_template   TEXT        NOT NULL,
  -- DRAFT | SCHEDULED | RUNNING | PAUSED | DONE | CANCELED
  status             VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  scheduled_at       TIMESTAMP,
  total_count        INT         NOT NULL DEFAULT 0,
  sent_count         INT         NOT NULL DEFAULT 0,
  failed_count       INT         NOT NULL DEFAULT 0,
  skipped_count      INT         NOT NULL DEFAULT 0,
  started_at         TIMESTAMP,
  finished_at        TIMESTAMP,
  created_at         TIMESTAMP   NOT NULL DEFAULT now(),
  updated_at         TIMESTAMP   NOT NULL DEFAULT now()
);


-- 2. Destinatários -----------------------------------------------------------
-- Um por pessoa, com estado próprio. É o que permite retomar de onde parou: o
-- laço no navegador que isto substitui perdia o resto da lista a cada falha.
--
-- message_id liga ao histórico: cada envio vira Message numa Conversation real,
-- então o disparo aparece no Inbox e a resposta do cliente tem contexto.

CREATE TABLE IF NOT EXISTS dispatch_targets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID        NOT NULL REFERENCES dispatch_campaigns(id) ON DELETE CASCADE,
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id      UUID        REFERENCES contacts(id) ON DELETE SET NULL,
  -- Copiados na criação: se o contato mudar de número depois, o registro
  -- continua contando para quem a mensagem realmente foi.
  phone           VARCHAR(30) NOT NULL,
  name            VARCHAR(200) NOT NULL,
  -- PENDING | SENDING | SENT | FAILED | SKIPPED
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  -- Por que 200 contatos viraram 187: descadastrado, sem telefone, repetido.
  skip_reason     TEXT,
  error           TEXT,
  attempts        INT         NOT NULL DEFAULT 0,
  -- SENDING com claimed_at velho volta para PENDING: é como uma função que
  -- morreu no meio devolve o trabalho.
  claimed_at      TIMESTAMP,
  sent_at         TIMESTAMP,
  message_id      UUID        REFERENCES messages(id) ON DELETE SET NULL,
  created_at      TIMESTAMP   NOT NULL DEFAULT now()
);


-- 3. Regras anti-bloqueio ----------------------------------------------------
-- Padrões conservadores. Nenhum parâmetro impede o WhatsApp de bloquear um
-- número; eles reduzem o risco.
--
-- jitter_ms é o item que o código atual não tem e mais importa: um envio a cada
-- 1500 ms exatos é mais suspeito que um a cada 4 s variando, porque o padrão
-- perfeito é justamente o que nenhum humano produz.

CREATE TABLE IF NOT EXISTS dispatch_settings (
  organization_id   UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  min_interval_ms   INT         NOT NULL DEFAULT 4000,
  jitter_ms         INT         NOT NULL DEFAULT 3000,
  max_per_minute    INT         NOT NULL DEFAULT 12,
  window_start_hour INT         NOT NULL DEFAULT 8,
  window_end_hour   INT         NOT NULL DEFAULT 20,
  daily_cap         INT         NOT NULL DEFAULT 300,
  -- Função serverless roda em UTC; "20h" precisa significar 20h em São Paulo.
  time_zone         VARCHAR(60) NOT NULL DEFAULT 'America/Sao_Paulo',
  updated_at        TIMESTAMP   NOT NULL DEFAULT now()
);


-- 4. Respostas rápidas -------------------------------------------------------
-- Respostas prontas para o atendente no Inbox: /preco, /endereco, /horario.

CREATE TABLE IF NOT EXISTS quick_replies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Sem a barra: "preco", digitado como "/preco".
  shortcut        VARCHAR(40) NOT NULL,
  title           VARCHAR(120) NOT NULL,
  content         TEXT        NOT NULL,
  created_at      TIMESTAMP   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS quick_replies_org_shortcut_key
  ON quick_replies (organization_id, shortcut);


-- 5. Descadastro -------------------------------------------------------------
-- Exigência da LGPD, e continuar mandando para quem pediu para parar é o
-- caminho mais curto para denúncia e bloqueio do número.
--
-- Só vale para disparo em massa: quem escreveu "PARE" e depois pergunta o preço
-- continua sendo atendido individualmente.

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS opted_out_at TIMESTAMP;

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS opted_out_reason TEXT;


-- 6. A consulta do worker ----------------------------------------------------
-- Reivindicar o próximo lote PENDING de uma campanha, em ordem de criação.

CREATE INDEX IF NOT EXISTS dispatch_targets_queue_idx
  ON dispatch_targets (campaign_id, status, created_at);


-- 7. Campanhas a iniciar -----------------------------------------------------

CREATE INDEX IF NOT EXISTS dispatch_campaigns_org_status_idx
  ON dispatch_campaigns (organization_id, status, scheduled_at);


-- 8. Filtrar descadastrados --------------------------------------------------
-- Parcial: quem não se descadastrou não ocupa espaço no índice, e é a maioria.

CREATE INDEX IF NOT EXISTS contacts_opted_out_idx
  ON contacts (organization_id)
  WHERE opted_out_at IS NOT NULL;
