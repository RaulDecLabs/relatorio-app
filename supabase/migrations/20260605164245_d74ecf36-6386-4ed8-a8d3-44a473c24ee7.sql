
-- metrics_raw: payload bruto de auditoria
CREATE TABLE public.metrics_raw (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ingest_log_id UUID
);
CREATE INDEX idx_metrics_raw_client_source ON public.metrics_raw(client_id, source, received_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metrics_raw TO authenticated;
GRANT ALL ON public.metrics_raw TO service_role;
ALTER TABLE public.metrics_raw ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics_raw staff only" ON public.metrics_raw
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- metrics_daily: fato normalizado
CREATE TABLE public.metrics_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  metric_date DATE NOT NULL,
  scope TEXT NOT NULL DEFAULT 'account',
  entity_id TEXT NOT NULL DEFAULT '',
  entity_name TEXT,
  dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, source, metric_date, scope, entity_id)
);
CREATE INDEX idx_metrics_daily_client_date ON public.metrics_daily(client_id, source, metric_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metrics_daily TO authenticated;
GRANT ALL ON public.metrics_daily TO service_role;
ALTER TABLE public.metrics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics_daily access" ON public.metrics_daily
  FOR SELECT TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));
CREATE POLICY "metrics_daily staff write" ON public.metrics_daily
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_metrics_daily_updated BEFORE UPDATE ON public.metrics_daily
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ingest_logs: histórico de execução
CREATE TABLE public.ingest_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  rows_received INTEGER NOT NULL DEFAULT 0,
  rows_upserted INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  request_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX idx_ingest_logs_client ON public.ingest_logs(client_id, started_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingest_logs TO authenticated;
GRANT ALL ON public.ingest_logs TO service_role;
ALTER TABLE public.ingest_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ingest_logs access" ON public.ingest_logs
  FOR SELECT TO authenticated
  USING (client_id IS NULL OR public.user_has_client_access(auth.uid(), client_id));
CREATE POLICY "ingest_logs staff write" ON public.ingest_logs
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
