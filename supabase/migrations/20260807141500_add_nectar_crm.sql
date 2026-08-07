-- 1. Adicionar token da API na tabela de configuração de relatórios
ALTER TABLE reports_config 
ADD COLUMN nectar_api_token text;

-- 2. Criar a tabela para as oportunidades (deals) do Nectar CRM
CREATE TABLE IF NOT EXISTS nectar_deals (
    id uuid primary key default gen_random_uuid(),
    report_id uuid references reports_config(id) on delete cascade not null,
    deal_id text not null,
    deal_name text,
    funnel_name text,
    stage_name text,
    value numeric(10,2) default 0.0,
    status text, -- Ex: 'Ganho', 'Perdido', 'Aberto'
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    closed_at timestamp with time zone,
    payload jsonb,
    
    -- Restrição de unicidade para evitar duplicatas do mesmo deal no mesmo relatório
    CONSTRAINT uq_nectar_deal_report UNIQUE (report_id, deal_id)
);

-- 3. Habilitar Row Level Security e Políticas
ALTER TABLE nectar_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to nectar_deals"
ON nectar_deals FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow service role to insert nectar_deals"
ON nectar_deals FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Allow service role to update nectar_deals"
ON nectar_deals FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Criar um índice para otimizar buscas por relatório e datas
CREATE INDEX idx_nectar_deals_report_id ON nectar_deals(report_id);
CREATE INDEX idx_nectar_deals_created_at ON nectar_deals(created_at);
CREATE INDEX idx_nectar_deals_closed_at ON nectar_deals(closed_at);
