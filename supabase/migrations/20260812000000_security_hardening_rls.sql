-- Hardening de seguranca: RLS estava com policies "USING (true)" liberadas para
-- authenticated (e em varias tabelas ate para anon/public), permitindo acesso
-- cruzado entre clientes e, no caso de user_roles, auto-promocao a admin por
-- qualquer visitante nao autenticado. Esta migration reescreve as policies para
-- escopar por dono (staff ve tudo, cliente ve so o proprio relatorio via
-- assigned_report_id no user_metadata do JWT).

-- Helper: le o assigned_report_id gravado no user_metadata do usuario autenticado
CREATE OR REPLACE FUNCTION public.assigned_report_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(auth.jwt() -> 'user_metadata' ->> 'assigned_report_id', '')::uuid
$$;

-- Helper: is_staff nunca existiu neste banco (a migration original que a criava
-- nunca rodou em producao) mas a tabela user_roles existe e ja e usada pelo
-- app (src/hooks/use-role.ts). Recriando aqui de forma autocontida.
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','agency'))
$$;

-- ============ 1. user_roles (critico: permitia auto-promocao a admin) ============
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.user_roles;
DROP POLICY IF EXISTS "Allow users to view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles read own" ON public.user_roles;
REVOKE ALL ON public.user_roles FROM anon;
REVOKE ALL ON public.user_roles FROM authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
CREATE POLICY "user_roles read own or staff" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
-- Sem policy de INSERT/UPDATE/DELETE para authenticated/anon: papeis so sao
-- concedidos via server function com service_role (src/lib/users.functions.ts).

-- ============ 2. executive_summaries (RLS estava desligada, anon com CRUD total) ============
ALTER TABLE public.executive_summaries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.executive_summaries FROM anon;
DROP POLICY IF EXISTS "Scoped by report ownership" ON public.executive_summaries;
CREATE POLICY "Scoped by report ownership" ON public.executive_summaries FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()) OR report_id = public.assigned_report_id())
  WITH CHECK (public.is_staff(auth.uid()) OR report_id = public.assigned_report_id());
GRANT ALL ON public.executive_summaries TO service_role;

-- ============ 3. reports_config ============
DROP POLICY IF EXISTS "Allow authenticated access to reports_config" ON public.reports_config;
CREATE POLICY "Staff full access to reports_config" ON public.reports_config FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Client reads own report config" ON public.reports_config FOR SELECT TO authenticated
  USING (id = public.assigned_report_id());

-- ============ 4. reports_sheets_config ============
DROP POLICY IF EXISTS "Allow authenticated access to reports_sheets_config" ON public.reports_sheets_config;
CREATE POLICY "Staff full access to reports_sheets_config" ON public.reports_sheets_config FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Client reads own sheets config" ON public.reports_sheets_config FOR SELECT TO authenticated
  USING (report_id = public.assigned_report_id());

-- ============ 5. nectar_deals (estava com SELECT publico pra anon) ============
DROP POLICY IF EXISTS "Allow public read access to nectar_deals" ON public.nectar_deals;
REVOKE ALL ON public.nectar_deals FROM anon;
CREATE POLICY "Scoped read of nectar_deals" ON public.nectar_deals FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR report_id = public.assigned_report_id());
-- INSERT/UPDATE por service_role permanecem como estavam (import via script).

-- ============ 6. rd_events (PII de lead: e-mail. estava com SELECT/INSERT/DELETE publicos) ============
DROP POLICY IF EXISTS "Enable read access for all users" ON public.rd_events;
DROP POLICY IF EXISTS "Enable insert for service role" ON public.rd_events;
DROP POLICY IF EXISTS "Enable delete for service role" ON public.rd_events;
REVOKE ALL ON public.rd_events FROM anon;
REVOKE ALL ON public.rd_events FROM authenticated;
GRANT SELECT ON public.rd_events TO authenticated;
GRANT ALL ON public.rd_events TO service_role;
CREATE POLICY "Scoped read of rd_events" ON public.rd_events FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR report_id = public.assigned_report_id());
-- Sem policy de INSERT/DELETE para authenticated/anon: so o service_role (usado
-- pelo webhook do RD Station no servidor) escreve nessa tabela.

-- ============ 7. ai_insights (tinha SELECT publico irrestrito) ============
-- Usa report_id (nao client_id) igual reports_config/nectar_deals/rd_events.
DROP POLICY IF EXISTS "Allow read access for all to ai_insights" ON public.ai_insights;
DROP POLICY IF EXISTS "Allow all access to ai_insights for authenticated users" ON public.ai_insights;
REVOKE ALL ON public.ai_insights FROM anon;
CREATE POLICY "Scoped access to ai_insights" ON public.ai_insights FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()) OR report_id = public.assigned_report_id())
  WITH CHECK (public.is_staff(auth.uid()));

-- ============ 8. Tabelas dinamicas por relatorio (GA4, Google Ads, Meta Ads, GSC, RD Marketing) ============
-- Essas tabelas sao criadas uma por relatorio (ex: Dec_google_analytics_metrics,
-- multiperfil_rd_marketing_metrics). A coluna "client_id" nelas na verdade guarda
-- o reports_config.id. Ao vivo estavam com policies "TO public USING (true)" em
-- boa parte, ou seja, liberadas ate pra quem nao esta logado.
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND (
        table_name ILIKE '%google_analytics_metrics'
        OR table_name ILIKE '%google_ads_metrics'
        OR table_name ILIKE '%facebook_ads_metrics'
        OR table_name ILIKE '%google_search_console_metrics'
        OR table_name ILIKE '%rd_marketing_metrics'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow public all operations', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow public all ads operations', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow public all gsc operations', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow public all rd operations', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Allow authenticated all operations', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Enable read access for authenticated users', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Scoped by report ownership', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_staff(auth.uid()) OR client_id = public.assigned_report_id()) WITH CHECK (public.is_staff(auth.uid()) OR client_id = public.assigned_report_id())',
      'Scoped by report ownership', t
    );
  END LOOP;
END $$;

-- ============ 9. Fabricas de tabela dinamica: aplicar a mesma policy para relatorios criados dai pra frente ============
CREATE OR REPLACE FUNCTION public.create_dynamic_table(p_table_name TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_table_name !~ '^[a-zA-Z0-9_]+$' THEN
    RAISE EXCEPTION 'Nome de tabela invalido. Use apenas letras, numeros e sublinhados (_)';
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

    CREATE INDEX IF NOT EXISTS %I ON public.%I (client_id, metric_date DESC);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;
    GRANT ALL ON public.%I TO service_role;
    REVOKE ALL ON public.%I FROM anon;

    ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow authenticated all operations" ON public.%I;
    DROP POLICY IF EXISTS "Scoped by report ownership" ON public.%I;
    CREATE POLICY "Scoped by report ownership" ON public.%I
      FOR ALL TO authenticated
      USING (public.is_staff(auth.uid()) OR client_id = public.assigned_report_id())
      WITH CHECK (public.is_staff(auth.uid()) OR client_id = public.assigned_report_id());

    DROP TRIGGER IF EXISTS trg_dynamic_updated ON public.%I;
    CREATE TRIGGER trg_dynamic_updated BEFORE UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  ',
    p_table_name,
    'idx_' || p_table_name || '_client_date', p_table_name,
    p_table_name, p_table_name, p_table_name,
    p_table_name,
    p_table_name, p_table_name, p_table_name,
    p_table_name, p_table_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_dynamic_ads_table(p_table_name TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_table_name !~ '^[a-zA-Z0-9_]+$' THEN
    RAISE EXCEPTION 'Nome de tabela invalido. Use apenas letras, numeros e sublinhados (_)';
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

    CREATE INDEX IF NOT EXISTS %I ON public.%I (client_id, metric_date DESC);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;
    GRANT ALL ON public.%I TO service_role;
    REVOKE ALL ON public.%I FROM anon;

    ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow authenticated all ads operations" ON public.%I;
    DROP POLICY IF EXISTS "Scoped by report ownership" ON public.%I;
    CREATE POLICY "Scoped by report ownership" ON public.%I
      FOR ALL TO authenticated
      USING (public.is_staff(auth.uid()) OR client_id = public.assigned_report_id())
      WITH CHECK (public.is_staff(auth.uid()) OR client_id = public.assigned_report_id());

    DROP TRIGGER IF EXISTS trg_dynamic_ads_updated ON public.%I;
    CREATE TRIGGER trg_dynamic_ads_updated BEFORE UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  ',
    p_table_name,
    'idx_' || p_table_name || '_client_date', p_table_name,
    p_table_name, p_table_name, p_table_name,
    p_table_name,
    p_table_name, p_table_name, p_table_name,
    p_table_name, p_table_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_dynamic_gsc_table(p_table_name TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_table_name !~ '^[a-zA-Z0-9_]+$' THEN
    RAISE EXCEPTION 'Nome de tabela invalido. Use apenas letras, numeros e sublinhados (_)';
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

    CREATE INDEX IF NOT EXISTS %I ON public.%I (client_id, metric_date DESC);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;
    GRANT ALL ON public.%I TO service_role;
    REVOKE ALL ON public.%I FROM anon;

    ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow public all gsc operations" ON public.%I;
    DROP POLICY IF EXISTS "Scoped by report ownership" ON public.%I;
    CREATE POLICY "Scoped by report ownership" ON public.%I
      FOR ALL TO authenticated
      USING (public.is_staff(auth.uid()) OR client_id = public.assigned_report_id())
      WITH CHECK (public.is_staff(auth.uid()) OR client_id = public.assigned_report_id());

    DROP TRIGGER IF EXISTS trg_dynamic_gsc_updated ON public.%I;
    CREATE TRIGGER trg_dynamic_gsc_updated BEFORE UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  ',
    p_table_name,
    'idx_' || p_table_name || '_client_date', p_table_name,
    p_table_name, p_table_name, p_table_name,
    p_table_name,
    p_table_name, p_table_name, p_table_name,
    p_table_name, p_table_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_dynamic_rd_table(p_table_name TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_table_name !~ '^[a-zA-Z0-9_]+$' THEN
    RAISE EXCEPTION 'Nome de tabela invalido. Use apenas letras, numeros e sublinhados (_)';
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

    CREATE INDEX IF NOT EXISTS %I ON public.%I (metric_date DESC);

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;
    GRANT ALL ON public.%I TO service_role;
    REVOKE ALL ON public.%I FROM anon;

    ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow public all rd operations" ON public.%I;
    DROP POLICY IF EXISTS "Scoped by report ownership" ON public.%I;
    CREATE POLICY "Scoped by report ownership" ON public.%I
      FOR ALL TO authenticated
      USING (public.is_staff(auth.uid()) OR client_id = public.assigned_report_id())
      WITH CHECK (public.is_staff(auth.uid()) OR client_id = public.assigned_report_id());
  ',
    p_table_name,
    'uq_' || p_table_name || '_metric_date',
    'idx_' || p_table_name || '_date', p_table_name,
    p_table_name, p_table_name, p_table_name,
    p_table_name, p_table_name, p_table_name, p_table_name
  );
END;
$$;
