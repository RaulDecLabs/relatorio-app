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

          const systemPrompt = `Você é um Estrategista Sênior de Employer Branding e Atração de Talentos assinado pela AGÊNCIA para a diretoria do CLIENTE. É um documento de consultoria premium, analítico, estratégico e comercialmente inteligente.

DIRETRIZES OBRIGATÓRIAS E REGRAS DE OURO:
1. NUNCA mencione que você é uma IA, modelo ou ChatGPT. Assuma 100% a postura de uma diretoria humana experiente da agência.
2. É TOTALMENTE PROIBIDO usar as palavras "ROI", "Retorno sobre Investimento", "perda de investimento", "perda total", "lucro", "prejuízo", "desperdício de recursos" ou "risco à imagem da marca".
3. LINGUAGEM DA AGÊNCIA PARA O CLIENTE: Os relatórios devem sempre valorizar a estratégia, a visibilidade gerada para a marca empregadora e as oportunidades de otimização de custo por candidato (CPL).
4. IMPACTO PARA O NEGÓCIO: Os 4 pontos de Impacto para o Negócio DEVEM SER POSITIVOS E CONSTRUTIVOS. Use obrigatoriamente pilares estratégicos de valor (ex: "Visibilidade e Presença de Marca", "Pipeline de Atração de Talentos", "Eficiência Orçamentária e CPL", "Maturação do Funil de Recrutamento"). NUNCA critique a imagem do cliente nem acuse desperdício.
5. LEITURA REGIONAL: Escreva sempre um parágrafo analítico elegante e profissional destacando a presença geográfica das campanhas nas praças operacionais e atração regional de candidatos. NUNCA diga "dados não consolidados".
6. Se as contratações no CRM forem 0, explique de forma executiva que os candidatos gerados na mídia estão em etapa de triagem e qualificação no funil.
7. É TERMINANTEMENTE PROIBIDO inventar números ou exemplos arbitrários. Todo número citado no texto (cliques, investimento, leads) DEVE SER EXATAMENTE O VALOR FORNECIDO no JSON dos DADOS CONSOLIDADOS.
8. PRÓXIMOS PASSOS: Devem ser ações estratégicas e práticas de Atração de Talentos e Employer Branding (ex: 'Otimização de Criativos nas Campanhas', 'Realocação Estratégica de Verba', 'Agilidade na Triagem no CRM', 'Expansão em Praças Prioritárias'). É TOTALMENTE PROIBIDO gerar clichês genéricos de marketing como 'Testes A/B', 'Análise de Segmentação' ou 'Relatório de Conclusão'.`

          const userPrompt = `Analise os dados abaixo do cliente "${config.name}" referentes ao período de ${startDateStr} a ${endDateStr} (${days} dias) e gere um Parecer Executivo de Atração de Talentos.

DADOS CONSOLIDADOS:
${JSON.stringify(fullDataContext, null, 2)}

Responda EXCLUSIVAMENTE com um JSON válido (sem markdown, sem backticks) seguindo EXATAMENTE este schema estrutural e preenchendo as chaves com suas análises:

{
  "executive_summary": {
    "headline": "Frase estratégica valorizando a atração de talentos e alcance no período (máx 15 palavras)",
    "total_investment": ${totalCost},
    "total_leads": ${totalLeads},
    "total_sales": ${wonDealsLength},
    "cpl": ${Math.round(blendedCPL * 100) / 100},
    "total_regions": 0 // ESTIME O NÚMERO DE PRAÇAS LENDO OS NOMES DAS CAMPANHAS. SE NÃO ACHAR, RETORNE 1.
  },
  "key_insights": [
    "Insight 1 citando o volume EXATO de candidatos gerados e investimento alocado com base no JSON",
    "Insight 2 sobre a eficiência REAL de CPL ou canal com melhor volume de candidaturas",
    "Insight 3 sobre a oportunidade de otimização contínua de criativos e atração"
  ],
  "channel_investment_insight": "Insight de destaque sobre a estratégia de distribuição de mídia (ex: 'Alocação focada no Meta Ads para ampliar o alcance do topo de funil')",
  "regional_insight": "Parágrafo elegante sobre a presença estratégica e cobertura de mídia nas praças essenciais de recrutamento.",
  "evolution_insight": "Análise do ritmo diário de investimento e constância das ações.",
  "media_strategy": [
    { "title": "Distribuição entre canais", "description": "Descreva como o investimento foi distribuído (ex: valores ou X% em Google Ads, Y% em Meta Ads) usando os dados reais." },
    { "title": "Ritmo de investimento", "description": "Analise a constância dos aportes diários no período com base nos dados do JSON." },
    { "title": "Papel de cada canal", "description": "Descreva qual canal trouxe mais visibilidade e qual trouxe mais leads, provando com números reais do JSON." }
  ],
  "campaign_attention_point": "Identificação técnica e construtiva da campanha com maior CPL para ajuste de criativo (ex: 'A campanha X apresentou CPL acima da média e será otimizada no próximo ciclo.')",
  "business_impact": [
    { "title": "Visibilidade e Presença de Marca", "description": "A exposição contínua fortaleceu a atração de candidatos e a marca empregadora no mercado.", "tone": "positive" },
    { "title": "Construção de Banco de Talentos", "description": "Volume expressivo de candidaturas geradas alimentando a esteira de triagem.", "tone": "positive" },
    { "title": "Eficiência Orçamentária", "description": "Direcionamento estratégico do investimento focado em canais de alta conversão.", "tone": "positive" },
    { "title": "Maturação do Funil de Atração", "description": "Aprendizado de dados para refinar os critérios de qualificação nos próximos ciclos.", "tone": "positive" }
  ],
  "next_steps": [
    { "title": "Otimização de Criativos", "description": "Refinar anúncios das campanhas com maior CPL." },
    { "title": "Alocação Estratégica de Verba", "description": "Priorizar os canais com menor custo por candidato." },
    { "title": "Acompanhamento no CRM", "description": "Acelerar a triagem dos candidatos captados pelas campanhas." },
    { "title": "Expansão de Praças", "description": "Testar novas abordagens nas regiões de maior demanda." }
  ]
}

IMPORTANTE:
- NUNCA use as palavras ROI, prejuízo, desperdício ou risco à imagem.
- Mantenha um tom altamente profissional, construtivo e que valorize o trabalho da agência.
- Use os valores numéricos EXATOS pré-calculados em executive_summary.`
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
