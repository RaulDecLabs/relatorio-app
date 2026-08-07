import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = ws;
}

const envPath = path.resolve(process.cwd(), '.env');
const env = fs.readFileSync(envPath, 'utf-8').split('\n').reduce((acc, line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
       const key = match[1].trim();
       const val = match[2].trim().replace(/^['"\s`]+|['"\s`]+$/g, '');
       acc[key] = val;
    }
  }
  return acc;
}, {});

const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function run() {
  const { data: configs } = await supabase.from('reports_config').select('*');
  let totalInserted = 0;

  for (const config of configs) {
    const tableName = config.rd_table_name;
    if (!tableName) continue;

    console.log(`\nProcessando histórico de ${config.name} (Tabela: ${tableName})...`);
    
    // Pegar os últimos 30 dias
    const date30 = new Date();
    date30.setDate(date30.getDate() - 30);
    const date30Str = date30.toISOString().split('T')[0];

    const { data: metrics, error } = await supabase
      .from(tableName)
      .select('*')
      .gte('metric_date', date30Str);

    if (error || !metrics) {
      console.log(`- Falha ao ler ${tableName}: ${error?.message || 'Sem dados'}`);
      continue;
    }

    const eventsToInsert = [];

    for (const metric of metrics) {
      const baseDate = new Date(metric.metric_date + 'T12:00:00Z');
      
      // Distribuir origens
      let gAds = metric.channel_google_ads || 0;
      let mAds = metric.channel_meta_ads || 0;
      let org = metric.channel_organic || 0;
      let dir = metric.channel_direct || 0;

      // Gerar Leads (CONVERSION)
      for (let i = 0; i < (metric.total_leads || 0); i++) {
        let source = 'Desconhecido';
        if (gAds > 0) { source = 'Google Ads'; gAds--; }
        else if (mAds > 0) { source = 'Meta Ads'; mAds--; }
        else if (org > 0) { source = 'Busca Orgânica'; org--; }
        else if (dir > 0) { source = 'Tráfego Direto'; dir--; }

        eventsToInsert.push({
          report_id: config.id,
          event_type: 'CONVERSION',
          lead_email: `historico_${metric.metric_date}_${i}@importado.com`,
          created_at: new Date(baseDate.getTime() + (i * 1000)).toISOString(),
          payload: {
            custom_fields: { Origem: source },
            first_conversion: { content: { identificador: 'Histórico Importado' } }
          }
        });
      }

      // Gerar Oportunidades (OPPORTUNITY)
      for (let i = 0; i < (metric.oportunidades || 0); i++) {
        eventsToInsert.push({
          report_id: config.id,
          event_type: 'OPPORTUNITY',
          lead_email: `historico_${metric.metric_date}_opp_${i}@importado.com`,
          created_at: new Date(baseDate.getTime() + 60000 + (i * 1000)).toISOString(),
          payload: {
            custom_fields: { Origem: 'Importado' }
          }
        });
      }
    }

    if (eventsToInsert.length > 0) {
       console.log(`- Inserindo ${eventsToInsert.length} eventos no rd_events...`);
       // Vamos inserir em lotes para não sobrecarregar
       for (let i = 0; i < eventsToInsert.length; i += 100) {
         const chunk = eventsToInsert.slice(i, i + 100);
         await supabase.from('rd_events').insert(chunk);
       }
       totalInserted += eventsToInsert.length;
    } else {
       console.log(`- Nenhum evento histórico encontrado para a tabela.`);
    }
  }

  console.log(`\nImportação concluída! Total de eventos recriados: ${totalInserted}`);
}
run();
