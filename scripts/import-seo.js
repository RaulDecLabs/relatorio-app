import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
const CLIENT_ID = cleanEnv(process.env.GOOGLE_CLIENT_ID);
const CLIENT_SECRET = cleanEnv(process.env.GOOGLE_CLIENT_SECRET);
const REFRESH_TOKEN = cleanEnv(process.env.GOOGLE_REFRESH_TOKEN);
const DEFAULT_SITE_URL = cleanEnv(process.env.GSC_SITE_URL, 'sc-domain:multiperfil.com.br');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERRO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos no .env.');
  process.exit(1);
}

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error('ERRO: Credenciais OAuth do Google (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN) não estão totalmente preenchidas no .env.');
  console.error('Rode "node scripts/gerar-refresh-token.js" se precisar autorizar e gerar seu refresh token.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token'
    }).toString()
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Falha ao obter Access Token do Google: ${data.error_description || data.error || JSON.stringify(data)}`);
  }
  return data.access_token;
}

// Ler argumentos do terminal (--days=7)
let days = 7;
process.argv.slice(2).forEach((arg) => {
  if (arg.startsWith('--days=')) {
    days = parseInt(arg.split('=')[1], 10);
  }
});

const endDate = new Date();
endDate.setDate(endDate.getDate() - 1); // ontem
const startDate = new Date();
startDate.setDate(startDate.getDate() - days);

const formatDate = (date) => date.toISOString().split('T')[0];
const startDateStr = formatDate(startDate);
const endDateStr = formatDate(endDate);

console.log(`\n=== IMPORTAÇÃO GOOGLE SEARCH CONSOLE (SEO) ===`);
console.log(`Período: ${startDateStr} até ${endDateStr} (${days} dias)`);

async function runImport() {
  try {
    console.log(' - Gerando Token de Acesso temporário no Google Cloud...');
    const accessToken = await getAccessToken();
    console.log(' - Token gerado com sucesso!');

    // Buscar configurações na tabela reports_config para descobrir os clientes
    const { data: configs, error: configError } = await supabase.from('reports_config').select('*');
    if (configError) throw configError;

    if (!configs || configs.length === 0) {
      console.log('Nenhum cliente configurado na tabela reports_config.');
      return;
    }

    for (const config of configs) {
      const siteUrl = config.gsc_site_url || DEFAULT_SITE_URL;
      const tableName = config.gsc_table_name || config.seo_table_name || 'Dec_google_search_console_metrics';

      console.log(`\nProcessando cliente: ${config.name} (Site: ${siteUrl})`);
      console.log(`Tabela destino: ${tableName}`);

      const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
      
      console.log(' - Executando consulta na Webmasters API v3...');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: startDateStr,
          endDate: endDateStr,
          dimensions: ['date', 'query', 'page', 'device', 'country'],
          rowLimit: 5000
        })
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Resposta inválida do Google Search Console: ${responseText}`);
      }

      if (!response.ok || data.error) {
        console.error(` [Erro SEO] Falha na busca para o cliente ${config.name}:`, JSON.stringify(data, null, 2));
        continue;
      }

      const rowsToUpsert = [];
      if (data.rows && Array.isArray(data.rows)) {
        for (const row of data.rows) {
          const keys = row.keys || [];
          const metric_date = keys[0] || startDateStr;
          const query = keys[1] || 'sem termo';
          const page = keys[2] || '';
          const device = (keys[3] || 'DESKTOP').toUpperCase();
          const country = (keys[4] || 'BR').toUpperCase();
          const clicks = parseInt(row.clicks || 0, 10);
          const impressions = parseInt(row.impressions || 0, 10);
          const position = parseFloat((row.position || 0).toFixed(2));

          rowsToUpsert.push({
            client_id: config.id,
            metric_date,
            query,
            page,
            device,
            country,
            clicks,
            impressions,
            position
          });
        }
      }

      console.log(` - Linhas encontradas no Search Console para o período: ${rowsToUpsert.length}`);

      if (rowsToUpsert.length > 0) {
        const { error: upsertError } = await supabase
          .from(tableName)
          .upsert(rowsToUpsert, {
            onConflict: 'client_id,metric_date,query,page,device,country'
          });

        if (upsertError) {
          console.error(` [Erro] Falha ao salvar no Supabase (${tableName}):`, upsertError.message);
        } else {
          console.log(` [Sucesso] Ingestão de SEO concluída sem erros para ${config.name}!`);
        }
      } else {
        console.log(` Nenhuma métrica encontrada para o período deste cliente.`);
      }
    }
  } catch (err) {
    console.error('Ocorreu um erro geral durante a importação de SEO (Search Console):', err);
  }
}

runImport();
