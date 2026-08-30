-- F6 — humanização do robô
--
-- Duas colunas em bot_settings. Nenhuma tabela nova, nenhum dado tocado:
-- organizações que já existem herdam o padrão, e o padrão é o robô humanizado.
--
-- `persona_name` vazio é o estado normal, não um campo por preencher: sem nome,
-- o robô simplesmente não se apresenta — que é o que a maioria das empresas
-- quer. Preencher faz o robô assinar as mensagens com aquele primeiro nome.
--
-- `humanized` desligado devolve o comportamento anterior à humanização:
-- resposta instantânea, mensagem única, menu numerado. Existe para dar
-- reversão sem deploy quando algo der errado com um cliente real.

ALTER TABLE bot_settings
  ADD COLUMN IF NOT EXISTS persona_name VARCHAR(60) NOT NULL DEFAULT '';

ALTER TABLE bot_settings
  ADD COLUMN IF NOT EXISTS humanized BOOLEAN NOT NULL DEFAULT true;
