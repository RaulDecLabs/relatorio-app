import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

async function testNectarCRM(apiToken) {
  if (!apiToken) {
    console.error("ERRO: Informe o Token do Nectar CRM!");
    return;
  }

  console.log("-----------------------------------------");
  console.log(`Testando API do Nectar CRM...`);
  
  try {
    // 1. Tentar buscar as etapas de funil (Pipeline)
    console.log("\nBuscando Funis de Vendas...");
    const funisRes = await fetch("https://app.nectarcrm.com.br/crm/api/1/funis", {
      headers: {
        "Api-Token": apiToken
      }
    });
    
    if (!funisRes.ok) {
       console.log(`❌ Erro ao buscar funis: ${funisRes.status} ${funisRes.statusText}`);
    } else {
       const funis = await funisRes.json();
       console.log(`✅ Sucesso! Encontrados ${funis.length} funis.`);
       console.log("Primeiro funil de exemplo:", JSON.stringify(funis[0], null, 2));
    }

    // 2. Tentar buscar Oportunidades dos últimos 7 dias
    console.log("\nBuscando Oportunidades criadas nos últimos 7 dias...");
    const date = new Date();
    date.setDate(date.getDate() - 7);
    const dataFiltro = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const dealsRes = await fetch(`https://app.nectarcrm.com.br/crm/api/1/oportunidades?dataCriacaoInicio=${dataFiltro}`, {
      headers: {
        "Api-Token": apiToken
      }
    });

    if (!dealsRes.ok) {
       console.log(`❌ Erro ao buscar oportunidades: ${dealsRes.status} ${dealsRes.statusText}`);
       const err = await dealsRes.text();
       console.log(err);
    } else {
       const deals = await dealsRes.json();
       console.log(`✅ Sucesso! Oportunidades recuperadas (Total: ${deals.total || (Array.isArray(deals) ? deals.length : 'Desconhecido')})`);
       
       const arrayDeals = deals.content || deals.items || deals;
       if (Array.isArray(arrayDeals) && arrayDeals.length > 0) {
         console.log("\nExemplo da primeira oportunidade (Estrutura):");
         console.log(JSON.stringify(arrayDeals[0], null, 2));
       } else {
         console.log("\nNenhuma oportunidade encontrada nos últimos 7 dias ou estrutura não reconhecida.");
       }
    }
    
  } catch (err) {
    console.error("❌ Exceção ocorrida ao chamar a API:", err);
  }
}

// Para testar, execute: node scripts/test-nectar-crm.js "SEU_TOKEN_AQUI"
const tokenArgument = process.argv[2];
testNectarCRM(tokenArgument);
