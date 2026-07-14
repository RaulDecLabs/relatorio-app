-- Create reports_config metadata table
CREATE TABLE IF NOT EXISTS public.reports_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  table_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default Dec config
INSERT INTO public.reports_config (name, table_name)
VALUES ('Dec', 'Dec_google_analytics_metrics')
ON CONFLICT (table_name) DO NOTHING;

-- Enable RLS and add policies for reports_config
ALTER TABLE public.reports_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated access to reports_config" ON public.reports_config;
CREATE POLICY "Allow authenticated access to reports_config" ON public.reports_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports_config TO authenticated;
GRANT ALL ON public.reports_config TO service_role;

-- Stored procedure to dynamically create a metrics table for new companies
CREATE OR REPLACE FUNCTION public.create_dynamic_table(p_table_name TEXT)
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
      page_path TEXT NOT NULL,
      session_manual_source_medium TEXT,
      session_source TEXT,
      session_medium TEXT,
      city TEXT,
      device_category TEXT,
      browser TEXT,
      sessions INTEGER NOT NULL DEFAULT 0,
      total_users INTEGER NOT NULL DEFAULT 0,
      bounce_rate DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      active_users INTEGER NOT NULL DEFAULT 0,
      page_views INTEGER NOT NULL DEFAULT 0,
      engagement_rate DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      average_session_duration DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      engaged_sessions INTEGER NOT NULL DEFAULT 0,
      events INTEGER NOT NULL DEFAULT 0,
      total_ad_revenue DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      transactions INTEGER NOT NULL DEFAULT 0,
      session_duration DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (client_id, metric_date, page_path, session_manual_source_medium, session_source, session_medium, city, device_category, browser)
    );

    -- Create index
    CREATE INDEX IF NOT EXISTS %I ON public.%I (client_id, metric_date DESC);

    -- Grants
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;
    GRANT ALL ON public.%I TO service_role;

    -- Enable RLS
    ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;

    -- RLS Policies
    DROP POLICY IF EXISTS "Allow authenticated all operations" ON public.%I;
    CREATE POLICY "Allow authenticated all operations" ON public.%I
      FOR ALL TO authenticated USING (true) WITH CHECK (true);

    -- Trigger for updated_at
    DROP TRIGGER IF EXISTS trg_dynamic_updated ON public.%I;
    CREATE TRIGGER trg_dynamic_updated BEFORE UPDATE ON public.%I
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
