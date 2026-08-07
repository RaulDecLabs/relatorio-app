import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import ws from 'ws';

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = ws;
}

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) return;
    process.env[match[1].trim()] = match[2].trim().replace(/^['"\s`]+|['"\s`]+$/g, '');
  });
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function run() {
  const { data: configs } = await supabase.from('reports_config').select('*').eq('name', 'Multiperfil').single();
  const token = configs.rd_access_token;
  
  const fetch = globalThis.fetch;
  
  console.log('Testing GET /api/v1/deals with Bearer Auth...');
  let res = await fetch('https://crm.rdstation.com/api/v1/deals', {
    headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' }
  });
  console.log('Status:', res.status);
  let text = await res.text();
  console.log('Body:', text);
  
  console.log('\nTesting GET /api/v1/deals with token=... Auth...');
  res = await fetch('https://crm.rdstation.com/api/v1/deals?token=' + token, {
    headers: { 'Accept': 'application/json' }
  });
  console.log('Status:', res.status);
  text = await res.text();
  console.log('Body:', text);

  process.exit(0);
}
run().catch(console.error);
