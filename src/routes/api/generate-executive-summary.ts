import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

export const Route = createFileRoute('/api/generate-executive-summary')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { reportId, days = 7 } = body

          if (!reportId) {
            return new Response('Missing reportId', { status: 400 })
          }

          const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
          const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
          
          if (!SUPABASE_URL || !SUPABASE_KEY) {
            return new Response('Missing Supabase credentials', { status: 500 })
          }

          const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: { persistSession: false }
          })

          // 1. Obter configs do relatorio
          const { data: config, error: configError } = await supabase
            .from('reports_config')
            .select('*')
            .eq('id', reportId)
            .single()

          if (configError || !config) {
            return new Response('Report config not found', { status: 404 })
          }

          const endDate = new Date()
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - days)
          const endDateStr = endDate.toISOString().split('T')[0]
          const startDateStr = startDate.toISOString().split('T')[0]

          // 2. Coletar dados
          const fetchMetrics = async (tableName: string) => {
            if (!tableName) return []
            const { data } = await supabase
              .from(tableName)
              .select('*')
              .gte('metric_date', startDateStr)
              .lte('metric_date', endDateStr)
            return data || []
          }

          const [ga4, googleAds, metaAds, nectarDeals] = await Promise.all([
            fetchMetrics(config.table_name),
            fetchMetrics(config.ads_table_name),
            fetchMetrics(config.fb_ads_table_name),
            supabase.from('nectar_deals').select('*').eq('report_id', reportId).gte('created_at', startDateStr)
          ])

          // Consolidar Nectar
          const deals = nectarDeals.data || []
          const totalDeals = deals.length
          const wonDeals = deals.filter(d => d.status === 'Ganho')
          const totalRevenue = wonDeals.reduce((acc, d) => acc + (d.value || 0), 0)

          // Consolidar Ads
          const gAds = googleAds || []
          const totalGAdsCost = gAds.reduce((acc: number, r: any) => acc + (Number(r.cost) || 0), 0)
          const totalGAdsClicks = gAds.reduce((acc: number, r: any) => acc + (Number(r.clicks) || 0), 0)
          const totalGAdsConv = gAds.reduce((acc: number, r: any) => acc + (Number(r.conversions) || 0), 0)

          // Consolidar Meta
          const fbAds = metaAds || []
          const totalFbCost = fbAds.reduce((acc: number, r: any) => acc + (Number(r.spend) || 0), 0)
          const totalFbClicks = fbAds.reduce((acc: number, r: any) => acc + (Number(r.clicks) || 0), 0)
          const totalFbLeads = fbAds.reduce((acc: number, r: any) => acc + (Number(r.leads) || 0), 0)

          const totalCost = totalGAdsCost + totalFbCost
          const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0

          const dataContext = JSON.stringify({
            clientName: config.name,
            period: `${days} dias (${startDateStr} a ${endDateStr})`,
            totals: {
              investimento: totalCost,
              vendas: wonDeals.length,
              oportunidades: totalDeals,
              faturamento: totalRevenue,
              roi: roi
            },
            canais: {
              google_ads: { custo: totalGAdsCost, cliques: totalGAdsClicks, conversoes: totalGAdsConv },
              meta_ads: { custo: totalFbCost, cliques: totalFbClicks, leads: totalFbLeads }
            }
          })

          const openaiApiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY
          if (!openaiApiKey) {
            return new Response('OpenAI API Key not found', { status: 500 })
          }

          const openai = new OpenAI({ apiKey: openaiApiKey })

          const prompt = `Você é um analista sênior de growth e performance.
O cliente ${config.name} rodou campanhas de marketing nos últimos ${days} dias (${startDateStr} a ${endDateStr}).
Aqui estão os dados consolidados:
${dataContext}

Por favor, forneça uma análise executiva estruturada no formato JSON estrito, de acordo com o seguinte schema:
{
  "executive_summary": {
    "total_investment": number,
    "total_opportunities": number,
    "total_sales": number,
    "total_revenue": number,
    "roi": number
  },
  "key_insights": [
    "Insight impactante 1 com métrica",
    "Insight 2",
    "Insight 3"
  ],
  "strategic_reading": "Um parágrafo de 3 a 4 linhas explicando a leitura estratégica do desempenho do investimento frente aos resultados.",
  "business_impact": [
    { "title": "Impacto 1", "description": "Descrição curta 1" },
    { "title": "Impacto 2", "description": "Descrição curta 2" },
    { "title": "Impacto 3", "description": "Descrição curta 3" },
    { "title": "Impacto 4", "description": "Descrição curta 4" }
  ],
  "next_steps": [
    { "title": "Próximo passo 1", "description": "Ação 1" },
    { "title": "Próximo passo 2", "description": "Ação 2" },
    { "title": "Próximo passo 3", "description": "Ação 3" },
    { "title": "Próximo passo 4", "description": "Ação 4" }
  ]
}

Responda APENAS com o JSON, sem nenhuma formatação Markdown ao redor (\`\`\`json) e sem texto extra. Certifique-se de que é um JSON válido.`

          const chatCompletion = await openai.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'gpt-4o-mini',
            response_format: { type: "json_object" },
          })

          let responseJson = null
          try {
            const content = chatCompletion.choices[0].message.content
            if (content) {
              responseJson = JSON.parse(content)
            }
          } catch (e) {
            console.error('Failed to parse OpenAI JSON', e)
            return new Response('Invalid JSON from OpenAI', { status: 500 })
          }

          if (responseJson) {
            // Save to database
            const { error: insertError } = await supabase
              .from('executive_summaries')
              .insert({
                report_id: reportId,
                period_start: startDateStr,
                period_end: endDateStr,
                summary_data: responseJson
              })

            if (insertError) {
              console.error('Error inserting executive summary', insertError)
            }
          }

          return Response.json({ success: true, data: responseJson })
        } catch (error: any) {
          console.error('[Generate Executive Summary] Error:', error)
          return Response.json({ success: false, error: error.message }, { status: 500 })
        }
      }
    }
  }
})
