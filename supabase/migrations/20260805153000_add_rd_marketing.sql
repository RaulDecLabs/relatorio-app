-- Adiciona colunas para configuração dos tokens do RD Station Marketing
ALTER TABLE reports_config 
ADD COLUMN IF NOT EXISTS rd_table_name text,
ADD COLUMN IF NOT EXISTS rd_public_token text,
ADD COLUMN IF NOT EXISTS rd_private_token text;
