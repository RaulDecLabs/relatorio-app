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
          const totalLeads = rm.consolidated?.totalLeads || 0;
          const blendedCPL = rm.consolidated?.blendedCpa || 0;
          const totalRevenue = rm.totalRevenue || 0;
          const wonDealsLength = rm.wonDealsLength || 0;

          // ────────── OpenAI ──────────
          let rawOpenaiApiKey = clientOpenaiKey || process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || (typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_OPENAI_API_KEY : undefined) || ''
          const openaiApiKey = rawOpenaiApiKey.trim().replace(/^['"\s`]+|['"\s`]+$/g, '')
          
          if (!openaiApiKey) {
            return new Response('OpenAI API Key not found. Please provide it or set VITE_OPENAI_API_KEY in your .env file.', { status: 500 })
          }

          const { default: OpenAI } = await import('openai')
          const openai = new OpenAI({ apiKey: openaiApiKey })

          const systemPrompt = `Você é um Estrategista Sênior de Employer Branding e Atração de Talentos. Você está assinando um Parecer Executivo para a diretoria do cliente — um documento altamente profissional, analítico e estratégico focado em recrutamento e mídia.

DIRETRIZES OBRIGATÓRIAS:
- NUNCA mencione que você é uma IA, modelo, sistema automatizado ou ChatGPT. Assuma 100% a postura de uma diretoria humana experiente da agência.
- Use linguagem executiva, profissional, orientada a recrutamento, captação e employer branding.
- É TOTALMENTE PROIBIDO usar a palavra "ROI" ou termos como "Retorno sobre Investimento", "perda de investimento", "perda total", ou "lucro". O foco exclusivo é atração de candidatos, volume de leads e eficiência de custo por candidato (CPL).
- Se as contratações/vendas fechadas no CRM forem 0, limite-se a dizer que não foram registradas contratações no período analítico, sem associar isso a "perda de investimento" ou "retorno negativo".
- Seja preciso com os números: use os dados reais fornecidos. Tente inferir a quantidade de praças observando os nomes das campanhas (se houver siglas de estados ou cidades).
- Nunca invente números. Se um dado não estiver disponível, apenas não o mencione ou indique como limitação no texto analítico.
- Adapte o tom: se a performance de captação for ruim (CPL alto ou zero leads), sinalize necessidade de otimização de criativos e segmentação; se for boa, sinalize ganho e oportunidade de escalar.
- Identifique outliers: a campanha/canal com pior custo por resultado e a com melhor custo devem aparecer nomeados no texto.
- O tom deve ser de consultoria premium: analítico e estratégico.`

          const userPrompt = `Analise os dados abaixo do cliente "${config.name}" referentes ao período de ${startDateStr} a ${endDateStr} (${days} dias) e gere um Parecer Executivo de Atração de Talentos.

DADOS CONSOLIDADOS:
${JSON.stringify(fullDataContext, null, 2)}

Responda EXCLUSIVAMENTE com um JSON válido (sem markdown, sem backticks) seguindo EXATAMENTE este schema estrutural e preenchendo as chaves com suas análises:

{
  "executive_summary": {
    "headline": "Uma frase de impacto resumindo a captação de talentos no período (máx 15 palavras)",
    "total_investment": ${totalCost},
    "total_leads": ${totalLeads},
    "total_sales": ${wonDealsLength},
    "cpl": ${Math.round(blendedCPL * 100) / 100},
    "total_regions": 0 // ESTIME O NÚMERO DE PRAÇAS LENDO OS NOMES DAS CAMPANHAS. SE NÃO ACHAR, RETORNE 1.
  },
  "key_insights": [
    "Insight 1 citando investimento vs resultado de leads (ex: volume de candidatos gerados)",
    "Insight 2 sobre a praça/região de maior destaque ou o canal de melhor CPL",
    "Insight 3 identificando algum gargalo ou ponto positivo claro na captação (sem nunca usar a palavra ROI)"
  ],
  "channel_investment_insight": "Insight-frase de destaque sobre como o investimento está distribuído (ex: 'X% do investimento concentrado em Meta Ads para atração')",
  "regional_insight": "Parágrafo curto de Leitura Estratégica sobre as regiões impactadas e a distribuição geográfica.",
  "evolution_insight": "Insight sobre o pico de investimento ou o ritmo diário das ações.",
  "media_strategy": [
    { "title": "Pulverização geográfica", "description": "Análise de como as campanhas cobriram as praças necessárias." },
    { "title": "Ritmo contínuo e ágil", "description": "Análise do formato de investimento e ajustes de otimização." },
    { "title": "Geração de Candidatos Escalonável", "description": "Como os canais apoiaram o volume de leads." }
  ],
  "campaign_attention_point": "Insight de IA identificando a campanha com pior custo/resultado (ex: 'Atibaia/SP: R$1.176,04 gerou apenas 1 lead. Necessidade de revisão na segmentação.')",
  "business_impact": [
    { "title": "Título do impacto 1", "description": "Como a presença constante garantiu exposição ou gerou necessidade de ajuste de CPL.", "tone": "positive" },
    { "title": "Título do impacto 2", "description": "Como o volume de leads encurta o ciclo ou se o fluxo no CRM precisa de maturação.", "tone": "warning" },
    { "title": "Título do impacto 3", "description": "Eficiência na alocação de verba entre canais.", "tone": "positive" },
    { "title": "Título do impacto 4", "description": "Alinhamento das ações com as metas de contratação e fortalecimento de marca.", "tone": "positive" }
  ],
  "next_steps": [
    { "title": "Ação 1", "description": "Recomendação baseada nos gaps identificados de CPL." },
    { "title": "Ação 2", "description": "Recomendação baseada na performance de canais/campanhas." },
    { "title": "Ação 3", "description": "Ajuste na triagem ou no acompanhamento de candidatos." },
    { "title": "Ação 4", "description": "Estratégia para o próximo período." }
  ]
}

IMPORTANTE: 
- NUNCA use a palavra ROI ou fale de perda/ganho de investimento financeiro. Fale em Custo por Lead (CPL), eficiência orçamentária e captação de talentos.
- Use os valores numéricos EXATOS pré-calculados em executive_summary.
- Preencha os textos analíticos com base nos dados REAIS fornecidos no JSON.
- A chave 'tone' no business_impact deve ser 'positive', 'warning' ou 'negative'.`
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
