import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

function cleanUrl(val: any): string | undefined {
  if (!val || typeof val !== 'string') return undefined;
  let cleaned = val.trim().replace(/^['"\\s`]+|['"\\s`]+$/g, '');
  try {
    const url = new URL(cleaned);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url.origin;
  } catch (e) {
    return undefined;
  }
}

function cleanKey(val: any): string | undefined {
  if (!val || typeof val !== 'string') return undefined;
  const cleaned = val.trim().replace(/^['"\\s`]+|['"\\s`]+$/g, '');
  return cleaned.length > 10 ? cleaned : undefined;
}

export const Route = createFileRoute('/api/generate-executive-summary')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { reportId, days = 7, startDateStr: clientStart, endDateStr: clientEnd } = body

          if (!reportId) {
            return new Response('Missing reportId', { status: 400 })
          }

          const defaultUrl = "https://btdgetidtawjtqrvzybh.supabase.co";
          const defaultKey = "sb_publishable_ajCs5VZ3suNt9i1DJBtW5w_UNqtw4xm";

          const SUPABASE_URL = cleanUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) || defaultUrl;
          const SUPABASE_KEY = cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY) || defaultKey;

          const { default: ws } = await import('ws')
          
          if (typeof globalThis.WebSocket === 'undefined' && typeof window === 'undefined') {
            (globalThis as any).WebSocket = ws;
          }

          const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: { persistSession: false },
            realtime: { transport: ws as any },
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

          let startDateStr = clientStart;
          let endDateStr = clientEnd;
          
          if (!startDateStr || !endDateStr) {
            const endDate = new Date()
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - days)
            endDateStr = endDate.toISOString().split('T')[0]
            startDateStr = startDate.toISOString().split('T')[0]
          }

          // 2. Coletar TODOS os dados disponíveis em paralelo
          const fetchMetrics = async (tableName: string) => {
            if (!tableName) return []
            const { data } = await supabase
              .from(tableName)
              .select('*')
              .gte('metric_date', startDateStr)
              .lte('metric_date', endDateStr)
            return data || []
          }

          const [ga4Raw, googleAdsRaw, metaAdsRaw, gscRaw, nectarResult] = await Promise.all([
            fetchMetrics(config.table_name),
            fetchMetrics(config.ads_table_name),
            fetchMetrics(config.fb_ads_table_name),
            fetchMetrics(config.gsc_table_name),
            supabase.from('nectar_deals').select('*').eq('report_id', reportId).gte('created_at', startDateStr)
          ])

          // ────────── GA4 ──────────
          const ga4 = ga4Raw || []
          const ga4Sessions = ga4.reduce((s: number, r: any) => s + (Number(r.sessions) || 0), 0)
          const ga4Users = ga4.reduce((s: number, r: any) => s + (Number(r.total_users) || 0), 0)
          const ga4PageViews = ga4.reduce((s: number, r: any) => s + (Number(r.page_views) || 0), 0)
          const ga4AvgDuration = ga4Sessions > 0
            ? ga4.reduce((s: number, r: any) => s + (Number(r.average_session_duration || 0) * Number(r.sessions || 0)), 0) / ga4Sessions
            : 0
          const ga4BounceRate = ga4.length > 0
            ? ga4.reduce((s: number, r: any) => s + (Number(r.bounce_rate || 0)), 0) / ga4.length
            : 0

          // ────────── Google Ads ──────────
          const gAds = googleAdsRaw || []
          const gAdsCost = gAds.reduce((s: number, r: any) => s + (Number(r.cost) || 0), 0)
          const gAdsClicks = gAds.reduce((s: number, r: any) => s + (Number(r.clicks) || 0), 0)
          const gAdsImpressions = gAds.reduce((s: number, r: any) => s + (Number(r.impressions) || 0), 0)
          const gAdsConversions = gAds.reduce((s: number, r: any) => s + (Number(r.conversions) || 0), 0)
          const gAdsCTR = gAdsImpressions > 0 ? (gAdsClicks / gAdsImpressions) * 100 : 0
          const gAdsCPC = gAdsClicks > 0 ? gAdsCost / gAdsClicks : 0
          const gAdsCPL = gAdsConversions > 0 ? gAdsCost / gAdsConversions : 0

          // Top campanhas Google Ads
          const gAdsCampaignMap: Record<string, any> = {}
          gAds.forEach((r: any) => {
            const name = r.campaign_name || 'Sem Nome'
            if (!gAdsCampaignMap[name]) gAdsCampaignMap[name] = { name, cost: 0, clicks: 0, impressions: 0, conversions: 0 }
            gAdsCampaignMap[name].cost += Number(r.cost) || 0
            gAdsCampaignMap[name].clicks += Number(r.clicks) || 0
            gAdsCampaignMap[name].impressions += Number(r.impressions) || 0
            gAdsCampaignMap[name].conversions += Number(r.conversions) || 0
          })
          const topGAdsCampaigns = Object.values(gAdsCampaignMap).sort((a: any, b: any) => b.cost - a.cost).slice(0, 5)

          // ────────── Meta Ads ──────────
          const fbAds = metaAdsRaw || []
          const fbCost = fbAds.reduce((s: number, r: any) => s + (Number(r.spend) || 0), 0)
          const fbClicks = fbAds.reduce((s: number, r: any) => s + (Number(r.clicks) || 0), 0)
          const fbImpressions = fbAds.reduce((s: number, r: any) => s + (Number(r.impressions) || 0), 0)
          const fbConversions = fbAds.reduce((s: number, r: any) => s + (Number(r.conversions) || 0), 0)
          const fbLeads = fbAds.reduce((s: number, r: any) => s + (Number(r.leads) || 0), 0)
          const fbCTR = fbImpressions > 0 ? (fbClicks / fbImpressions) * 100 : 0
          const fbCPC = fbClicks > 0 ? fbCost / fbClicks : 0
          const fbCPL = fbConversions > 0 ? fbCost / fbConversions : 0

          // Top campanhas Meta Ads
          const fbCampaignMap: Record<string, any> = {}
          fbAds.forEach((r: any) => {
            const name = r.campaign_name || 'Sem Nome'
            if (!fbCampaignMap[name]) fbCampaignMap[name] = { name, spend: 0, clicks: 0, impressions: 0, conversions: 0 }
            fbCampaignMap[name].spend += Number(r.spend) || 0
            fbCampaignMap[name].clicks += Number(r.clicks) || 0
            fbCampaignMap[name].impressions += Number(r.impressions) || 0
            fbCampaignMap[name].conversions += Number(r.conversions) || 0
          })
          const topFbCampaigns = Object.values(fbCampaignMap).sort((a: any, b: any) => b.spend - a.spend).slice(0, 5)

          // ────────── GSC (Search Console) ──────────
          const gsc = gscRaw || []
          const gscClicks = gsc.reduce((s: number, r: any) => s + (Number(r.clicks) || 0), 0)
          const gscImpressions = gsc.reduce((s: number, r: any) => s + (Number(r.impressions) || 0), 0)
          const gscCTR = gscImpressions > 0 ? (gscClicks / gscImpressions) * 100 : 0
          const gscAvgPosition = gsc.length > 0
            ? gsc.reduce((s: number, r: any) => s + (Number(r.position) || 0), 0) / gsc.length
            : 0

          // ────────── Nectar CRM ──────────
          const deals = nectarResult.data || []
          const totalDeals = deals.length
          const wonDeals = deals.filter((d: any) => d.status === 'Ganho')
          const lostDeals = deals.filter((d: any) => d.status === 'Perdido')
          const totalRevenue = wonDeals.reduce((s: number, d: any) => s + (Number(d.value) || 0), 0)
          const avgTicket = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0
          const winRate = totalDeals > 0 ? (wonDeals.length / totalDeals) * 100 : 0

          // ────────── Consolidado ──────────
          const totalCost = gAdsCost + fbCost
          const totalConversions = gAdsConversions + fbConversions
          const totalClicks = gAdsClicks + fbClicks
          const totalImpressions = gAdsImpressions + fbImpressions
          const blendedCPL = totalConversions > 0 ? totalCost / totalConversions : 0
          const blendedCPC = totalClicks > 0 ? totalCost / totalClicks : 0
          const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0

          // ────────── Montar contexto completo para a IA ──────────
          const fullDataContext = {
            cliente: config.name,
            periodo: `${startDateStr} a ${endDateStr} (${days} dias)`,
            
            resumo_consolidado: {
              investimento_total: totalCost,
              conversoes_totais: totalConversions,
              cliques_totais: totalClicks,
              impressoes_totais: totalImpressions,
              cpl_medio: blendedCPL,
              cpc_medio: blendedCPC,
              roi_percentual: roi,
              receita_vendas: totalRevenue,
            },

            google_ads: {
              investimento: gAdsCost,
              cliques: gAdsClicks,
              impressoes: gAdsImpressions,
              conversoes: gAdsConversions,
              ctr: gAdsCTR,
              cpc_medio: gAdsCPC,
              cpl: gAdsCPL,
              top_campanhas: topGAdsCampaigns,
            },

            meta_ads: {
              investimento: fbCost,
              cliques: fbClicks,
              impressoes: fbImpressions,
              conversoes: fbConversions,
              leads: fbLeads,
              ctr: fbCTR,
              cpc_medio: fbCPC,
              cpl: fbCPL,
              top_campanhas: topFbCampaigns,
            },

            seo_search_console: {
              cliques_organicos: gscClicks,
              impressoes: gscImpressions,
              ctr_organico: gscCTR,
              posicao_media: gscAvgPosition,
            },

            website_ga4: {
              sessoes: ga4Sessions,
              usuarios_unicos: ga4Users,
              pageviews: ga4PageViews,
              tempo_medio_sessao_segundos: ga4AvgDuration,
              taxa_rejeicao: ga4BounceRate,
            },

            crm_nectar: {
              total_oportunidades: totalDeals,
              vendas_ganhas: wonDeals.length,
              vendas_perdidas: lostDeals.length,
              receita_total: totalRevenue,
              ticket_medio: avgTicket,
              taxa_conversao_crm: winRate,
            }
          }

          // ────────── OpenAI ──────────
          let rawOpenaiApiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || ''
          const openaiApiKey = rawOpenaiApiKey.trim().replace(/^['"\\s`]+|['"\\s`]+$/g, '')
          
          if (!openaiApiKey) {
            return new Response('OpenAI API Key not found', { status: 500 })
          }

          const { default: OpenAI } = await import('openai')
          const openai = new OpenAI({ apiKey: openaiApiKey })

          const systemPrompt = `Você é o Diretor Sênior de Growth Marketing e Estratégia Digital de uma agência de publicidade de elite. Você está assinando um Parecer Executivo para a diretoria do cliente — um documento altamente profissional, analítico e estratégico.

DIRETRIZES OBRIGATÓRIAS:
- NUNCA mencione que você é uma IA, modelo, sistema automatizado ou ChatGPT. Assuma 100% a postura de uma diretoria humana experiente.
- Use linguagem executiva, profissional, confiante e orientada a resultados.
- Seja preciso com os números: use os dados reais fornecidos, não invente métricas.
- Quando um canal não tiver dados (valor 0), mencione que não houve atividade naquele canal no período, sem inventar análises.
- Forneça recomendações acionáveis e específicas, citando métricas concretas.
- O tom deve ser de consultoria premium: analítico, motivador quando houver bons resultados, e construtivamente crítico quando houver oportunidades de melhoria.
- Escreva em português brasileiro impecável.`

          const userPrompt = `Analise os dados abaixo do cliente "${config.name}" referentes ao período de ${startDateStr} a ${endDateStr} (${days} dias) e gere um Parecer Executivo completo.

DADOS CONSOLIDADOS:
${JSON.stringify(fullDataContext, null, 2)}

Responda EXCLUSIVAMENTE com um JSON válido (sem markdown, sem backticks) seguindo EXATAMENTE este schema:

{
  "executive_summary": {
    "headline": "Uma frase de impacto de 1 linha resumindo o desempenho geral do período (máximo 15 palavras)",
    "total_investment": ${totalCost},
    "total_leads": ${totalConversions + fbLeads},
    "total_sales": ${wonDeals.length},
    "total_revenue": ${totalRevenue},
    "roi": ${Math.round(roi * 10) / 10},
    "cpl": ${Math.round(blendedCPL * 100) / 100},
    "total_sessions": ${ga4Sessions},
    "total_clicks": ${totalClicks}
  },
  "key_insights": [
    "Insight impactante 1 citando métrica concreta do período",
    "Insight 2 com dado real",
    "Insight 3 com comparação ou destaque",
    "Insight 4 relevante para a diretoria",
    "Insight 5 sobre oportunidade de melhoria"
  ],
  "channel_analysis": {
    "google_ads": {
      "summary": "Análise detalhada de 2-3 frases sobre o desempenho do Google Ads, citando investimento, conversões, CPC, CTR e performance das campanhas principais.",
      "highlights": ["Destaque positivo 1", "Destaque positivo ou de atenção 2"],
      "recommendation": "Uma recomendação acionável e específica para otimizar o Google Ads"
    },
    "meta_ads": {
      "summary": "Análise detalhada de 2-3 frases sobre o desempenho do Meta Ads/Facebook Ads, citando investimento, leads, CPL, CTR e performance.",
      "highlights": ["Destaque 1", "Destaque 2"],
      "recommendation": "Uma recomendação acionável para o Meta Ads"
    },
    "seo": {
      "summary": "Análise de 2-3 frases sobre o tráfego orgânico via Search Console, citando cliques, impressões e posição média.",
      "highlights": ["Destaque 1"],
      "recommendation": "Uma recomendação para SEO"
    },
    "website": {
      "summary": "Análise de 2-3 frases sobre o comportamento no site via GA4, citando sessões, usuários, pageviews e tempo médio.",
      "highlights": ["Destaque 1"],
      "recommendation": "Uma recomendação para melhorar a experiência no site"
    }
  },
  "funnel_analysis": {
    "top": "Análise do topo de funil em 2-3 frases: alcance, impressões totais e awareness gerado.",
    "middle": "Análise do meio de funil em 2-3 frases: cliques, engajamento, sessões e interesse gerado.",
    "bottom": "Análise do fundo de funil em 2-3 frases: conversões, leads qualificados, vendas e receita."
  },
  "strategic_reading": "Um parágrafo analítico profundo de 4-5 linhas explicando a leitura estratégica consolidada do período: o que o investimento gerou, como os canais se complementaram, onde estão os gargalos e qual a perspectiva para o próximo ciclo.",
  "business_impact": [
    { "title": "Impacto 1", "description": "Descrição de como este resultado impacta o negócio", "type": "positive" },
    { "title": "Impacto 2", "description": "Descrição", "type": "positive" },
    { "title": "Impacto 3", "description": "Descrição", "type": "warning" },
    { "title": "Impacto 4", "description": "Descrição", "type": "neutral" }
  ],
  "recommendations": [
    { "title": "Recomendação 1", "description": "Detalhamento acionável e específico", "priority": "alta", "channel": "Google Ads" },
    { "title": "Recomendação 2", "description": "Detalhamento", "priority": "alta", "channel": "Meta Ads" },
    { "title": "Recomendação 3", "description": "Detalhamento", "priority": "media", "channel": "SEO" },
    { "title": "Recomendação 4", "description": "Detalhamento", "priority": "media", "channel": "Geral" }
  ],
  "next_steps": [
    { "title": "Passo 1", "description": "Ação detalhada", "timeline": "Imediato" },
    { "title": "Passo 2", "description": "Ação detalhada", "timeline": "Próxima semana" },
    { "title": "Passo 3", "description": "Ação detalhada", "timeline": "Próximo mês" },
    { "title": "Passo 4", "description": "Ação detalhada", "timeline": "Próximo mês" }
  ]
}

IMPORTANTE:
- Use os valores numéricos EXATOS fornecidos em executive_summary (já foram pré-calculados).
- Preencha os textos analíticos com base nos dados reais.
- O headline deve ser impactante e resumir o período em uma frase.
- Os insights devem citar números reais.
- As recomendações devem ser práticas e acionáveis.
- O type em business_impact pode ser: "positive", "warning" ou "neutral".
- A priority em recommendations pode ser: "alta", "media" ou "baixa".
- A timeline em next_steps pode ser: "Imediato", "Próxima semana" ou "Próximo mês".`

          const chatCompletion = await openai.chat.completions.create({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            model: 'gpt-4o-mini',
            response_format: { type: "json_object" },
            temperature: 0.4,
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

          // Salvar métricas brutas junto com a análise para exibição direta
          if (responseJson) {
            responseJson._raw_metrics = {
              google_ads: { cost: gAdsCost, clicks: gAdsClicks, impressions: gAdsImpressions, conversions: gAdsConversions, ctr: gAdsCTR, cpc: gAdsCPC, cpl: gAdsCPL },
              meta_ads: { cost: fbCost, clicks: fbClicks, impressions: fbImpressions, conversions: fbConversions, leads: fbLeads, ctr: fbCTR, cpc: fbCPC, cpl: fbCPL },
              gsc: { clicks: gscClicks, impressions: gscImpressions, ctr: gscCTR, position: gscAvgPosition },
              ga4: { sessions: ga4Sessions, users: ga4Users, pageviews: ga4PageViews, avgDuration: ga4AvgDuration, bounceRate: ga4BounceRate },
              crm: { deals: totalDeals, won: wonDeals.length, lost: lostDeals.length, revenue: totalRevenue, avgTicket, winRate },
              consolidated: { totalCost, totalConversions, totalClicks, totalImpressions, blendedCPL, blendedCPC, roi }
            }

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
