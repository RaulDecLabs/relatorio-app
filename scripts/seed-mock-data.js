import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.error('.env file not found!');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) return;
    const key = match[1].trim();
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    process.env[key] = val;
  });
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CLIENT_ID = '28819554-149b-4d54-9198-60455dbada07';
const ADS_TABLE = 'Dec_google_ads_metrics';
const GSC_TABLE = 'Dec_google_search_console_metrics';
const GA4_TABLE = 'Dec_google_analytics_metrics';

async function seedData() {
  console.log("Iniciando geração de dados simulados (Ads e Search Console)...");

  // Deletar dados anteriores das tabelas para evitar conflitos de chave única no seeding
  console.log("Limpando dados existentes...");
  await supabase.from(ADS_TABLE).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from(GSC_TABLE).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from(GA4_TABLE).delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const adsRows = [];
  const gscRows = [];
  const ga4Rows = [];

  const today = new Date();
  
  // Vamos gerar dados para os últimos 90 dias
  for (let i = 1; i <= 90; i++) {
    const currentDate = new Date();
    currentDate.setDate(today.getDate() - i);
    const dateStr = currentDate.toISOString().split('T')[0];

    // --- GOOGLE ADS & FACEBOOK ADS DATA ---
    const campaigns = [
      { id: 'c1', name: 'Google PMax - Conversão Principal' },
      { id: 'c2', name: 'Google Search - Marca Dec' },
      { id: 'c3', name: 'Google Display - Remarketing Dinâmico' },
      { id: 'fb1', name: 'Meta Ads - Captação Instagram' },
      { id: 'fb2', name: 'Meta Ads - Retargeting Facebook' }
    ];

    campaigns.forEach((camp) => {
      // Adicionar variação baseada no dia da semana para ficar realista
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
      const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.6 : 1.0;
      
      let baseImpressions, baseClicks, baseCost, baseConversions, conversionValueMultiplier;
      
      if (camp.id === 'c1') {
        baseImpressions = 5000;
        baseClicks = 250;
        baseCost = 350;
        baseConversions = 15;
        conversionValueMultiplier = 120; // R$120 por conversão
      } else if (camp.id === 'c2') {
        baseImpressions = 1500;
        baseClicks = 180;
        baseCost = 90;
        baseConversions = 8;
        conversionValueMultiplier = 95;
      } else {
        baseImpressions = 8000;
        baseClicks = 120;
        baseCost = 60;
        baseConversions = 2;
        conversionValueMultiplier = 80;
      }

      const randomFactor = 0.8 + Math.random() * 0.4; // +/- 20%
      const impressions = Math.round(baseImpressions * weekendFactor * randomFactor);
      const clicks = Math.round(baseClicks * weekendFactor * randomFactor);
      const cost = parseFloat((baseCost * weekendFactor * randomFactor).toFixed(2));
      const conversions = parseFloat((baseConversions * weekendFactor * randomFactor).toFixed(1));
      const conversions_value = parseFloat((conversions * conversionValueMultiplier).toFixed(2));

      adsRows.push({
        client_id: CLIENT_ID,
        metric_date: dateStr,
        campaign_id: camp.id,
        campaign_name: camp.name,
        impressions,
        clicks,
        cost,
        conversions,
        conversions_value
      });
    });

    // --- GOOGLE SEARCH CONSOLE DATA ---
    const queries = [
      { term: 'relatorio de trafego automatico', page: '/', device: 'desktop' },
      { term: 'relatorio de trafego automatico', page: '/', device: 'mobile' },
      { term: 'dashboard n8n marketing', page: '/reports', device: 'desktop' },
      { term: 'agencia insightos', page: '/', device: 'desktop' },
      { term: 'agencia insightos', page: '/', device: 'mobile' },
      { term: 'sistema de metricas supabase', page: '/dashboard', device: 'desktop' },
      { term: 'como integrar ads no n8n', page: '/automations', device: 'desktop' }
    ];

    queries.forEach((q) => {
      let baseImps, baseClicks, basePos;

      if (q.term.includes('insightos')) {
        baseImps = 150;
        baseClicks = 40;
        basePos = 1.1;
      } else if (q.term.includes('relatorio')) {
        baseImps = 300;
        baseClicks = 25;
        basePos = 2.4;
      } else if (q.term.includes('dashboard')) {
        baseImps = 200;
        baseClicks = 18;
        basePos = 3.5;
      } else {
        baseImps = 100;
        baseClicks = 8;
        basePos = 5.2;
      }

      const randomFactor = 0.85 + Math.random() * 0.3; // +/- 15%
      const impressions = Math.round(baseImps * randomFactor);
      const clicks = Math.round(baseClicks * randomFactor);
      const position = parseFloat((basePos + (Math.random() * 0.4 - 0.2)).toFixed(2));

      gscRows.push({
        client_id: CLIENT_ID,
        metric_date: dateStr,
        query: q.term,
        page: q.page,
        device: q.device,
        country: 'BR',
        clicks,
        impressions,
        position
      });
    });

    // --- GA4 DATA ---
    const ga4Sources = [
      { source: 'google', medium: 'organic' },
      { source: 'google', medium: 'cpc' },
      { source: 'facebook', medium: 'paid' },
      { source: 'direct', medium: '(none)' }
    ];

    ga4Sources.forEach((src) => {
      let baseUsers, baseSessions, basePageViews;
      if (src.source === 'google' && src.medium === 'organic') {
        baseUsers = 150; baseSessions = 180; basePageViews = 350;
      } else if (src.source === 'google' && src.medium === 'cpc') {
        baseUsers = 80; baseSessions = 90; basePageViews = 150;
      } else if (src.source === 'facebook') {
        baseUsers = 200; baseSessions = 250; basePageViews = 400;
      } else {
        baseUsers = 50; baseSessions = 60; basePageViews = 100;
      }

      const randomFactor = 0.7 + Math.random() * 0.6;
      const users = Math.round(baseUsers * randomFactor);
      const sessions = Math.round(baseSessions * randomFactor);
      const pageViews = Math.round(basePageViews * randomFactor);
      const engagedSessions = Math.round(sessions * 0.6);

      ga4Rows.push({
        client_id: CLIENT_ID,
        metric_date: dateStr,
        page_path: '/',
        session_manual_source_medium: `${src.source} / ${src.medium}`,
        session_source: src.source,
        session_medium: src.medium,
        city: 'São Paulo',
        device_category: 'mobile',
        browser: 'Chrome',
        sessions: sessions,
        total_users: users,
        active_users: users,
        bounce_rate: 40.5,
        page_views: pageViews,
        engagement_rate: 60.0,
        average_session_duration: 120.5,
        engaged_sessions: engagedSessions,
        events: pageViews * 2,
        total_ad_revenue: 0,
        transactions: 0,
        session_duration: sessions * 120.5
      });
    });
  }

  // Enviar para o banco em blocos
  console.log(`Enviando ${adsRows.length} linhas para o Google Ads...`);
  const { error: adsErr } = await supabase.from(ADS_TABLE).insert(adsRows);
  if (adsErr) {
    console.error("Erro ao inserir Ads:", adsErr.message);
  } else {
    console.log("Google Ads inserido com sucesso!");
  }

  console.log(`Enviando ${gscRows.length} linhas para o Search Console...`);
  // O GSC tem muitas linhas, vamos fatiar caso necessário (7 * 90 = 630 linhas, o que é seguro para uma chamada)
  const { error: gscErr } = await supabase.from(GSC_TABLE).insert(gscRows);
  if (gscErr) {
    console.error("Erro ao inserir GSC:", gscErr.message);
  } else {
    console.log("Search Console inserido com sucesso!");
  }

  console.log(`Enviando ${ga4Rows.length} linhas para o GA4...`);
  const { error: ga4Err } = await supabase.from(GA4_TABLE).insert(ga4Rows);
  if (ga4Err) {
    console.error("Erro ao inserir GA4:", ga4Err.message);
  } else {
    console.log("GA4 inserido com sucesso!");
  }

  console.log("Finalizado!");
}

seedData();
