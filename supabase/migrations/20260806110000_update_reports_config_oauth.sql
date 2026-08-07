-- Adiciona colunas para suportar autenticação OAuth 2.0 com a RD Station Marketing
-- na tabela global de clientes (reports_config)

ALTER TABLE reports_config
ADD COLUMN IF NOT EXISTS rd_client_id TEXT,
ADD COLUMN IF NOT EXISTS rd_client_secret TEXT,
ADD COLUMN IF NOT EXISTS rd_access_token TEXT,
ADD COLUMN IF NOT EXISTS rd_refresh_token TEXT;
