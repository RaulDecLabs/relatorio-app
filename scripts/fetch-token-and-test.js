import { execSync } from 'child_process';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase variables in .env');
  process.exit(1);
}

fetch(SUPABASE_URL + '/rest/v1/reports_config?select=nectar_api_token&nectar_api_token=not.is.null&limit=1', {
  headers: {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY
  }
}).then(r => r.json()).then(data => {
  if (data && data.length > 0 && data[0].nectar_api_token) {
    const token = data[0].nectar_api_token;
    console.log('Token encontrado no banco de dados. Testando a API do Nectar CRM...');
    execSync(`node --env-file=.env scripts/test-nectar-crm.js "${token}"`, { stdio: 'inherit' });
  } else {
    console.log('Nenhum token encontrado no banco de dados!');
  }
}).catch(console.error);
