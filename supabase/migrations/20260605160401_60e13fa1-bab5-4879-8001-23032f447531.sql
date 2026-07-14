
-- Roadmap status enum
DO $$ BEGIN
  CREATE TYPE public.roadmap_status AS ENUM ('todo','doing','done');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE public.roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase text NOT NULL,
  phase_order int NOT NULL DEFAULT 0,
  title text NOT NULL,
  description text,
  status public.roadmap_status NOT NULL DEFAULT 'todo',
  item_order int NOT NULL DEFAULT 0,
  notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmap_items TO authenticated;
GRANT ALL ON public.roadmap_items TO service_role;

ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage roadmap" ON public.roadmap_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER roadmap_items_updated_at
  BEFORE UPDATE ON public.roadmap_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto set completed_at when status flips to done
CREATE OR REPLACE FUNCTION public.roadmap_set_completed_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS DISTINCT FROM 'done') THEN
    NEW.completed_at = now();
  ELSIF NEW.status <> 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER roadmap_items_completed
  BEFORE UPDATE ON public.roadmap_items
  FOR EACH ROW EXECUTE FUNCTION public.roadmap_set_completed_at();

-- Seed roadmap
INSERT INTO public.roadmap_items (phase, phase_order, title, description, item_order) VALUES
('Fase 0 — Fundação', 0, 'Esconder cadastro público no /auth', 'Apenas login; usuários criados pelo admin', 1),
('Fase 0 — Fundação', 0, 'Página /users (CRUD usuários + papéis)', 'Admin cria usuários e atribui papéis admin/agency/client', 2),
('Fase 0 — Fundação', 0, 'Página /settings (perfil)', 'Editar nome, email, preferências básicas', 3),
('Fase 0 — Fundação', 0, 'Stubs: /reports /ai-insights /integrations /templates /automations /costs', 'Páginas placeholder para navegação completa', 4),
('Fase 0 — Fundação', 0, 'Página /roadmap (Kanban + checklist)', 'Painel interno admin-only com progresso do projeto', 5),
('Fase 0 — Fundação', 0, 'Cadastrar Decsigner como cliente piloto', 'Primeiro cliente para validar o MVP', 6),

('Fase 1 — Data Warehouse + Ingest', 1, 'Tabelas data_sources, metrics_daily, metrics_raw, ingest_logs', 'Estrutura do DW', 1),
('Fase 1 — Data Warehouse + Ingest', 1, 'Endpoint público /api/public/ingest (HMAC + Zod)', 'Recebe dados normalizados do n8n', 2),
('Fase 1 — Data Warehouse + Ingest', 1, 'Geração de integration_id/secret por cliente+fonte', 'Token único e seguro por integração', 3),
('Fase 1 — Data Warehouse + Ingest', 1, 'Página /clients/$id/integrations', 'Status + botão Sincronizar agora', 4),

('Fase 2 — Google Sheets (1ª fonte)', 2, 'Workflow n8n: Sheets → /api/public/ingest', 'Lê planilha de leads do cliente', 1),
('Fase 2 — Google Sheets (1ª fonte)', 2, 'Tab Leads no dashboard do cliente', 'Tabela + filtros + status do lead', 2),
('Fase 2 — Google Sheets (1ª fonte)', 2, 'Doc markdown: como replicar o workflow', 'Passo-a-passo para novos clientes', 3),

('Fase 3 — Google Ads (2ª fonte)', 3, 'Workflow n8n Google Ads → ingest', 'Campanhas, gasto, cliques, conversões', 1),
('Fase 3 — Google Ads (2ª fonte)', 3, 'Dashboard Decsigner: KPIs + gráfico + tabela', 'Gasto, CPL, ROAS, evolução diária', 2),

('Fase 4 — IA Insights', 4, 'Server fn generateInsight via Lovable AI Gateway', 'Geração on-demand de análise', 1),
('Fase 4 — IA Insights', 4, 'Botão Gerar análise + histórico', 'Salva em ai_insights', 2),

('Fase 5 — Relatórios', 5, 'Export PDF do dashboard', 'Template com logo + KPIs + gráficos', 1),
('Fase 5 — Relatórios', 5, 'Template básico de relatório', 'Layout padrão InsightOS', 2),

('V2 — Pós-MVP', 6, 'Fontes: GA4, Meta Ads, Search Console, RD Station, Email Mkt', 'Expansão de integrações', 1),
('V2 — Pós-MVP', 6, 'White label completo (domínio + marca)', 'Multiagência', 2),
('V2 — Pós-MVP', 6, 'Comentários + aprovação + forecast IA', 'Workflow colaborativo', 3);

-- Cadastrar Decsigner como cliente (somente se não existir)
INSERT INTO public.clients (company_name, website, segment, contact_name, contact_email, status, plan, notes)
SELECT 'Decsigner', 'https://decsigner.com.br', 'Design / Branding', 'Daniel', 'daniel@decsigner.com.br', 'active', 'pro', 'Cliente piloto do MVP InsightOS'
WHERE NOT EXISTS (SELECT 1 FROM public.clients WHERE lower(company_name) = 'decsigner');
