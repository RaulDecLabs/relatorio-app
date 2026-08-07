import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: configs } = await supabase.from('reports_config').select('*');
  if (!configs) return;
  
  for (const config of configs) {
    const tables = [
      config.table_name,
      config.ads_table_name,
      config.fb_ads_table_name,
      config.gsc_table_name
    ].filter(Boolean); // filtra nulos
    
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) {
          console.log(`Erro ao limpar tabela ${table}: ${error.message}`);
        } else {
          console.log(`✅ Tabela ${table} limpa com sucesso.`);
        }
      } catch (err) {
        console.log(`Tabela ${table} não existe ou falhou.`);
      }
    }
  }
}

run();
