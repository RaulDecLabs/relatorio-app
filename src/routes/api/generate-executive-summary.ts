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

          const rm = body.rawMetrics || {};
          const totalCost = rm.consolidated?.totalCost || 0;
          const totalConversions = rm.consolidated?.totalConversions || 0;
          const totalClicks = rm.consolidated?.totalClicks || 0;
          const blendedCPL = rm.consolidated?.blendedCpa || 0;
          const totalRevenue = rm.totalRevenue || 0;
          const wonDealsLength = rm.wonDealsLength || 0;
          const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;
          const fbLeads = rm.meta_ads?.conversions || 0;
          const ga4Sessions = rm.ga4?.sessions || 0;

          // ────────── OpenAI ──────────
          let rawOpenaiApiKey = clientOpenaiKey || process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || (typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_OPENAI_API_KEY : undefined) || ''
          const openaiApiKey = rawOpenaiApiKey.trim().replace(/^['"\s`]+|['"\s`]+$/g, '')
          
          if (!openaiApiKey) {
            return new Response('OpenAI API Key not found. Please provide it or set VITE_OPENAI_API_KEY in your .env file.', { status: 500 })
          }

          const { default: OpenAI } = await import('openai')
          const openai = new OpenAI({ apiKey: openaiApiKey })

          const systemPrompt = `Você é um Estrategista Sênior de Employer Branding e Atração de Talentos. Você está assinando um Parecer Executivo para a diretoria do cliente — um documento altamente profissional, analítico e estratégico focado em recrutamento.

DIRETRIZES OBRIGATÓRIAS:
- NUNCA mencione que você é uma IA, modelo, sistema automatizado ou ChatGPT. Assuma 100% a postura de uma diretoria humana experiente.
- Use linguagem executiva, profissional, orientada a recrutamento e employer branding.
- Não foque em "ROI financeiro", mas sim em "Investimento", "Candidaturas/Leads", "Atração de Talentos", "Contratações/Vendas Fechadas" e "Praças" (Regiões).
- Seja preciso com os números: use os dados reais fornecidos. Tente inferir a quantidade de praças observando os nomes das campanhas (se houver siglas de estados ou cidades).
- Forneça recomendações acionáveis.
- O tom deve ser de consultoria premium: analítico e estratégico.`

          const userPrompt = `Analise os dados abaixo do cliente "${config.name}" referentes ao período de ${startDateStr} a ${endDateStr} (${days} dias) e gere um Parecer Executivo de Atração de Talentos.

DADOS CONSOLIDADOS:
${JSON.stringify(fullDataContext, null, 2)}

Responda EXCLUSIVAMENTE com um JSON válido (sem markdown, sem backticks) seguindo EXATAMENTE este schema:

{
  "executive_summary": {
    "headline": "Uma frase de impacto resumindo a captação de talentos no período (máx 15 palavras)",
    "total_investment": ${totalCost},
    "total_leads": ${totalConversions + fbLeads},
    "total_sales": ${wonDealsLength},
    "cpl": ${Math.round(blendedCPL * 100) / 100},
    "total_regions": 14,
    "digital_percentage": 100
  },
  "key_insights": [
    "Insight 1 sobre concentração de investimento e volume de candidaturas",
    "Insight 2 sobre a praça/região de maior destaque",
    "Insight 3 sobre a eficiência de custo por candidato (CPL)",
    "Insight 4 sobre ações de divulgação"
  ],
  "media_strategy": [
    { "title": "Pulverização geográfica", "description": "Análise de como as campanhas cobriram as praças necessárias." },
    { "title": "Ritmo contínuo e ágil", "description": "Análise do formato de investimento e ajustes de otimização." },
    { "title": "Geração de Candidatos Escalonável", "description": "Como os canais apoiaram o volume de leads." }
  ],
  "channel_performance": {
    "summary": "Resumo de 2-3 frases do desempenho geral de mídia na geração de candidatos.",
    "highlights": ["Destaque positivo 1", "Ponto de atenção 2"]
  },
  "business_impact": [
    { "title": "Visibilidade ampliada das vagas", "description": "Como a presença constante garantiu exposição." },
    { "title": "Atração de talentos mais ágil", "description": "Como o volume de leads encurta o ciclo." },
    { "title": "Uso eficiente do orçamento", "description": "Como a mídia direcionada evitou dispersão." }
  ],
  "next_steps": [
    { "title": "Integrar métricas de performance", "description": "Conectar relatórios ao controle de contratações.", "timeline": "Imediato" },
    { "title": "Padronizar registro por praça e vaga", "description": "Vincular investimento a códigos de vaga para calcular custo por contratação.", "timeline": "Próximo mês" },
    { "title": "Testar alocação orçamentária", "description": "Usar padrão das praças de maior demanda como base.", "timeline": "Próxima semana" }
  ]
}

IMPORTANTE:
- Para o campo 'total_regions', estime o número lendo os nomes das campanhas (conte cidades/estados únicos). Se não for possível, retorne 1.
- Use os valores numéricos EXATOS pré-calculados em executive_summary.
- Preencha os textos analíticos com base nos dados reais.`

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
