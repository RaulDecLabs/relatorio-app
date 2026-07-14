-- Create Google Analytics Metrics table
CREATE TABLE public.google_analytics_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  page_path TEXT NOT NULL,
  session_source TEXT NOT NULL,
  sessions INTEGER NOT NULL DEFAULT 0,
  total_users INTEGER NOT NULL DEFAULT 0,
  new_users INTEGER NOT NULL DEFAULT 0,
  bounce_rate DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  page_views INTEGER NOT NULL DEFAULT 0,
  average_session_duration DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  conversions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, metric_date, page_path, session_source)
);

-- Index for quick lookups by client and date
CREATE INDEX idx_ga_metrics_client_date ON public.google_analytics_metrics(client_id, metric_date DESC);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_analytics_metrics TO authenticated;
GRANT ALL ON public.google_analytics_metrics TO service_role;

-- Enable Row Level Security
ALTER TABLE public.google_analytics_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "google_analytics_metrics select access" ON public.google_analytics_metrics
  FOR SELECT TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "google_analytics_metrics staff write" ON public.google_analytics_metrics
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- Trigger to automatically set updated_at
CREATE TRIGGER trg_google_analytics_metrics_updated BEFORE UPDATE ON public.google_analytics_metrics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
