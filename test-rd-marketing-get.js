import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import ws from 'ws';

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = ws;
}

// Load .env if exists (for local runs)
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

// Base URL for RD Station Marketing API (the platform version)
const BASE_URL = 'https://api.rd.services/platform';

// List of GET endpoints we want to test. The paths are relative to BASE_URL.
const endpoints = [
  '/contacts',                 // List contacts
  '/custom_fields',            // List custom fields
  '/webhooks',                 // List webhooks
  '/account',                  // Account information
  '/conversions',              // Conversions (basic)
  '/lead_events',              // Lead events (if available)
  '/forms',                    // List forms
  '/landing_pages',            // List landing pages
];

async function getToken() {
  const { data, error } = await supabase
    .from('reports_config')
    .select('rd_access_token')
    .eq('name', 'Multiperfil')
    .maybeSingle();
  if (error) throw new Error('Supabase error: ' + error.message);
  if (!data?.rd_access_token) throw new Error('rd_access_token not found in reports_config');
  return data.rd_access_token;
}

async function testEndpoints() {
  const token = await getToken();
  console.log('Testing RD Station Marketing GET endpoints with token length:', token.length);

  for (const ep of endpoints) {
    const url = `${BASE_URL}${ep}`;
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      const text = await res.text();
      console.log('\n===', ep, '===');
      console.log('Status:', res.status);
      console.log('Body (truncated 200 chars):', text.slice(0, 200));
    } catch (e) {
      console.error('Error fetching', ep, e);
    }
  }
  process.exit(0);
}

testEndpoints().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
