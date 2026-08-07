require('dotenv').config({ path: 'C:/Users/Asus/Documents/Projetos/Relatorio/.env' });
const { createClient } = require('@supabase/supabase-js');
const url = process.env.VITE_SUPABASE_URL.trim();
const key = process.env.VITE_SUPABASE_ANON_KEY.trim();
const supabase = createClient(url, key);

async function run() {
  const { data: events, error: e1 } = await supabase.from('rd_events').select('id, report_id, created_at, lead_email');
  console.log('Events:', events);
  
  const { data: configs, error: e2 } = await supabase.from('reports_config').select('id, name');
  console.log('Configs:', configs);
}
run();
