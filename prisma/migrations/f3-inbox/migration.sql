-- F3 — Inbox multiatendente
--
-- Setor de entrada das conversas e índices de atendimento.
--
-- Toda instrução é idempotente: rodar duas vezes não quebra e não duplica.
-- Nenhum DROP TABLE, nenhuma coluna removida. Os dados existentes
-- (1 usuário, 4 setores, 4 contatos, 4 oportunidades, 6 etapas) permanecem.

-- 1. Setor de entrada -------------------------------------------------------
-- Com um número central de WhatsApp e sem bot, não há como perguntar ao
-- cliente com quem ele quer falar. Toda conversa nova entra por um setor
-- padrão, e o atendente transfere quando for o caso.

ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS is_default_inbox BOOLEAN NOT NULL DEFAULT false;


-- 2. Nome de setor deixa de ser único global --------------------------------
-- Dívida registrada no schema desde a F0: `departments.name` era UNIQUE
-- global, herdado do SQL cru original. Duas organizações não podiam ter um
-- setor "Comercial" cada. Pode ter vindo como constraint ou como índice solto,
-- então as duas formas são tratadas.

DO $$
BEGIN
  ALTER TABLE departments DROP CONSTRAINT departments_name_key;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DROP INDEX IF EXISTS departments_name_key;


-- 3. Nome único por organização — o que deveria ser desde o início ----------

CREATE UNIQUE INDEX IF NOT EXISTS departments_org_name_key
  ON departments (organization_id, name);


-- 4. Um setor de entrada por organização, garantido pelo banco -------------
-- Índice parcial: a restrição só vale para as linhas marcadas como padrão.

CREATE UNIQUE INDEX IF NOT EXISTS departments_default_inbox_key
  ON departments (organization_id)
  WHERE is_default_inbox;


-- 5. Backfill do setor de entrada ------------------------------------------
-- Preferência por "Comercial": num CRM de vendas é para lá que vai quem chega
-- pelo WhatsApp. Sem ele, o menor id — a tabela não tem created_at, então id é
-- a única ordem determinística disponível.
--
-- Organizações que já têm um setor padrão não são tocadas, o que torna esta
-- instrução segura para rodar de novo.

WITH escolhido AS (
  SELECT DISTINCT ON (d.organization_id) d.id
  FROM departments d
  WHERE NOT EXISTS (
    SELECT 1 FROM departments existente
    WHERE existente.organization_id = d.organization_id
      AND existente.is_default_inbox
  )
  ORDER BY d.organization_id, (lower(d.name) = 'comercial') DESC, d.id
)
UPDATE departments
  SET is_default_inbox = true
  WHERE id IN (SELECT id FROM escolhido);


-- 6. Caixa de um atendente e contagem do balanceamento ---------------------
-- Consulta de "minhas conversas" e a contagem por atendente que a distribuição
-- por menor carga executa a cada conversa nova.

CREATE INDEX IF NOT EXISTS conversations_org_assigned_idx
  ON conversations (organization_id, assigned_user_id, status);


-- 7. Cursor do polling -----------------------------------------------------
-- O Inbox pergunta "o que mudou desde X" a cada 2 segundos por atendente.
-- Sem este índice a pergunta vira varredura da tabela inteira.

CREATE INDEX IF NOT EXISTS conversations_org_updated_idx
  ON conversations (organization_id, updated_at DESC);


-- 8. Conversa de um contato ------------------------------------------------
-- Caminho de findOrCreateConversation, executado em toda mensagem que entra.

CREATE INDEX IF NOT EXISTS conversations_org_contact_idx
  ON conversations (organization_id, contact_id);
