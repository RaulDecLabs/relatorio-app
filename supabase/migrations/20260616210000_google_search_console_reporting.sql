-- Add gsc_table_name column to reports_config
ALTER TABLE public.reports_config ADD COLUMN IF NOT EXISTS gsc_table_name TEXT UNIQUE;

-- Stored procedure to dynamically create a Google Search Console metrics table for new companies
CREATE OR REPLACE FUNCTION public.create_dynamic_gsc_table(p_table_name TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Sanitize table name to allow only alphanumeric characters and underscores
  IF p_table_name !~ '^[a-zA-Z0-9_]+$' THEN
    RAISE EXCEPTION 'Nome de tabela inválido. Use apenas letras, números e sublinhados (_)';
  END IF;

  EXECUTE format('
    CREATE TABLE IF NOT EXISTS public.%I (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      client_id UUID,
      metric_date DATE NOT NULL,
      query TEXT NOT NULL DEFAULT '''',
      page TEXT NOT NULL DEFAULT '''',
      device TEXT NOT NULL DEFAULT ''desktop'',
      country TEXT NOT NULL DEFAULT ''BR'',
      clicks INTEGER NOT NULL DEFAULT 0,
      impressions INTEGER NOT NULL DEFAULT 0,
      position DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (client_id, metric_date, query, page, device, country)
    );

    -- Create index
    CREATE INDEX IF NOT EXISTS %I ON public.%I (client_id, metric_date DESC);

    -- Grants
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated;
    GRANT ALL ON public.%I TO service_role;

    -- Enable RLS
    ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;

    -- RLS Policies
    DROP POLICY IF EXISTS "Allow public all gsc operations" ON public.%I;
    CREATE POLICY "Allow public all gsc operations" ON public.%I
      FOR ALL TO public USING (true) WITH CHECK (true);

    -- Trigger for updated_at
    DROP TRIGGER IF EXISTS trg_dynamic_gsc_updated ON public.%I;
    CREATE TRIGGER trg_dynamic_gsc_updated BEFORE UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  ',
    p_table_name,
    'idx_' || p_table_name || '_client_date', p_table_name,
    p_table_name, p_table_name, p_table_name,
    p_table_name, p_table_name,
    p_table_name, p_table_name
  );
END;
$$;

-- Create dynamic tables for Dec and Alphaz
SELECT public.create_dynamic_gsc_table('Dec_google_search_console_metrics');
SELECT public.create_dynamic_gsc_table('alphaz_google_search_console_metrics');

-- Update configs with new table names
UPDATE public.reports_config SET gsc_table_name = 'Dec_google_search_console_metrics' WHERE name = 'Dec';
UPDATE public.reports_config SET gsc_table_name = 'alphaz_google_search_console_metrics' WHERE name = 'Alphaz';

-- Seed GSC mock data for Dec
DELETE FROM public."Dec_google_search_console_metrics";

INSERT INTO public."Dec_google_search_console_metrics" 
(metric_date, query, page, device, country, clicks, impressions, position)
VALUES
-- June 5, 2026
('2026-06-05', 'relatorio de trafego automatico', '/', 'desktop', 'BR', 15, 120, 2.3),
('2026-06-05', 'relatorio de trafego automatico', '/', 'mobile', 'BR', 8, 85, 3.1),
('2026-06-05', 'dashboard n8n marketing', '/reports', 'desktop', 'BR', 12, 110, 4.2),
('2026-06-05', 'agencia insightos', '/', 'desktop', 'BR', 35, 140, 1.1),
('2026-06-05', 'agencia insightos', '/', 'mobile', 'BR', 20, 95, 1.2),
('2026-06-05', 'sistema de metricas supabase', '/dashboard', 'desktop', 'US', 2, 40, 8.5),
('2026-06-05', 'como integrar ads no n8n', '/automations', 'desktop', 'PT', 4, 30, 5.0),

-- June 6, 2026
('2026-06-06', 'relatorio de trafego automatico', '/', 'desktop', 'BR', 18, 130, 2.1),
('2026-06-06', 'relatorio de trafego automatico', '/', 'mobile', 'BR', 10, 90, 2.9),
('2026-06-06', 'dashboard n8n marketing', '/reports', 'desktop', 'BR', 15, 115, 4.0),
('2026-06-06', 'agencia insightos', '/', 'desktop', 'BR', 40, 150, 1.0),
('2026-06-06', 'agencia insightos', '/', 'mobile', 'BR', 22, 100, 1.1),
('2026-06-06', 'sistema de metricas supabase', '/dashboard', 'desktop', 'US', 3, 45, 8.0),
('2026-06-06', 'como integrar ads no n8n', '/automations', 'desktop', 'PT', 5, 32, 4.8),

-- June 7, 2026
('2026-06-07', 'relatorio de trafego automatico', '/', 'desktop', 'BR', 12, 110, 2.4),
('2026-06-07', 'relatorio de trafego automatico', '/', 'mobile', 'BR', 6, 75, 3.2),
('2026-06-07', 'dashboard n8n marketing', '/reports', 'desktop', 'BR', 8, 90, 4.5),
('2026-06-07', 'agencia insightos', '/', 'desktop', 'BR', 28, 120, 1.2),
('2026-06-07', 'agencia insightos', '/', 'mobile', 'BR', 15, 80, 1.3),
('2026-06-07', 'sistema de metricas supabase', '/dashboard', 'desktop', 'US', 1, 35, 9.0),
('2026-06-07', 'como integrar ads no n8n', '/automations', 'desktop', 'PT', 3, 28, 5.2),

-- June 8, 2026
('2026-06-08', 'relatorio de trafego automatico', '/', 'desktop', 'BR', 22, 145, 2.0),
('2026-06-08', 'relatorio de trafego automatico', '/', 'mobile', 'BR', 14, 105, 2.8),
('2026-06-08', 'dashboard n8n marketing', '/reports', 'desktop', 'BR', 20, 130, 3.8),
('2026-06-08', 'agencia insightos', '/', 'desktop', 'BR', 45, 160, 1.0),
('2026-06-08', 'agencia insightos', '/', 'mobile', 'BR', 25, 110, 1.1),
('2026-06-08', 'sistema de metricas supabase', '/dashboard', 'desktop', 'US', 4, 50, 7.8),
('2026-06-08', 'como integrar ads no n8n', '/automations', 'desktop', 'PT', 6, 35, 4.5),

-- June 9, 2026
('2026-06-09', 'relatorio de trafego automatico', '/', 'desktop', 'BR', 25, 160, 1.8),
('2026-06-09', 'relatorio de trafego automatico', '/', 'mobile', 'BR', 16, 115, 2.6),
('2026-06-09', 'dashboard n8n marketing', '/reports', 'desktop', 'BR', 24, 145, 3.5),
('2026-06-09', 'agencia insightos', '/', 'desktop', 'BR', 50, 175, 1.0),
('2026-06-09', 'agencia insightos', '/', 'mobile', 'BR', 28, 120, 1.1),
('2026-06-09', 'sistema de metricas supabase', '/dashboard', 'desktop', 'US', 5, 55, 7.2),
('2026-06-09', 'como integrar ads no n8n', '/automations', 'desktop', 'PT', 8, 40, 4.1),

-- June 10, 2026
('2026-06-10', 'relatorio de trafego automatico', '/', 'desktop', 'BR', 30, 180, 1.7),
('2026-06-10', 'relatorio de trafego automatico', '/', 'mobile', 'BR', 20, 130, 2.5),
('2026-06-10', 'dashboard n8n marketing', '/reports', 'desktop', 'BR', 28, 160, 3.2),
('2026-06-10', 'agencia insightos', '/', 'desktop', 'BR', 55, 190, 1.0),
('2026-06-10', 'agencia insightos', '/', 'mobile', 'BR', 32, 135, 1.0),
('2026-06-10', 'sistema de metricas supabase', '/dashboard', 'desktop', 'US', 6, 60, 7.0),
('2026-06-10', 'como integrar ads no n8n', '/automations', 'desktop', 'PT', 9, 45, 3.9),

-- June 11, 2026
('2026-06-11', 'relatorio de trafego automatico', '/', 'desktop', 'BR', 32, 195, 1.6),
('2026-06-11', 'relatorio de trafego automatico', '/', 'mobile', 'BR', 22, 140, 2.4),
('2026-06-11', 'dashboard n8n marketing', '/reports', 'desktop', 'BR', 30, 175, 3.0),
('2026-06-11', 'agencia insightos', '/', 'desktop', 'BR', 60, 200, 1.0),
('2026-06-11', 'agencia insightos', '/', 'mobile', 'BR', 35, 145, 1.0),
('2026-06-11', 'sistema de metricas supabase', '/dashboard', 'desktop', 'US', 8, 65, 6.8),
('2026-06-11', 'como integrar ads no n8n', '/automations', 'desktop', 'PT', 10, 48, 3.8);
