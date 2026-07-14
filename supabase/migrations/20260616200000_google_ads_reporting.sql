-- Add ads_table_name column to reports_config
ALTER TABLE public.reports_config ADD COLUMN IF NOT EXISTS ads_table_name TEXT UNIQUE;

-- Update the default config for 'Dec'
UPDATE public.reports_config
SET ads_table_name = 'Dec_google_ads_metrics'
WHERE name = 'Dec';

-- Stored procedure to dynamically create a Google Ads metrics table for new companies
CREATE OR REPLACE FUNCTION public.create_dynamic_ads_table(p_table_name TEXT)
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
      campaign_id TEXT,
      campaign_name TEXT NOT NULL,
      impressions INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      cost DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      conversions DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      conversions_value DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (client_id, metric_date, campaign_id, campaign_name)
    );

    -- Create index
    CREATE INDEX IF NOT EXISTS %I ON public.%I (client_id, metric_date DESC);

    -- Grants
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;
    GRANT ALL ON public.%I TO service_role;

    -- Enable RLS
    ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;

    -- RLS Policies
    DROP POLICY IF EXISTS "Allow authenticated all ads operations" ON public.%I;
    CREATE POLICY "Allow authenticated all ads operations" ON public.%I
      FOR ALL TO authenticated USING (true) WITH CHECK (true);

    -- Trigger for updated_at
    DROP TRIGGER IF EXISTS trg_dynamic_ads_updated ON public.%I;
    CREATE TRIGGER trg_dynamic_ads_updated BEFORE UPDATE ON public.%I
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

-- Create the Google Ads table for 'Dec' automatically
SELECT public.create_dynamic_ads_table('Dec_google_ads_metrics');
