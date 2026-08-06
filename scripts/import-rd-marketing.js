import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import ws from 'ws';

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = ws;
}

// Helper para ler .env
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) return;
    const key = match[1].trim();
    let val = match[2].trim().replace(/^['"\s`]+|['"\s`]+$/g, '');
    process.env[key] = val;
  });
}

loadEnv();

function cleanEnv(val, fallback = undefined) {
  if (!val || typeof val !== 'string') return fallback;
  const cleaned = val.trim().replace(/^['"\s`]+|['"\s`]+$/g, '');
  return cleaned || fallback;
}

const defaultUrl = 'https://btdgetidtawjtqrvzybh.supabase.co';
const SUPABASE_URL = cleanEnv(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, defaultUrl);
const SUPABASE_SERVICE_ROLE_KEY = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERRO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos no .env.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

let days = 7;
process.argv.slice(2).forEach(arg => {
  if (arg.startsWith('--days=')) {
    days = parseInt(arg.split('=')[1], 10) || 7;
  }
});

const endDate = new Date();
const startDate = new Date();
startDate.setDate(startDate.getDate() - days);

const formatDate = (date) => date.toISOString().split('T')[0];
const startDateStr = formatDate(startDate);
const endDateStr = formatDate(endDate);

console.log(`\n======================================================`);
console.log(`=== IMPORTAÇÃO DE DADOS REAIS - RD STATION MARKETING ===`);
console.log(`======================================================`);
console.log(`Período de Extração: ${startDateStr} até ${endDateStr} (${days} dias)\n`);

async function fetchRdContacts(token) {
  const url = `https://api.rd.services/platform/contacts`;
  const headers = { 'Content-Type': 'application/json' };
  
  // Suporte a token privado (Bearer ou via api_key na query string)
  let fetchUrl = url;
  if (token.startsWith('ey') || token.length > 30) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    fetchUrl += `?api_key=${token}`;
  }

  try {
    const response = await fetch(fetchUrl, { method: 'GET', headers });
    if (!response.ok) {
      const txt = await response.text();
      console.warn(` [Aviso API RD] Resposta HTTP ${response.status} ao consultar contatos: ${txt}`);
      return [];
    }
    const data = await response.json();
    return data.contacts || data || [];
  } catch (err) {
    console.error(` [Erro de Rede API RD]:`, err.message);
    return [];
  }
}

async function runImport() {
  try {
    // Busca configurações de relatórios (clientes)
    const { data: configs, error: configError } = await supabase.from('reports_config').select('*');
    if (configError) throw configError;

    if (!configs || configs.length === 0) {
      console.log('Nenhum cliente configurado na tabela reports_config.');
      return;
    }

    for (const config of configs) {
      const tableName = config.rd_table_name || (config.name.toLowerCase().includes('multiperfil') || config.name.toLowerCase().includes('dec') ? 'multiperfil_rd_marketing_metrics' : null);
      
      if (!tableName) {
        console.log(` [Pula Cliente] ${config.name} não tem rd_table_name associada.`);
        continue;
      }

      const token = config.rd_private_token || config.rd_public_token || process.env.RD_PRIVATE_TOKEN || process.env.RD_ACCESS_TOKEN || process.env.RD_PUBLIC_TOKEN;

      console.log(`\n------------------------------------------------------`);
      console.log(`Processando Cliente: ${config.name}`);
      console.log(`Tabela Destino no Banco: ${tableName}`);
      
      if (!token) {
        console.error(` [Erro] Token Privado/Público da RD Marketing não configurado para ${config.name}. Preencha no modal de Configuração ou no arquivo .env.`);
        continue;
      }

      console.log(` - Conectando na API do RD Station para buscar base de contatos dos últimos ${days} dias...`);
      const contacts = await fetchRdContacts(token);
      console.log(` - Total de registros brutos retornados pela API: ${contacts.length}`);

      // Agregador de dados por dia
      const metricsByDate = {};
      
      // Inicializa os 7 dias para evitar vãos nas datas do gráfico
      for (let d = 0; d <= days; d++) {
        const cur = new Date(startDate);
        cur.setDate(cur.getDate() + d);
        const dtStr = formatDate(cur);
        metricsByDate[dtStr] = {
          metric_date: dtStr,
          total_leads: 0,
          leads_mql: 0,
          oportunidades: 0,
          visits: 0,
          channel_google_ads: 0,
          channel_meta_ads: 0,
          channel_organic: 0,
          channel_direct: 0,
          top_lps: [],
          email_open_rate: 0.0,
          email_ctr: 0.0,
          workflows_active: 0
        };
      }

      // Processa os contatos retornados pela API real
      if (Array.isArray(contacts) && contacts.length > 0) {
        for (const contact of contacts) {
          const createdAt = contact.created_at || contact.created_timestamp;
          if (!createdAt) continue;
          
          const dtStr = createdAt.split('T')[0];
          if (!metricsByDate[dtStr] && (dtStr >= startDateStr && dtStr <= endDateStr)) {
            metricsByDate[dtStr] = {
              metric_date: dtStr,
              total_leads: 0,
              leads_mql: 0,
              oportunidades: 0,
              visits: 0,
              channel_google_ads: 0,
              channel_meta_ads: 0,
              channel_organic: 0,
              channel_direct: 0,
              top_lps: [],
              email_open_rate: 0.0,
              email_ctr: 0.0,
              workflows_active: 0
            };
          }

          if (metricsByDate[dtStr]) {
            metricsByDate[dtStr].total_leads += 1;
            
            // Estágios no funil RD
            const stage = (contact.lead_stage || "").toLowerCase();
            if (stage.includes('qualified') || stage.includes('mql')) {
              metricsByDate[dtStr].leads_mql += 1;
            }
            if (stage.includes('opp') || stage.includes('oportunidade') || stage.includes('client')) {
              metricsByDate[dtStr].oportunidades += 1;
              if (metricsByDate[dtStr].leads_mql === 0) metricsByDate[dtStr].leads_mql += 1; // todo opp passou por mql
            }

            // Mapeia canal
            const source = (contact.traffic_source || contact.utm_source || "").toLowerCase();
            if (source.includes('google') || source.includes('adwords') || source.includes('gads')) {
              metricsByDate[dtStr].channel_google_ads += 1;
            } else if (source.includes('meta') || source.includes('fb') || source.includes('instagram') || source.includes('facebook')) {
              metricsByDate[dtStr].channel_meta_ads += 1;
            } else if (source.includes('organic') || source.includes('seo')) {
              metricsByDate[dtStr].channel_organic += 1;
            } else {
              metricsByDate[dtStr].channel_direct += 1;
            }
          }
        }
      }

      const rowsToUpsert = Object.values(metricsByDate).filter(r => r.metric_date >= startDateStr && r.metric_date <= endDateStr);

      console.log(` - Sincronizando ${rowsToUpsert.length} dias na tabela ${tableName}...`);
      
      const { data: res, error: upsertError } = await supabase
        .from(tableName)
        .upsert(rowsToUpsert, { onConflict: 'metric_date' });

      if (upsertError) {
        console.error(` [Erro Supabase] Falha ao gravar no banco de dados (${tableName}):`, upsertError.message);
      } else {
        console.log(` [Sucesso] Dados reais gravados com êxito na tabela ${tableName}!`);
      }
    }

    console.log(`\n=== IMPORTAÇÃO CONCLUÍDA COM SUCESSO! ===\n`);
    process.exit(0);

  } catch (error) {
    console.error('\nErro fatal durante a importação do RD Marketing:', error);
    process.exit(1);
  }
}

runImport();
