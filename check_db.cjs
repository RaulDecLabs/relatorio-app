const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  if (line.includes('=')) {
    const [key, ...rest] = line.split('=');
    acc[key.trim()] = rest.join('=').trim();
  }
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('rd_events').select('*');
  console.log(JSON.stringify(data, null, 2));
}
run();
