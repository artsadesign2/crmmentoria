-- F6 (complemento) — Avisar o atendente pelo WhatsApp
--
-- O aviso de lead parado nascia por e-mail. E-mail é onde o atendente não
-- está: ele passa o dia no WhatsApp da empresa, e é lá que o aviso precisa
-- chegar para virar ação no mesmo minuto.
--
-- O envio sai pelo mesmo número central, para o número pessoal de quem estava
-- com a conversa (`users.phone`, que já existia). O e-mail continua como
-- reserva — quando o atendente não tem telefone cadastrado, ou quando a
-- Evolution recusa o envio. Um aviso, duas rotas, nunca silêncio.
--
-- Toda instrução é idempotente. Nenhum DROP, nenhuma coluna removida.

-- 1. O interruptor -----------------------------------------------------------

ALTER TABLE bot_settings
  ADD COLUMN IF NOT EXISTS notify_by_whatsapp BOOLEAN NOT NULL DEFAULT true;


-- 2. Achar o número interno --------------------------------------------------
-- O webhook passa a consultar, a cada mensagem, se o número é de um atendente.
-- Sem índice isso é uma varredura da tabela de usuários por mensagem recebida.
--
-- Por que a consulta existe: a Evolution devolve `messages.upsert` também para
-- o que a própria instância envia, e nesse evento o `remoteJid` é o
-- DESTINATÁRIO. Sem o filtro, o primeiro aviso mandado a um atendente criaria
-- um contato com o nome dele, uma conversa entrando na distribuição, e o robô
-- oferecendo o menu de triagem para a própria equipe.

CREATE INDEX IF NOT EXISTS users_org_phone_idx
  ON users (organization_id, phone)
  WHERE phone IS NOT NULL;
