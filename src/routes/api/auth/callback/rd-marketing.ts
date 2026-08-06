import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

export const Route = createFileRoute('/api/auth/callback/rd-marketing')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        
        if (!code || !state) {
          return new Response('Code ou State (report_id) ausente', { status: 400 })
        }
        
        try {
          const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://btdgetidtawjtqrvzybh.supabase.co'
          const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
          
          const { data: config, error } = await supabase.from('reports_config').select('rd_client_id, rd_client_secret').eq('id', state).maybeSingle()
          
          if (error) {
            return new Response('Erro ao consultar banco no callback: ' + error.message, { status: 500 })
          }

          const clientId = config?.rd_client_id || process.env.RD_CLIENT_ID
          const clientSecret = config?.rd_client_secret || process.env.RD_CLIENT_SECRET
          const redirectUri = `${url.origin}/api/auth/callback/rd-marketing`
          
          if (!clientId || !clientSecret) {
            return new Response('Client ID ou Secret não encontrados. Configure para este cliente ou como variável global (.env).', { status: 400 })
          }
          
          const res = await fetch('https://api.rd.services/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: clientId,
              client_secret: clientSecret,
              code,
              redirect_uri: redirectUri
            })
          })
          
          const tokens = await res.json()
          if (!res.ok || tokens.errors) {
            console.error('[RD Marketing OAuth Callback Erro]', tokens)
            return new Response(`Falha ao trocar código de autorização RD Station: ${JSON.stringify(tokens)}`, { status: 400 })
          }
          
          const { access_token, refresh_token } = tokens
          
          // Salva os tokens permanentemente no banco associados à conta
          await supabase.from('reports_config').update({
            rd_access_token: access_token,
            rd_refresh_token: refresh_token
          }).eq('id', state)
          
          // Redireciona o usuário de volta para a dashboard!
          return new Response(null, {
            status: 302,
            headers: { Location: '/reports' }
          })
          
        } catch (err: any) {
          console.error(err)
          return new Response('Erro interno no callback do RD Station: ' + err.message + '\n' + err.stack, { status: 500 })
        }
      }
    }
  }
})
