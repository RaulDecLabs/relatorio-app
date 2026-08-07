import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

const supabase = createClient(process.env.SUPABASE_URL || 'https://btdgetidtawjtqrvzybh.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase.from('reports_config').select('name, rd_public_token, rd_private_token');
  if (error) {
    console.error('Erro:', error);
    return;
  }
  console.log('Clientes encontrados:', data?.length);
  data.forEach(x => {
    console.log(`Cliente: ${x.name}`);
    console.log(`Public Token Len: ${x.rd_public_token ? x.rd_public_token.length : 'null'}, valor_parcial: ${x.rd_public_token ? x.rd_public_token.substring(0, 10) + '...' : 'null'}`);
    console.log(`Private Token Len: ${x.rd_private_token ? x.rd_private_token.length : 'null'}, valor_parcial: ${x.rd_private_token ? x.rd_private_token.substring(0, 10) + '...' : 'null'}`);
  });
}

test();
