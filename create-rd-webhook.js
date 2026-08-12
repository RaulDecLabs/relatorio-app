import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import ws from 'ws';

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = ws;
}

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    env.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...rest] = trimmed.split('=');
      process.env[key] = rest.join('=').replace(/^['"`\s]+|['"`\s]+$/g, '');
    });
  }
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

const WEBHOOK_URL = 'https://relatorios.decsigner.com.br/api/webhooks/rd-station';
const INGEST_SECRET = process.env.INGEST_HMAC_SECRET;

async function registerWebhook(token, reportId, eventType) {
  if (!INGEST_SECRET) {
    console.error('INGEST_HMAC_SECRET nao configurado no .env — necessario pra assinar a URL do webhook.');
    process.exit(1);
  }

  const url = 'https://api.rd.services/platform/webhooks';

  // The event types can be WEBHOOK.CONVERTED, WEBHOOK.OPPORTUNITY, WEBHOOK.SALE
  const payload = {
    event_type: eventType,
    url: `${WEBHOOK_URL}?report_id=${reportId}&secret=${encodeURIComponent(INGEST_SECRET)}`
  };

  console.log(`Registering ${eventType}...`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const status = res.status;
  const text = await res.text();
  console.log(`Status: ${status} | Response: ${text}`);
}

async function run() {
  const { data, error } = await supabase
    .from('reports_config')
    .select('id, rd_access_token')
    .eq('name', 'Multiperfil')
    .maybeSingle();
    
  if (error || !data) {
    console.error('Error getting config:', error);
    process.exit(1);
  }

  const token = data.rd_access_token;
  const reportId = data.id;

  // We want to capture Leads, Opportunities, and Sales
  const eventTypes = ['WEBHOOK.CONVERTED', 'WEBHOOK.OPPORTUNITY', 'WEBHOOK.SALE'];
  
  for (const event of eventTypes) {
    await registerWebhook(token, reportId, event);
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
