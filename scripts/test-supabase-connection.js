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

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERRO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos no arquivo .env.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function testSupabase() {
  console.log('Testando conexão com o Supabase...');
  try {
    const { data, error } = await supabase.from('reports_config').select('*');
    if (error) throw error;

    console.log('\n✅ CONEXÃO COM O SUPABASE REALIZADA COM SUCESSO!');
    console.log(`Clientes cadastrados: ${data.length}`);
    data.forEach(c => {
      console.log(`- ${c.name} (Tabela: ${c.table_name}, GA4 ID: ${c.ga4_property_id || 'Não configurado'})`);
    });
  } catch (err) {
    console.error('\n❌ ERRO DE AUTENTICAÇÃO COM O SUPABASE:');
    console.error(err.message);
  }
}

testSupabase();
