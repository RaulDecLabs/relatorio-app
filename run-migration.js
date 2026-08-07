import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

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

// Usually, the direct connection string is in .env as DATABASE_URL or something similar
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

async function run() {
  const client = new Client({
    connectionString: dbUrl,
  });

  await client.connect();

  const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/20260806165000_add_rd_events.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Running migration...');
  await client.query(sql);
  console.log('Migration successful!');

  await client.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
