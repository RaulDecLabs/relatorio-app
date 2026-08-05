import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Helper to load and parse .env file
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
const GA_PROPERTY_ID = cleanEnv(process.env.GA_PROPERTY_ID);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERRO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos no arquivo .env.');
  console.error('Por favor, adicione SUPABASE_SERVICE_ROLE_KEY no seu .env para poder inserir os dados.');
  process.exit(1);
}

// Initialize Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
});

// Initialize GA4 Client
// It automatically picks up GOOGLE_APPLICATION_CREDENTIALS from process.env
const analyticsDataClient = new BetaAnalyticsDataClient();

// Get date range from arguments
let days = 7;
const args = process.argv.slice(2);
args.forEach((arg) => {
  if (arg.startsWith('--days=')) {
    days = parseInt(arg.split('=')[1], 10);
  }
});

const endDate = new Date();
endDate.setDate(endDate.getDate() - 1); // yesterday
const startDate = new Date();
startDate.setDate(startDate.getDate() - days);

const formatDate = (date) => date.toISOString().split('T')[0];
const startDateStr = formatDate(startDate);
const endDateStr = formatDate(endDate);

console.log(`\n=== IMPORTAÇÃO GA4 ===`);
console.log(`Período: ${startDateStr} até ${endDateStr} (${days} dias)`);

async function runImport() {
  try {
    // 1. Fetch clients from reports_config
    const { data: configs, error: configError } = await supabase
      .from('reports_config')
      .select('*');

    if (configError) throw configError;

    if (!configs || configs.length === 0) {
      console.log('Nenhum cliente configurado na tabela reports_config.');
      return;
    }

    for (const config of configs) {
      const clientPropertyId = config.ga4_property_id || GA_PROPERTY_ID;
      if (!clientPropertyId || clientPropertyId === 'SEU_PROPERTY_ID_AQUI') {
        console.warn(`[Aviso] Cliente '${config.name}' não possui ga4_property_id configurado. Pulando...`);
        continue;
      }

      console.log(`\nProcessando cliente: ${config.name} (Property ID: ${clientPropertyId})`);
      console.log(`Tabela destino: ${config.table_name}`);

      // --- CHAMADA 1: Totais do Dia (Sem dimensões para evitar fragmentação) ---
      console.log(' - Buscando totais diários consolidados...');
      const [totalsResponse] = await analyticsDataClient.runReport({
        property: `properties/${clientPropertyId}`,
        dateRanges: [{ startDate: startDateStr, endDate: endDateStr }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'activeUsers' },
          { name: 'bounceRate' },
          { name: 'screenPageViews' },
          { name: 'engagementRate' },
          { name: 'averageSessionDuration' },
          { name: 'engagedSessions' },
          { name: 'eventCount' },
        ],
      });

      const totalsRows = [];
      if (totalsResponse.rows) {
        for (const row of totalsResponse.rows) {
          const rawDate = row.dimensionValues[0].value; // YYYYMMDD
          const formattedDate = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;

          totalsRows.push({
            client_id: config.id,
            metric_date: formattedDate,
            page_path: '',
            session_manual_source_medium: '',
            session_source: '',
            session_medium: '',
            city: '',
            device_category: '',
            browser: '',
            sessions: parseInt(row.metricValues[0].value, 10) || 0,
            total_users: parseInt(row.metricValues[1].value, 10) || 0,
            active_users: parseInt(row.metricValues[2].value, 10) || 0,
            bounce_rate: parseFloat(row.metricValues[3].value) || 0.0,
            page_views: parseInt(row.metricValues[4].value, 10) || 0,
            engagement_rate: parseFloat(row.metricValues[5].value) || 0.0,
            average_session_duration: parseFloat(row.metricValues[6].value) || 0.0,
            engaged_sessions: parseInt(row.metricValues[7].value, 10) || 0,
            events: parseInt(row.metricValues[8].value, 10) || 0,
            total_ad_revenue: 0.0,
            transactions: 0,
            session_duration: 0.0,
          });
        }
      }

      // --- CHAMADA 2: Detalhes e Segmentações ---
      console.log(' - Buscando detalhes segmentados (cidades, browsers, páginas)...');
      const [detailsResponse] = await analyticsDataClient.runReport({
        property: `properties/${clientPropertyId}`,
        dateRanges: [{ startDate: startDateStr, endDate: endDateStr }],
        dimensions: [
          { name: 'date' },
          { name: 'pagePath' },
          { name: 'sessionSource' },
          { name: 'sessionMedium' },
          { name: 'city' },
          { name: 'deviceCategory' },
          { name: 'browser' },
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
        ],
        // Limit details to prevent hitting maximum payloads, 2000 is usually plenty
        limit: 2000,
      });

      const detailsRows = [];
      if (detailsResponse.rows) {
        for (const row of detailsResponse.rows) {
          const rawDate = row.dimensionValues[0].value;
          const formattedDate = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
          const source = row.dimensionValues[2].value || '';
          const medium = row.dimensionValues[3].value || '';

          detailsRows.push({
            client_id: config.id,
            metric_date: formattedDate,
            page_path: row.dimensionValues[1].value || '',
            session_manual_source_medium: source && medium ? `${source} / ${medium}` : '',
            session_source: source,
            session_medium: medium,
            city: row.dimensionValues[4].value || '',
            device_category: row.dimensionValues[5].value || '',
            browser: row.dimensionValues[6].value || '',
            sessions: parseInt(row.metricValues[0].value, 10) || 0,
            total_users: parseInt(row.metricValues[1].value, 10) || 0,
            page_views: parseInt(row.metricValues[2].value, 10) || 0,
            active_users: 0,
            bounce_rate: 0.0,
            engagement_rate: 0.0,
            average_session_duration: 0.0,
            engaged_sessions: 0,
            events: 0,
            total_ad_revenue: 0.0,
            transactions: 0,
            session_duration: 0.0,
          });
        }
      }

      const allRowsToUpsert = [...totalsRows, ...detailsRows];
      console.log(` - Total de linhas para upsert: ${allRowsToUpsert.length} (${totalsRows.length} totais + ${detailsRows.length} detalhes)`);

      if (allRowsToUpsert.length > 0) {
        const { error: upsertError } = await supabase
          .from(config.table_name)
          .upsert(allRowsToUpsert, {
            onConflict: 'client_id,metric_date,page_path,session_manual_source_medium,session_source,session_medium,city,device_category,browser',
          });

        if (upsertError) {
          console.error(` [Erro] Falha ao salvar no banco para ${config.name}:`, upsertError.message);
        } else {
          console.log(` [Sucesso] Ingestão concluída com sucesso para ${config.name}!`);
        }
      }
    }
  } catch (err) {
    console.error('Ocorreu um erro geral durante a importação:', err);
  }
}

runImport();
