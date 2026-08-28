-- F6 (complemento) — Retomada: o lead nunca fica sem atendimento
--
-- A F3 distribui a conversa nova para o atendente menos ocupado que estiver
-- online. É a regra certa, e ela abre um buraco: a partir do instante em que a
-- conversa ganha dono, ninguém mais olha para ela. Se esse dono entra de
-- férias, muda de time ou simplesmente esquece, o lead fica esperando para
-- sempre — e o sistema não registra nada de errado, porque do ponto de vista
-- dele a conversa "está sendo atendida".
--
-- Duas situações passam a devolver o cliente ao robô:
--
--   ABANDONO         o cliente falou por último e ninguém respondeu há mais de
--                    N horas. A conversa volta para a fila do setor e quem a
--                    deixou parada recebe um e-mail.
--
--   FORA_DE_HORARIO  o cliente escreveu fora do expediente. Aqui a conversa
--                    NÃO muda de dono: o atendente não fez nada errado, está
--                    fora do horário. O robô só cobre o intervalo, e sai de
--                    cena na primeira resposta humana.
--
-- Toda instrução é idempotente. Nenhum DROP, nenhuma coluna removida.

-- 1. Fluxo de retomada -------------------------------------------------------
-- Um segundo papel ao lado de `is_trigger`. Reaproveitar o fluxo-gatilho para
-- retomar seria mandar "Olá! Você chegou ao atendimento da nossa equipe" para
-- quem já está conversando há dois dias — a saudação de boas-vindas é
-- exatamente a frase errada para quem foi esquecido.
--
-- Sem fluxo de retomada publicado o sistema cai no fluxo-gatilho; sem nenhum
-- dos dois, a devolução para a fila e o e-mail acontecem do mesmo jeito. A
-- parte que garante atendimento não depende de existir bot.

ALTER TABLE bot_flows ADD COLUMN IF NOT EXISTS is_reengage BOOLEAN NOT NULL DEFAULT false;


-- 2. Um fluxo de retomada por organização ------------------------------------
-- Mesmo motivo do bot_flows_trigger_key: dois candidatos significam escolher
-- por ordem de chegada do banco, que é escolher ao acaso.

CREATE UNIQUE INDEX IF NOT EXISTS bot_flows_reengage_key
  ON bot_flows (organization_id)
  WHERE is_reengage;


-- 3. Configuração da retomada ------------------------------------------------
-- Separada de `dispatch_settings` de propósito. A janela do disparo responde
-- "quando é aceitável incomodar um desconhecido" (8h–20h, todo dia); a janela
-- do expediente responde "quando existe gente trabalhando" (9h–18h, dias
-- úteis). São perguntas diferentes e mudam por motivos diferentes — juntá-las
-- faria alguém encurtar o disparo ao ajustar o expediente.

CREATE TABLE IF NOT EXISTS bot_settings (
  organization_id      UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  -- Desligar para na porta de entrada: nada é devolvido, nada é notificado.
  reengage_enabled     BOOLEAN     NOT NULL DEFAULT true,
  -- Silêncio humano que caracteriza abandono.
  reengage_after_hours INT         NOT NULL DEFAULT 24,
  -- Dias de expediente, 0 = domingo. Padrão: segunda a sexta.
  office_days          VARCHAR(20) NOT NULL DEFAULT '1,2,3,4,5',
  office_start_hour    INT         NOT NULL DEFAULT 9,
  office_end_hour      INT         NOT NULL DEFAULT 18,
  -- Função serverless roda em UTC; "18h" precisa significar 18h em São Paulo.
  time_zone            VARCHAR(60) NOT NULL DEFAULT 'America/Sao_Paulo',
  -- E-mail para quem deixou o lead parado. Sem RESEND_API_KEY vira log.
  notify_by_email      BOOLEAN     NOT NULL DEFAULT true,
  updated_at           TIMESTAMP   NOT NULL DEFAULT now()
);


-- 4. A varredura -------------------------------------------------------------
-- O gatilho normal é o cliente escrever de novo. Mas o lead que escreveu uma
-- vez, foi ignorado e desistiu de insistir é justamente o que mais importa
-- recuperar — e esse nunca produz um webhook. Quem o encontra é o cron, e esta
-- é a consulta dele: conversas abertas, com dono, paradas.

CREATE INDEX IF NOT EXISTS conversations_abandono_idx
  ON conversations (organization_id, status, last_message_at)
  WHERE assigned_user_id IS NOT NULL;


-- 5. Sessões recentes por conversa -------------------------------------------
-- Trava anti-insistência: uma retomada por conversa por período. Sem ela, o
-- cron de hora em hora reabriria o mesmo lead a cada passagem, e o cliente
-- esquecido viraria o cliente perseguido.

CREATE INDEX IF NOT EXISTS bot_sessions_conversation_started_idx
  ON bot_sessions (conversation_id, started_at DESC);
