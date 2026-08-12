import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { verifyImportSecret } from '@/lib/verify-import-secret'
import { signState } from '@/lib/rd-marketing-state'

export const Route = createFileRoute('/api/auth/login/rd-marketing')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!verifyImportSecret(request)) {
          return new Response('Unauthorized', { status: 401 })
        }

        const url = new URL(request.url)
        const reportId = url.searchParams.get('report_id')

        if (!reportId) {
          return new Response('report_id is required', { status: 400 })
        }
        try {
          const cleanStr = (val: any) => typeof val === 'string' ? val.trim().replace(/^['"\s`]+|['"\s`]+$/g, '') : undefined;
          const SUPABASE_URL = cleanStr(process.env.SUPABASE_URL) || cleanStr(process.env.VITE_SUPABASE_URL) || 'https://btdgetidtawjtqrvzybh.supabase.co';
          const SUPABASE_SERVICE_ROLE_KEY = cleanStr(process.env.SUPABASE_SERVICE_ROLE_KEY) || cleanStr(process.env.VITE_SUPABASE_PUBLISHABLE_KEY) || '';
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          
          const { data: config, error } = await supabase.from('reports_config').select('rd_client_id').eq('id', reportId).maybeSingle()
          
          if (error) {
            return new Response('Erro ao consultar banco de dados: ' + error.message, { status: 500 })
          }
          
          const clientId = config?.rd_client_id || cleanStr(process.env.RD_CLIENT_ID)
          if (!clientId) {
            return new Response('Client ID do RD Station não configurado no banco de dados para este cliente e nem como global no .env do servidor.', { status: 400 })
          }
          
          const redirectUri = `${url.origin}/api/auth/callback/rd-marketing`
          const state = signState(reportId)
          const rdAuthUrl = `https://api.rd.services/auth/dialog?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`
          
          return new Response(null, {
            status: 302,
            headers: { Location: rdAuthUrl }
          })
        } catch (err: any) {
          return new Response('Internal Server Error: ' + err.message + '\n' + err.stack, { status: 500 })
        }
      }
    }
  }
})
