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
const DEVELOPER_TOKEN = cleanEnv(process.env.GOOGLE_ADS_DEVELOPER_TOKEN, 'jDZOXu1IwUTlveZ6s4n_-w');
const DEFAULT_CUSTOMER_ID = cleanEnv(process.env.GOOGLE_ADS_CUSTOMER_ID, '2906359264');
const LOGIN_CUSTOMER_ID = cleanEnv(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID, '3235757447');

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

console.log(`\n=== IMPORTAÇÃO GOOGLE ADS ===`);
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
      const customerId = (config.google_ads_customer_id || DEFAULT_CUSTOMER_ID).replace(/-/g, '');
      const tableName = config.ads_table_name || 'Dec_google_ads_metrics';

      console.log(`\nProcessando cliente: ${config.name} (Customer ID: ${customerId})`);
      console.log(`Tabela destino: ${tableName}`);

      const url = `https://googleads.googleapis.com/v24/customers/${customerId}/googleAds:searchStream`;
      const query = `SELECT segments.date, campaign.id, campaign.name, campaign.status, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM campaign WHERE segments.date BETWEEN '${startDateStr}' AND '${endDateStr}' AND campaign.status != 'REMOVED'`;

      console.log(' - Executando query na API v24 do Google Ads...');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': DEVELOPER_TOKEN,
          'login-customer-id': LOGIN_CUSTOMER_ID.replace(/-/g, ''),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      const responseText = await response.text();
      let streamData;
      try {
        streamData = JSON.parse(responseText);
      } catch {
        throw new Error(`Resposta inválida do Google Ads: ${responseText}`);
      }

      if (!response.ok || streamData[0]?.error) {
        console.error(` [Erro Google Ads] Falha na busca para o cliente ${config.name}:`, JSON.stringify(streamData, null, 2));
        continue;
      }

      const rowsToUpsert = [];
      if (Array.isArray(streamData)) {
        for (const batch of streamData) {
          if (batch.results && Array.isArray(batch.results)) {
            for (const row of batch.results) {
              const date = row.segments?.date;
              const campaignId = String(row.campaign?.id || '');
              const campaignName = row.campaign?.name || 'Sem nome';
              const impressions = parseInt(row.metrics?.impressions || 0, 10);
              const clicks = parseInt(row.metrics?.clicks || 0, 10);
              const costMicros = Number(row.metrics?.costMicros || row.metrics?.cost_micros || 0);
              const cost = costMicros / 1000000.0;
              const conversions = Number(row.metrics?.conversions || 0);
              const conversionsValue = Number(row.metrics?.conversionsValue || row.metrics?.conversions_value || 0);

              rowsToUpsert.push({
                client_id: config.id,
                metric_date: date,
                campaign_id: campaignId,
                campaign_name: campaignName,
                impressions,
                clicks,
                cost: parseFloat(cost.toFixed(2)),
                conversions: parseFloat(conversions.toFixed(2)),
                conversions_value: parseFloat(conversionsValue.toFixed(2))
              });
            }
          }
        }
      }

      console.log(` - Linhas encontradas no Google Ads para o período: ${rowsToUpsert.length}`);

      if (rowsToUpsert.length > 0) {
        const { error: upsertError } = await supabase
          .from(tableName)
          .upsert(rowsToUpsert, {
            onConflict: 'client_id,metric_date,campaign_id,campaign_name'
          });

        if (upsertError) {
          console.error(` [Erro] Falha ao salvar no Supabase (${tableName}):`, upsertError.message);
        } else {
          console.log(` [Sucesso] Ingestão do Google Ads concluída sem erros para ${config.name}!`);
        }
      } else {
        console.log(` Nenhuma métrica encontrada para o período deste cliente.`);
      }
    }
  } catch (err) {
    console.error('Ocorreu um erro geral durante a importação de Google Ads:', err);
  }
}

runImport();
