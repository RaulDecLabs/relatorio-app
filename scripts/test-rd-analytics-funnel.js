import { execSync } from 'child_process';
import fetch from 'node-fetch';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

async function run() {
  // Fetch active report configuration to get RD tokens
  const res = await fetch(SUPABASE_URL + '/rest/v1/reports_config?select=rd_public_token,rd_private_token,rd_client_id,rd_client_secret,rd_access_token,rd_refresh_token&limit=1', {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY
    }
  });
  const data = await res.json();
  
  if (!data || data.length === 0) {
    console.log("No config found.");
    return;
  }
  
  const config = data[0];
  let accessToken = config.rd_access_token;
  
  if (!accessToken) {
    console.log("No OAuth access token found in DB.");
    return;
  }
  
  const startDate = "2026-08-01";
  const endDate = "2026-08-07";
  const url = `https://api.rd.services/platform/analytics/funnel?start_date=${startDate}&end_date=${endDate}`;
  
  console.log("Testing RD Analytics Funnel API...");
  console.log("URL:", url);
  
  const req = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json"
    }
  });
  
  console.log("Status:", req.status);
  
  if (!req.ok) {
    const errorText = await req.text();
    console.log("Error response:", errorText);
  } else {
    const responseData = await req.json();
    console.log("Success! Data:", JSON.stringify(responseData, null, 2));
  }
}

run().catch(console.error);
