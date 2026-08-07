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

async function run() {
  const { data, error } = await supabase
    .from('reports_config')
    .select('rd_access_token')
    .eq('name', 'Multiperfil')
    .maybeSingle();
    
  if (error || !data) {
    console.error('Error getting token:', error);
    process.exit(1);
  }

  const token = data.rd_access_token;
  // Format dates: start_date=2024-01-01, end_date=2024-01-31
  const url = 'https://api.rd.services/platform/analytics/conversions?start_date=2024-01-01&end_date=2024-01-31';

  console.log('Testando GET', url);
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });

  console.log('Status Code:', res.status);
  const text = await res.text();
  console.log('Response Body:', text);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
