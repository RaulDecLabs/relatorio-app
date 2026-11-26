-- CRM DecLabs (CRM próprio da agência) no relatório.
--
-- O importador Python (importer/importador.py) copia do CRM, 1x por dia, os leads e os pedidos do
-- Mercado Livre do workspace ligado ao relatório. Só números e categorias: nome, telefone, e-mail e
-- CPF dos clientes ficam no CRM. Pode rodar de novo.

-- 1. Qual workspace do CRM alimenta cada relatório (sufixo do CRM: 'alphaz', 'sneakers'...).
--    Vazio = relatório sem CRM DecLabs (continua usando o Nectar, se tiver).
ALTER TABLE public.reports_config ADD COLUMN IF NOT EXISTS crm_workspace_suffix text;

-- 2. Leads do funil (foto do estado atual de cada lead).
CREATE TABLE IF NOT EXISTS public.crm_declabs_leads (
  report_id      uuid NOT NULL REFERENCES public.reports_config(id) ON DELETE CASCADE,
  lead_id        text NOT NULL,
  data_criacao   timestamptz,
  origem         text,
  estagio_funil  text,
  status         text,           -- lead | em_negociacao | cliente | perdido
  valor_estimado numeric(12,2) NOT NULL DEFAULT 0,
  atualizado_em  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (report_id, lead_id)
);
CREATE INDEX IF NOT EXISTS crm_declabs_leads_data_idx ON public.crm_declabs_leads (report_id, data_criacao);

-- 3. Pedidos do Mercado Livre (vindos do Mercado Pago no CRM).
CREATE TABLE IF NOT EXISTS public.crm_declabs_ml_pedidos (
  report_id      uuid NOT NULL REFERENCES public.reports_config(id) ON DELETE CASCADE,
  pedido_id      text NOT NULL,
  data_venda     timestamptz NOT NULL,
  produto        text,
  valor_venda    numeric(12,2) NOT NULL DEFAULT 0,
  valor_liquido  numeric(12,2) NOT NULL DEFAULT 0,
  situacao       text NOT NULL,  -- pago | em_reclamacao | pendente | estornado | devolvido | cancelado
  atualizado_em  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (report_id, pedido_id)
);
CREATE INDEX IF NOT EXISTS crm_declabs_ml_pedidos_data_idx ON public.crm_declabs_ml_pedidos (report_id, data_venda);

-- 4. Mesma regra do nectar_deals: equipe vê tudo, cliente vê só o relatório dele.
--    Escrita só pelo service_role (importador).
ALTER TABLE public.crm_declabs_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_declabs_ml_pedidos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_declabs_leads FROM anon;
REVOKE ALL ON public.crm_declabs_ml_pedidos FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.crm_declabs_leads FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.crm_declabs_ml_pedidos FROM authenticated;
GRANT SELECT ON public.crm_declabs_leads TO authenticated;
GRANT SELECT ON public.crm_declabs_ml_pedidos TO authenticated;

DROP POLICY IF EXISTS "Scoped read of crm_declabs_leads" ON public.crm_declabs_leads;
CREATE POLICY "Scoped read of crm_declabs_leads" ON public.crm_declabs_leads FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR report_id = public.assigned_report_id());

DROP POLICY IF EXISTS "Scoped read of crm_declabs_ml_pedidos" ON public.crm_declabs_ml_pedidos;
CREATE POLICY "Scoped read of crm_declabs_ml_pedidos" ON public.crm_declabs_ml_pedidos FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR report_id = public.assigned_report_id());

-- 5. A Alphaz usa o CRM DecLabs (workspace 'alphaz').
UPDATE public.reports_config SET crm_workspace_suffix = 'alphaz' WHERE name = 'Alphaz';

NOTIFY pgrst, 'reload schema';
