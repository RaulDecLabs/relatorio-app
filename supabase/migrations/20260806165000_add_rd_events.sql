-- Tabela para armazenar os eventos de Webhook do RD Station Marketing
CREATE TABLE IF NOT EXISTS public.rd_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES public.reports_config(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- e.g., 'CONVERSION', 'OPPORTUNITY', 'SALE'
    lead_email TEXT,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar a performance nas consultas do dashboard
CREATE INDEX IF NOT EXISTS rd_events_report_id_idx ON public.rd_events(report_id);
CREATE INDEX IF NOT EXISTS rd_events_event_type_idx ON public.rd_events(event_type);
CREATE INDEX IF NOT EXISTS rd_events_created_at_idx ON public.rd_events(created_at);

-- Adicionar permissões RLS (Row Level Security)
ALTER TABLE public.rd_events ENABLE ROW LEVEL SECURITY;

-- Políticas para leitura
CREATE POLICY "Enable read access for all users" ON public.rd_events
    FOR SELECT USING (true);

-- Política para inserção (nossa API irá inserir)
CREATE POLICY "Enable insert for service role" ON public.rd_events
    FOR INSERT WITH CHECK (true);
    
-- Política para deleção (se precisar limpar dados)
CREATE POLICY "Enable delete for service role" ON public.rd_events
    FOR DELETE USING (true);
