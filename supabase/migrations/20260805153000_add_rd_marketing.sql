-- 1. Adiciona colunas para configuração e tokens do RD Station Marketing
ALTER TABLE public.reports_config 
ADD COLUMN IF NOT EXISTS rd_table_name text,
ADD COLUMN IF NOT EXISTS rd_public_token text,
ADD COLUMN IF NOT EXISTS rd_private_token text;

-- 2. Procedure RPC para criar tabela dinâmica de métricas do RD Marketing para novas empresas
CREATE OR REPLACE FUNCTION public.create_dynamic_rd_table(p_table_name TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Sanitiza nome da tabela
  IF p_table_name !~ '^[a-zA-Z0-9_]+$' THEN
    RAISE EXCEPTION 'Nome de tabela inválido. Use apenas letras, números e sublinhados (_)';
  END IF;

  EXECUTE format('
    CREATE TABLE IF NOT EXISTS public.%I (
      id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      client_id UUID,
      metric_date DATE NOT NULL,
      total_leads INTEGER NOT NULL DEFAULT 0,
      leads_mql INTEGER NOT NULL DEFAULT 0,
      oportunidades INTEGER NOT NULL DEFAULT 0,
      visits INTEGER NOT NULL DEFAULT 0,
      channel_google_ads INTEGER NOT NULL DEFAULT 0,
      channel_meta_ads INTEGER NOT NULL DEFAULT 0,
      channel_organic INTEGER NOT NULL DEFAULT 0,
      channel_direct INTEGER NOT NULL DEFAULT 0,
      top_lps JSONB DEFAULT ''[]''::jsonb,
      email_open_rate DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      email_ctr DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      workflows_active INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT %I UNIQUE (metric_date)
    );

    -- Índice por data
    CREATE INDEX IF NOT EXISTS %I ON public.%I (metric_date DESC);

    -- Permissões
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated, service_role;

    -- RLS
    ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow public all rd operations" ON public.%I;
    CREATE POLICY "Allow public all rd operations" ON public.%I
      FOR ALL TO public USING (true) WITH CHECK (true);
  ',
    p_table_name,
    'uq_' || p_table_name || '_metric_date',
    'idx_' || p_table_name || '_date', p_table_name,
    p_table_name,
    p_table_name, p_table_name, p_table_name
  );
END;
$$;

-- 3. Cria a tabela dinâmica oficial de dados reais para Multiperfil
SELECT public.create_dynamic_rd_table('multiperfil_rd_marketing_metrics');

-- 4. Associa a tabela em reports_config para Multiperfil (antiga Dec)
UPDATE public.reports_config 
SET rd_table_name = 'multiperfil_rd_marketing_metrics' 
WHERE name ILIKE '%Multiperfil%' OR name ILIKE '%Dec%';
