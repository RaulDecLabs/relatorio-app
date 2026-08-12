import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { verifyImportSecret } from '@/lib/verify-import-secret'

export const Route = createFileRoute('/api/webhooks/rd-station')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if (!verifyImportSecret(request)) {
            return new Response('Unauthorized', { status: 401 })
          }

          const url = new URL(request.url)
          const reportId = url.searchParams.get('report_id')

          if (!reportId) {
            return new Response('Missing report_id in query params', { status: 400 })
          }

          const payload = await request.json()

          // Inicializar Supabase
          const cleanStr = (val: any) => typeof val === 'string' ? val.trim().replace(/^['"\s`]+|['"\s`]+$/g, '') : undefined;
          const SUPABASE_URL = cleanStr(process.env.SUPABASE_URL) || cleanStr(process.env.VITE_SUPABASE_URL) || 'https://btdgetidtawjtqrvzybh.supabase.co';
          const SUPABASE_SERVICE_ROLE_KEY = cleanStr(process.env.SUPABASE_SERVICE_ROLE_KEY) || cleanStr(process.env.VITE_SUPABASE_PUBLISHABLE_KEY) || '';
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

          // Verifica o tipo de evento. A RD envia no array "leads".
          // Pode ter informações de conversão, oportunidade, ou venda dependendo de como o webhook foi criado.
          // O tipo do webhook geralmente não vem explicitamente no payload de forma fácil a não ser nos arrays.
          // Mas podemos classificar com base na existência de "opportunity" ou dados de "conversion".
          
          const leads = payload.leads || []
          
          for (const lead of leads) {
            let eventType = 'CONVERSION' // Default
            
            // Verifica oportunidade
            // Dependendo do gatilho configurado na RD, o array pode conter 'lead_stage' ou vir com campos de opportunity
            if (lead.opportunity === true || lead.lifecycle_stage === 'Opportunity') {
                eventType = 'OPPORTUNITY'
            }
            
            // Verifica venda (muitas vezes se vem com valor de venda ou estágio "Client")
            if (lead.fit_score && lead.interest === 'Client' || lead.lifecycle_stage === 'Client') {
                eventType = 'SALE'
            }
            
            const leadEmail = lead.email

            // Salvar no banco
            const { error } = await supabase.from('rd_events').insert({
              report_id: reportId,
              event_type: eventType,
              lead_email: leadEmail,
              payload: lead
            })

            if (error) {
              console.error('Erro ao salvar lead no Supabase:', error)
              // Continuamos processando os demais mesmo se um der erro
            }
          }

          return new Response(JSON.stringify({ success: true, received: leads.length }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
          
        } catch (err: any) {
          console.error('Webhook error:', err)
          return new Response(JSON.stringify({ error: err.message }), { status: 500 })
        }
      }
    }
  }
})
