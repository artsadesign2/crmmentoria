-- F4 — Copiloto Gemini, transcrição e qualificação
--
-- Base de conhecimento por organização, estado de transcrição por mensagem e
-- as colunas de análise no card.
--
-- Toda instrução é idempotente. Nenhum DROP, nenhuma coluna removida.
-- Os dados existentes (1 usuário, 4 setores, 4 contatos, 4 oportunidades,
-- 6 etapas) permanecem.

-- 1. Base de conhecimento ---------------------------------------------------
-- Sem ela, perguntado sobre preço o copiloto inventa um. Com ela, o copiloto
-- só afirma o que a empresa escreveu.
--
-- Uma linha por organização: a chave primária é a própria organização, o que
-- torna impossível existirem duas bases concorrentes para o mesmo tenant.

CREATE TABLE IF NOT EXISTS ai_settings (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  -- Texto livre, sem formato imposto: quem escreve conhece o negócio.
  -- Preços, formato da mentoria, condições, respostas a objeções.
  knowledge_base  TEXT    NOT NULL DEFAULT '',
  -- Como a empresa fala com o cliente.
  tone            TEXT    NOT NULL DEFAULT '',
  -- Desliga a IA inteira da organização sem mexer em código.
  enabled         BOOLEAN NOT NULL DEFAULT true,
  updated_at      TIMESTAMP NOT NULL DEFAULT now()
);


-- 2. Estado da transcrição --------------------------------------------------
-- Sem este campo, um áudio que falha seria retentado toda vez que alguém
-- abrisse a conversa — uma chamada paga por abertura, para sempre.
--
-- NULL = ainda não tentado | DONE | FAILED (vale repetir)
-- UNSUPPORTED = grande demais, formato desconhecido ou mídia inacessível;
-- repetir não adianta, e a interface diz isso em vez de oferecer o botão.

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS transcription_status VARCHAR(20);


-- 3. Temperatura do lead ----------------------------------------------------
-- Coluna própria, e não dentro de custom_fields, porque precisa ser ordenável
-- e filtrável no quadro. Campo dentro de JSON não é.

ALTER TABLE deal_cards
  ADD COLUMN IF NOT EXISTS ai_score SMALLINT;


-- 4. Resumo do atendimento --------------------------------------------------

ALTER TABLE deal_cards
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;


-- 5. Quando a análise foi feita ---------------------------------------------
-- Para a interface poder dizer "analisado há 2 dias" em vez de apresentar um
-- resumo antigo como se fosse de agora.

ALTER TABLE deal_cards
  ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMP;


-- 6. Ordenar o funil por temperatura ----------------------------------------
-- Parcial: cards nunca analisados não ocupam espaço no índice, e são a maioria
-- enquanto a qualificação for sob demanda.

CREATE INDEX IF NOT EXISTS deal_cards_ai_score_idx
  ON deal_cards (organization_id, ai_score DESC)
  WHERE ai_score IS NOT NULL;


-- 7. Coerência do estado de transcrição -------------------------------------
-- Mensagem que já tenha transcrição precisa constar como DONE, senão seria
-- transcrita de novo. Hoje são zero linhas; a instrução existe para o caso de
-- a migração rodar num banco onde a F4 já tenha operado.

UPDATE messages
  SET transcription_status = 'DONE'
  WHERE transcription IS NOT NULL
    AND transcription <> ''
    AND transcription_status IS NULL;
