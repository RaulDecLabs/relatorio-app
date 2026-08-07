import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import ws from 'ws';

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = ws;
}

// Helper para ler .env quando executado por child_process
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
const SUPABASE_SERVICE_ROLE_KEY = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("ERRO: Variáveis do Supabase não encontradas. (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

const MAX_PAGES = 10;

function mapStatus(statusCode) {
  // Nectar Status codes mapping: 0 = Ganho, 1 = Aberto, 2 = Perdido
  if (statusCode === 0) return 'Ganho';
  if (statusCode === 1) return 'Aberto';
  if (statusCode === 2) return 'Perdido';
  return 'Aberto';
}

async function run() {
  console.log("Iniciando rotina de extração do Nectar CRM...");
  
  // 1. Buscar todas as configurações que possuem o token do Nectar
  const { data: configs, error: configError } = await supabase
    .from('reports_config')
    .select('id, name, nectar_api_token')
    .not('nectar_api_token', 'is', null)
    .not('nectar_api_token', 'eq', '');

  if (configError) {
    console.error("Erro ao buscar configurações:", configError);
    return;
  }

  if (!configs || configs.length === 0) {
    console.log("Nenhum cliente configurado com Token do Nectar CRM. Encerrando.");
    return;
  }

  console.log(`Encontrados ${configs.length} cliente(s) com integração Nectar.`);

  // Parse --days argument
  let daysToFetch = 7; // default 7
  const daysArg = process.argv.find(arg => arg.startsWith('--days='));
  if (daysArg) {
    daysToFetch = parseInt(daysArg.split('=')[1], 10);
  }

  const dataFiltro = new Date();
  dataFiltro.setDate(dataFiltro.getDate() - daysToFetch);
  const dataCriacaoInicio = dataFiltro.toISOString().split('T')[0];
  
  console.log(`Buscando oportunidades a partir de: ${dataCriacaoInicio} (${daysToFetch} dias atrás)`);

  for (const config of configs) {
    console.log(`\n========================================`);
    console.log(`Sincronizando cliente: ${config.name} (ID: ${config.id})`);
    
    let allDeals = [];
    let hasMore = true;
    let page = 0;

    // Buscar oportunidades com paginação (Nectar usa 'pagina' ou limit/offset - verificaremos via paginação genérica do Nectar CRM se necessário)
    // Se a API deles retornar todos, a paginação quebra logo. O Nectar normalmente usa ?pagina=0&tamanho=100
    while (hasMore && page < MAX_PAGES) {
      try {
        console.log(`Buscando oportunidades da API (Página ${page})...`);
        const response = await fetch(`https://app.nectarcrm.com.br/crm/api/1/oportunidades?dataCriacaoInicio=${dataCriacaoInicio}&pagina=${page}&tamanho=100`, {
          headers: {
            "Access-Token": config.nectar_api_token
          }
        });

        if (!response.ok) {
          console.error(`Erro API Nectar CRM: HTTP ${response.status} ${response.statusText}`);
          break;
        }

        const data = await response.json();
        const items = data.content || data.items || data;
        
        if (!Array.isArray(items) || items.length === 0) {
          hasMore = false;
        } else {
          allDeals = allDeals.concat(items);
          page++;
          if (items.length < 100) {
            hasMore = false; // Última página
          }
        }
      } catch (err) {
        console.error(`Erro ao fazer request para Nectar: ${err.message}`);
        hasMore = false;
      }
    }

    console.log(`Total de Oportunidades recuperadas: ${allDeals.length}`);

    if (allDeals.length > 0) {
      const dealsToUpsert = allDeals.map(deal => ({
        report_id: config.id,
        deal_id: deal.id.toString(),
        deal_name: deal.nome || null,
        funnel_name: deal.pipeline || (deal.funilVenda ? deal.funilVenda.nome : null),
        stage_name: deal.etapaNome || (deal.etapaAtual ? deal.etapaAtual.nome : null),
        value: deal.valorTotal || deal.valorMensal || 0,
        status: mapStatus(deal.status),
        created_at: deal.dataCriacao || new Date().toISOString(),
        updated_at: deal.dataAtualizacao || new Date().toISOString(),
        closed_at: deal.status === 0 || deal.status === 2 ? (deal.dataAtualizacao || new Date().toISOString()) : null,
        payload: deal
      }));

      // Inserir no Supabase
      const { error: upsertError } = await supabase
        .from('nectar_deals')
        .upsert(dealsToUpsert, { onConflict: 'report_id,deal_id' });

      if (upsertError) {
        console.error("Erro ao salvar no banco:", upsertError);
      } else {
        console.log(`✅ ${dealsToUpsert.length} deals importados com sucesso!`);
      }
    }
  }

  console.log("\nExtração finalizada.");
}

run();
