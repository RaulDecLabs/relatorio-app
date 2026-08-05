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
    const key = match[1].trim();
    let val = match[2].trim().replace(/^['"\s`]+|['"\s`]+$/g, '');
    process.env[key] = val;
  });
}

loadEnv();

function cleanEnv(val, fallback = undefined) {
  if (!val || typeof val !== 'string') return fallback;
  const cleaned = val.trim().replace(/^['"\s`]+|['"\s`]+$/g, '');
  return cleaned || fallback;
}

const defaultUrl = 'https://btdgetidtawjtqrvzybh.supabase.co';
const supabaseUrl = cleanEnv(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, defaultUrl);
const supabaseKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY);

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function clearMetrics() {
  try {
    console.log("Fetching reports configurations...");
    const { data: configs, error: configError } = await supabase
      .from('reports_config')
      .select('id, name, table_name, ads_table_name, fb_ads_table_name, gsc_table_name');

    if (configError) throw configError;

    if (!configs || configs.length === 0) {
      console.log("No reports configured.");
      return;
    }

    console.log(`Found ${configs.length} report configs. Starting deletion process...`);

    for (const config of configs) {
      console.log(`\nProcessing client: ${config.name}`);
      const tables = [
        config.table_name,
        config.ads_table_name,
        config.fb_ads_table_name,
        config.gsc_table_name
      ].filter(Boolean);

      for (const table of tables) {
        console.log(`  Deleting all rows from table: ${table}...`);
        
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); 

        if (deleteError) {
          console.warn(`    Warning: Could not delete from ${table}: ${deleteError.message}`);
        } else {
          console.log(`    Successfully cleared ${table}.`);
        }
      }
    }
    
    console.log("\nClearing ai_insights table (Parecer Executivo)...");
    const { error: aiErr } = await supabase.from('ai_insights').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (aiErr) {
      console.warn(`  Warning: Could not delete from ai_insights: ${aiErr.message}`);
    } else {
      console.log("  Successfully cleared ai_insights.");
    }

    console.log("\nAll metrics and insights clearing completed successfully!");
  } catch (error) {
    console.error("Error clearing metrics:", error);
  }
}


clearMetrics();
