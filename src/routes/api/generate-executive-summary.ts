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
          const { reportId, activeReport, days = 7, startDateStr: clientStart, endDateStr: clientEnd, openaiApiKey: clientOpenaiKey, fullDataContext } = body

          if (!reportId || !activeReport || !fullDataContext) {
            return new Response('Missing reportId, activeReport, or fullDataContext data', { status: 400 })
          }

          const defaultUrl = "https://btdgetidtawjtqrvzybh.supabase.co";
          const defaultKey = "sb_publishable_ajCs5VZ3suNt9i1DJBtW5w_UNqtw4xm";

          const SUPABASE_URL = cleanUrl(
            process.env.SUPABASE_URL || 
            process.env.VITE_SUPABASE_URL ||
            (typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_SUPABASE_URL : undefined)
          ) || defaultUrl;
          
          const SUPABASE_KEY = cleanKey(
            process.env.SUPABASE_SERVICE_ROLE_KEY || 
            process.env.SUPABASE_PUBLISHABLE_KEY || 
            process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
            (typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY : undefined)
          ) || defaultKey;

          const authHeader = request.headers.get('Authorization')

          const { default: ws } = await import('ws')
          
          if (typeof globalThis.WebSocket === 'undefined' && typeof window === 'undefined') {
            (globalThis as any).WebSocket = ws;
          }

          const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: { persistSession: false },
            global: { headers: authHeader ? { Authorization: authHeader } : {} },
            realtime: { transport: ws as any },
          })

          const config = activeReport;

          let startDateStr = clientStart;
          let endDateStr = clientEnd;
          
          if (!startDateStr || !endDateStr) {
            const endDate = new Date()
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - days)
            endDateStr = endDate.toISOString().split('T')[0]
            startDateStr = startDate.toISOString().split('T')[0]
          }

          const { totalCost = 0, totalConversions = 0, totalClicks = 0, totalImpressions = 0, blendedCPL = 0, blendedCPC = 0, roi = 0, totalRevenue = 0, fbLeads = 0, ga4Sessions = 0, wonDealsLength = 0 } = body.rawMetrics || {};

          // ────────── OpenAI ──────────
          let rawOpenaiApiKey = clientOpenaiKey || process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || (typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_OPENAI_API_KEY : undefined) || ''
          const openaiApiKey = rawOpenaiApiKey.trim().replace(/^['"\s`]+|['"\s`]+$/g, '')
          
          if (!openaiApiKey) {
            return new Response('OpenAI API Key not found. Please provide it or set VITE_OPENAI_API_KEY in your .env file.', { status: 500 })
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
    "total_sales": ${wonDealsLength},
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
            responseJson._raw_metrics = body.rawMetrics || {}

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
