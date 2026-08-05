import http from 'http';
import url from 'url';
import fs from 'fs';
import path from 'path';

// Helper para ler .env
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
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    process.env[key] = val;
  });
}

loadEnv();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌ ERRO: GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET precisam estar preenchidos no arquivo .env para gerar o token!');
  console.error('Por favor, abra o arquivo .env, cole seu Client ID e Client Secret nas variáveis e rode este comando novamente.\n');
  process.exit(1);
}

const PORT = 3333;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

// Escopos necessários para Google Ads, Google Search Console (SEO) e GA4
const SCOPES = [
  'https://www.googleapis.com/auth/adwords',
  'https://www.googleapis.com/auth/webmasters',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/analytics.readonly'
];

const params = new URLSearchParams({
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  response_type: 'code',
  scope: SCOPES.join(' '),
  access_type: 'offline',
  prompt: 'consent' // Força o Google a retornar um refresh_token
});

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

console.log('\n======================================================');
console.log('🚀 GERADOR AUTOMÁTICO DE REFRESH TOKEN DO GOOGLE');
console.log('======================================================');
console.log('\n1. Certifique-se de que a URI de redirecionamento HTTP "http://localhost:3333/oauth2callback" está adicionada nas autorizações do seu Client no Google Cloud.');
console.log('\n2. Abra o link abaixo no seu navegador para autorizar com a conta Google:');
console.log(`\n👉  ${authUrl}\n`);
console.log(`⏳ Aguardando autorização no navegador na porta local ${PORT}...`);

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = url.parse(req.url, true);
    if (reqUrl.pathname === '/oauth2callback') {
      const code = reqUrl.query.code;
      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>Erro: Nenhum código retornado pela autorização do Google.</h1>');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>✅ Autorização concluída com sucesso!</h1><p>Você já pode fechar esta aba do navegador e voltar para o terminal do seu editor.</p>');

      console.log('\n🔄 Código recebido com sucesso! Convertendo pelo Refresh Token com os servidores do Google...');
      
      // Trocar o code pelo access_token e refresh_token via fetch nativo do Node.js
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(code),
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code'
        }).toString()
      });

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        console.error('\n❌ Erro ao converter o token com o Google:', tokens.error_description || tokens.error);
        server.close();
        process.exit(1);
      }
      
      console.log('\n======================================================');
      console.log('🎉 SUCESSO! SEU REFRESH TOKEN FOI GERADO COM SUCESSO:');
      console.log('======================================================');
      console.log(`\nGOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"\n`);

      if (tokens.refresh_token) {
        // Atualizar o arquivo .env com o refresh token automaticamente
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, 'utf-8');
          if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
            envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=.*/g, `GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`);
          } else {
            envContent += `\nGOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`;
          }
          fs.writeFileSync(envPath, envContent, 'utf-8');
          console.log('✨ Incrível! Eu já salvei o seu GOOGLE_REFRESH_TOKEN automaticamente direto no seu arquivo .env!');
        }
      } else {
        console.log('⚠️ Atenção: O Google não retornou um refresh_token (isso costuma acontecer se você já havia autorizado antes e o prompt: consent foi ignorado).');
      }

      server.close();
      process.exit(0);
    }
  } catch (e) {
    console.error('Erro ao processar token:', e);
    res.end('Ocorreu um erro no servidor local. Veja o terminal.');
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  // Servidor escutando
});
