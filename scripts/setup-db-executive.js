import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const sql = `
CREATE TABLE IF NOT EXISTS public.executive_summaries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  report_id uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  period_start date NULL,
  period_end date NULL,
  summary_data jsonb NULL,
  CONSTRAINT executive_summaries_pkey PRIMARY KEY (id),
  CONSTRAINT executive_summaries_report_id_fkey FOREIGN KEY (report_id) REFERENCES reports_config(id) ON UPDATE CASCADE ON DELETE CASCADE
);
`;

supabase.rpc('execute_sql', { sql_string: sql }).then(console.log).catch(console.error);
