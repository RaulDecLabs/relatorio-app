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
const META_ACCESS_TOKEN = cleanEnv(process.env.META_ACCESS_TOKEN);
const DEFAULT_ACCOUNT_ID = cleanEnv(process.env.META_ACCOUNT_ID, 'act_1306814463495766');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERRO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos no .env.');
  process.exit(1);
}

if (!META_ACCESS_TOKEN) {
  console.error('ERRO: META_ACCESS_TOKEN não está preenchido no .env.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

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

console.log(`\n=== IMPORTAÇÃO META ADS (FACEBOOK ADS) ===`);
console.log(`Período: ${startDateStr} até ${endDateStr} (${days} dias)`);

async function runImport() {
  try {
    // Buscar configurações na tabela reports_config para descobrir os clientes
    const { data: configs, error: configError } = await supabase.from('reports_config').select('*');
    if (configError) throw configError;

    if (!configs || configs.length === 0) {
      console.log('Nenhum cliente configurado na tabela reports_config.');
      return;
    }

    for (const config of configs) {
      const accountId = config.meta_account_id || config.fb_account_id || DEFAULT_ACCOUNT_ID;
      const tableName = config.fb_ads_table_name || config.meta_table_name || (config.name === 'Alphaz' ? 'Alphaz_facebook_ads_metrics' : 'Dec_facebook_ads_metrics');

      console.log(`\nProcessando cliente: ${config.name} (Conta Meta: ${accountId})`);
      console.log(`Tabela destino: ${tableName}`);

      const params = new URLSearchParams({
        access_token: META_ACCESS_TOKEN,
        level: 'campaign',
        time_increment: '1',
        fields: 'campaign_id,campaign_name,impressions,clicks,spend,actions,action_values',
        time_range: JSON.stringify({ since: startDateStr, until: endDateStr }),
        limit: '1000'
      });

      const url = `https://graph.facebook.com/v23.0/${accountId}/insights?${params.toString()}`;
      
      console.log(' - Executando consulta na Graph API v23.0 do Meta...');
      const response = await fetch(url);
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Resposta inválida do Meta Ads: ${responseText}`);
      }

      if (!response.ok || data.error) {
        console.error(` [Erro Meta Ads] Falha na busca para o cliente ${config.name}:`, JSON.stringify(data.error || data, null, 2));
        continue;
      }

      const rowsToUpsert = [];
      if (data.data && Array.isArray(data.data)) {
        for (const row of data.data) {
          const metric_date = row.date_start || startDateStr;
          const campaign_id = String(row.campaign_id || '');
          const campaign_name = row.campaign_name || 'Sem nome';
          const impressions = parseInt(row.impressions || 0, 10);
          const clicks = parseInt(row.clicks || 0, 10);
          const spend = parseFloat(parseFloat(row.spend || 0).toFixed(2));

          // Cálculos de conversão do array de actions
          let conversions = 0;
          if (Array.isArray(row.actions)) {
            row.actions.forEach((a) => {
              const type = (a.action_type || '').toLowerCase();
              if (type === 'purchase' || type === 'lead' || type === 'contact' || type.includes('conversion') || type.includes('lead') || type.includes('complete_registration') || type.includes('submit_form')) {
                conversions += parseFloat(a.value || 0);
              }
            });
          }

          // Cálculos de receita do array de action_values
          let conversions_value = 0;
          if (Array.isArray(row.action_values)) {
            row.action_values.forEach((av) => {
              const type = (av.action_type || '').toLowerCase();
              if (type === 'purchase' || type.includes('conversion') || type.includes('value')) {
                conversions_value += parseFloat(av.value || 0);
              }
            });
          }

          rowsToUpsert.push({
            client_id: config.id,
            metric_date,
            campaign_id,
            campaign_name,
            impressions,
            clicks,
            spend,
            conversions: parseFloat(conversions.toFixed(2)),
            conversions_value: parseFloat(conversions_value.toFixed(2))
          });
        }
      }

      console.log(` - Linhas encontradas no Meta Ads para o período: ${rowsToUpsert.length}`);

      if (rowsToUpsert.length > 0) {
        console.log(` - Atualizando banco de dados no Supabase...`);
        // Remove dados do mesmo período antes de inserir, garantindo 0 duplicidade sem conflitos de índice
        await supabase
          .from(tableName)
          .delete()
          .gte('metric_date', startDateStr)
          .lte('metric_date', endDateStr);

        const { error: insertError } = await supabase
          .from(tableName)
          .insert(rowsToUpsert);

        if (insertError) {
          console.error(` [Erro] Falha ao salvar no Supabase (${tableName}):`, insertError.message);
          
          // Se o erro for de coluna "spend" inexistente, tenta com "cost"
          if (insertError.message.includes('spend')) {
            console.log(' 🔄 Tentando salvar substituindo a coluna "spend" por "cost"...');
            const altRows = rowsToUpsert.map(({ spend, ...rest }) => ({ ...rest, cost: spend }));
            const { error: altError } = await supabase.from(tableName).insert(altRows);
            if (altError) {
              console.error(` [Erro Alternativo] Falha de salvamento:`, altError.message);
            } else {
              console.log(` [Sucesso] Ingestão do Meta Ads concluída sem erros para ${config.name} (usando coluna cost)!`);
            }
          }
        } else {
          console.log(` [Sucesso] Ingestão do Meta Ads concluída sem erros para ${config.name}!`);
        }
      } else {
        console.log(` Nenhuma métrica encontrada para o período deste cliente no Meta Ads.`);
      }
    }
  } catch (err) {
    console.error('Ocorreu um erro geral durante a importação de Meta Ads:', err);
  }
}

runImport();
