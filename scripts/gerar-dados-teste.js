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
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    process.env[key] = val;
  });
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERRO: Credenciais do Supabase não encontradas no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const formatDate = (date) => date.toISOString().split('T')[0];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));

console.log('======================================================');
console.log('🧪 GERADOR DE DADOS FALSOS DE TESTE (MOCK DATA)');
console.log('======================================================');

async function seedTestData() {
  try {
    const { data: configs, error } = await supabase.from('reports_config').select('*');
    if (error) throw error;

    if (!configs || configs.length === 0) {
      console.log('Nenhum cliente configurado no reports_config.');
      return;
    }

    const days = 14;
    const today = new Date();
    const dates = [];
    for (let i = 1; i <= days; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      dates.push(formatDate(d));
    }

    for (const config of configs) {
      console.log(`\nGerando dados falsos para o cliente: ${config.name}`);

      // 0. MOCK GOOGLE ANALYTICS (GA4)
      const gaTable = config.table_name || `${config.name}_google_analytics_metrics`;
      const mockGa = [];
      const sources = ['google / cpc', 'facebook / paid', 'google / organic', 'instagram / social', 'direct / (none)'];
      const pages = ['/', '/contato', '/promocao-de-inverno', '/servicos', '/blog/como-crescer-sua-marca'];
      dates.forEach((date) => {
        sources.forEach((src, idx) => {
          mockGa.push({
            client_id: config.id,
            metric_date: date,
            page_path: pages[idx % pages.length],
            session_manual_source_medium: src,
            session_source: src.split(' / ')[0],
            session_medium: src.split(' / ')[1],
            city: idx % 2 === 0 ? 'São Paulo' : 'Rio de Janeiro',
            device_category: idx % 2 === 0 ? 'mobile' : 'desktop',
            browser: 'Chrome',
            sessions: randomInt(120, 850),
            total_users: randomInt(90, 700),
            active_users: randomInt(80, 650),
            page_views: randomInt(200, 1800),
            bounce_rate: randomFloat(25.5, 62.1),
            engagement_rate: randomFloat(38.0, 74.5),
            average_session_duration: randomFloat(45.0, 240.0),
            engaged_sessions: randomInt(70, 500),
            events: randomInt(300, 3500),
            transactions: randomInt(1, 20),
            total_ad_revenue: randomFloat(150.0, 2500.0)
          });
        });
      });
      console.log(` - Inserindo ${mockGa.length} linhas em ${gaTable}...`);
      await supabase.from(gaTable).delete().gte('metric_date', dates[dates.length - 1]).lte('metric_date', dates[0]);
      const { error: gaErr } = await supabase.from(gaTable).insert(mockGa);
      if (gaErr) console.error(`   [Erro GA4]:`, gaErr.message);
      else console.log(`   [Sucesso] Google Analytics (GA4) carregado!`);

      // 1. MOCK GOOGLE ADS
      const adsTable = config.ads_table_name || `${config.name}_google_ads_metrics`;
      const mockAds = [];
      const gadsCampaigns = [
        { id: 'gads_cpc_brand', name: `[TESTE MOCK] Rede de Pesquisa - Institucional` },
        { id: 'gads_pmax_sales', name: `[TESTE MOCK] Performance Max - Conversão Direta` },
        { id: 'gads_display_remarketing', name: `[TESTE MOCK] Display - Remarketing Ativo` }
      ];
      dates.forEach((date) => {
        gadsCampaigns.forEach((camp, idx) => {
          const mult = idx === 1 ? 2.5 : 1;
          mockAds.push({
            client_id: config.id,
            metric_date: date,
            campaign_id: `${camp.id}_${date}`,
            campaign_name: camp.name,
            impressions: randomInt(Math.floor(400 * mult), Math.floor(1800 * mult)),
            clicks: randomInt(Math.floor(25 * mult), Math.floor(150 * mult)),
            cost: randomFloat(35.0 * mult, 160.0 * mult),
            conversions: randomFloat(2.0 * mult, 12.0 * mult),
            conversions_value: randomFloat(180.0 * mult, 1200.0 * mult)
          });
        });
      });
      console.log(` - Inserindo ${mockAds.length} linhas em ${adsTable}...`);
      await supabase.from(adsTable).delete().ilike('campaign_name', '%[TESTE MOCK]%');
      const { error: adsErr } = await supabase.from(adsTable).insert(mockAds);
      if (adsErr) console.error(`   [Erro Google Ads]:`, adsErr.message);
      else console.log(`   [Sucesso] Google Ads carregado!`);

      // 2. MOCK META ADS (FACEBOOK)
      const fbTable = config.fb_ads_table_name || config.meta_table_name || `${config.name}_facebook_ads_metrics`;
      const mockFb = [];
      const metaCampaigns = [
        { id: 'meta_reels_feed', name: `[TESTE MOCK] Reels & Feed - Conversão de Vendas` },
        { id: 'meta_stories_topo', name: `[TESTE MOCK] Stories - Topo de Funil & Alcance` },
        { id: 'meta_remarketing_wpp', name: `[TESTE MOCK] Retargeting - Fale no WhatsApp` },
        { id: 'meta_carrossel_ofertas', name: `[TESTE MOCK] Carrossel Dinâmico - Ofertas Especiais` }
      ];
      dates.forEach((date) => {
        metaCampaigns.forEach((camp, idx) => {
          const mult = idx === 0 ? 3 : idx === 2 ? 1.8 : 1;
          mockFb.push({
            client_id: config.id,
            metric_date: date,
            campaign_id: `${camp.id}_${date}`,
            campaign_name: camp.name,
            impressions: randomInt(Math.floor(1000 * mult), Math.floor(4500 * mult)),
            clicks: randomInt(Math.floor(70 * mult), Math.floor(320 * mult)),
            spend: randomFloat(50.0 * mult, 280.0 * mult),
            conversions: randomFloat(4.0 * mult, 28.0 * mult),
            conversions_value: randomFloat(250.0 * mult, 2200.0 * mult)
          });
        });
      });
      console.log(` - Inserindo ${mockFb.length} linhas em ${fbTable}...`);
      await supabase.from(fbTable).delete().ilike('campaign_name', '%[TESTE MOCK]%');
      let { error: fbErr } = await supabase.from(fbTable).insert(mockFb);
      if (fbErr && fbErr.message.includes('spend')) {
        const altFb = mockFb.map(({ spend, ...rest }) => ({ ...rest, cost: spend }));
        fbErr = (await supabase.from(fbTable).insert(altFb)).error;
      }
      if (fbErr) console.error(`   [Erro Meta Ads]:`, fbErr.message);
      else console.log(`   [Sucesso] Meta Ads carregado!`);

      // 3. MOCK SEO (SEARCH CONSOLE)
      const gscTable = config.gsc_table_name || config.seo_table_name || `${config.name}_google_search_console_metrics`;
      const mockSeo = [];
      const keywords = [
        { kw: 'servicos de marketing ai', pos: 2.1, clicks: 85, imp: 1200 },
        { kw: 'como aumentar vendas no instagram', pos: 4.5, clicks: 45, imp: 950 },
        { kw: 'agencia marketing automacao digital', pos: 1.4, clicks: 120, imp: 800 },
        { kw: 'relatorios de trafego automaticos n8n', pos: 3.2, clicks: 60, imp: 650 },
        { kw: 'gestao de anuncios tráfego pago', pos: 5.8, clicks: 30, imp: 1100 },
        { kw: 'otimizacao seo para e-commerce', pos: 7.1, clicks: 18, imp: 540 },
        { kw: 'melhores ferramentas de analise de marketing', pos: 3.9, clicks: 50, imp: 720 },
        { kw: 'estrategia de conteudo digital 2026', pos: 6.2, clicks: 22, imp: 430 }
      ];
      const devices = ['MOBILE', 'DESKTOP', 'DESKTOP', 'TABLET', 'MOBILE'];
      dates.slice(0, 14).forEach((date, dateIdx) => {
        keywords.forEach((k, idx) => {
          const dev = devices[(idx + dateIdx) % devices.length];
          const varFactor = randomFloat(0.7, 1.3);
          mockSeo.push({
            client_id: config.id,
            metric_date: date,
            query: `[MOCK] ${k.kw}`,
            page: idx % 2 === 0 ? 'https://decsigner.com.br/servicos' : 'https://decsigner.com.br/blog',
            device: dev,
            country: 'BR',
            clicks: Math.max(1, Math.floor((k.clicks / 14) * varFactor)),
            impressions: Math.max(5, Math.floor((k.imp / 14) * varFactor)),
            position: randomFloat(Math.max(1.0, k.pos - 0.8), k.pos + 0.8)
          });
        });
      });
      console.log(` - Inserindo ${mockSeo.length} linhas de palavras-chave em ${gscTable}...`);
      await supabase.from(gscTable).delete().ilike('query', '%[MOCK]%');
      const { error: gscErr } = await supabase.from(gscTable).insert(mockSeo);
      if (gscErr) console.error(`   [Erro SEO]:`, gscErr.message);
      else console.log(`   [Sucesso] SEO (Search Console) carregado!`);
    }

    console.log('\n✅ DADOS DE TESTE INJETADOS COM SUCESSO! Você já pode abrir o painel em http://localhost:8080 e verificar!');
  } catch (e) {
    console.error('Erro na geração de dados mock:', e);
  }
}

seedTestData();
