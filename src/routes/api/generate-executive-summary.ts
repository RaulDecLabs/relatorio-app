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

          const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: { persistSession: false },
            global: { headers: authHeader ? { Authorization: authHeader } : {} }
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
4. IMPACTO PARA O NEGÓCIO: O tom deve refletir a PERFORMANCE REAL. Se o CPL estiver saudável e o volume de leads for bom, adote um tom de Eficiência e Oportunidade de Escala. Se a verba foi gasta sem candidatos, aí sim faça um alerta de realocação (sem nunca usar "prejuízo" ou "desperdício"). NUNCA copie fielmente os títulos de exemplos (como "Oportunidade de Aprendizado" ou "Risco à Imagem da Marca").
5. LEITURA REGIONAL: Escreva sempre um parágrafo analítico elegante e profissional destacando a presença geográfica das campanhas nas praças operacionais e atração regional de candidatos. NUNCA diga "dados não consolidados".
6. Se as contratações no CRM forem 0, explique de forma executiva que os candidatos gerados na mídia estão em etapa de triagem e qualificação no funil.
7. É TERMINANTEMENTE PROIBIDO inventar números ou exemplos arbitrários. Todo número citado no texto (cliques, investimento, leads) DEVE SER EXATAMENTE O VALOR FORNECIDO no JSON dos DADOS CONSOLIDADOS.
8. PRÓXIMOS PASSOS: Devem ser recomendações PRÁTICAS baseadas nas lacunas REAIS identificadas nos DADOS CONSOLIDADOS. Se não houver dados de região, recomende "Parametrização UTM por praça". Se Contratações (total_sales) for 0, recomende "Aproximação e feedback rápido do Nectar CRM". É TOTALMENTE PROIBIDO gerar clichês genéricos de marketing como 'Testes A/B', 'Análise de Segmentação' ou 'Relatório de Conclusão'.
9. INFORMAÇÕES FALSAS E ALUCINAÇÕES: É RIGOROSAMENTE PROIBIDO inventar informações, métricas, locais ou nomes de campanhas. Se você não tiver o dado exato fornecido no JSON de entrada, não invente. No "campaign_attention_point", escolha UMA campanha real que exista na lista "todas_campanhas" (Google ou Meta) fornecida abaixo e descreva o cenário real dela.`

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
    "Insight 1 citando o volume EXATO de candidatos gerados e investimento alocado (use os números do JSON, NÃO invente exemplos fictícios)",
    "Insight 2 sobre a eficiência REAL de CPL ou canal com melhor volume de candidaturas",
    "Insight 3 sobre a oportunidade de otimização contínua de criativos e atração"
  ],
  "channel_investment_insight": "Insight de destaque sobre a estratégia de distribuição de mídia (ex: 'Foco no canal [X] para ampliar topo de funil')",
  "regional_insight": "Parágrafo elegante sobre a presença estratégica e cobertura de mídia nas praças essenciais de recrutamento.",
  "evolution_insight": "Análise do ritmo diário de investimento e constância das ações.",
  "regional_investment": [
    { "region": "[Nome da praça extraída das campanhas]", "cost": 0, "percentage": 0 }
  ],
  "regional_summary": {
    "top_region_text": "[Ex: A maior fatia (Z%) foi investida na praça prioritária Y]",
    "secondary_region_text": "[Ex: O restante foi aplicado em campanhas multirregionais...]"
  },
  "media_strategy": [
    { "number": "1", "title": "Distribuição entre canais", "data_highlight": "[Ex: X% da verba foi alocada no Google Ads, Y% no Meta Ads]", "description": "[Análise do porquê dessa distribuição]" },
    { "number": "2", "title": "Ritmo de investimento", "data_highlight": "[Ex: Campanhas ativas em X dias do período com pico no dia Y]", "description": "[Análise da consistência da verba diária]" },
    { "number": "3", "title": "Papel de cada canal", "data_highlight": "[Ex: Canal X focou em alcance, Canal Y gerou maior fatia de leads]", "description": "[Análise de qual canal performou melhor para atração]" }
  ],
  "campaign_attention_point": "Identificação técnica e construtiva da campanha com maior CPL para ajuste de criativo (ex: 'A campanha X apresentou CPL acima da média e será otimizada no próximo ciclo.')",
  "business_impact": [
    { "title": "[Gere um impacto estratégico positivo ou corretivo baseado no CPL real]", "description": "[Analise os dados e comprove este impacto com fatos das campanhas]" },
    { "title": "[Gere outro impacto de negócio]", "description": "[Justificativa baseada no JSON]" },
    { "title": "[Terceiro pilar de impacto]", "description": "[Justificativa baseada no JSON]" },
    { "title": "[Quarto pilar de impacto]", "description": "[Justificativa baseada no JSON]" }
  ],
  "next_steps": [
    { "title": "[Passo 1 baseado em lacunas reais dos dados]", "description": "[Descreva a ação recomendada sem usar clichês]" },
    { "title": "[Passo 2 baseado em lacunas reais dos dados]", "description": "[Ação prática]" },
    { "title": "[Passo 3 baseado em lacunas reais dos dados]", "description": "[Ação prática]" },
    { "title": "[Passo 4 baseado em lacunas reais dos dados]", "description": "[Ação prática]" }
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
            let content = chatCompletion.choices[0].message.content || ''
            // Limpa formatação markdown se a IA colocar
            content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
            
            if (content) {
              responseJson = JSON.parse(content)
            }
          } catch (e) {
            console.error('Failed to parse OpenAI JSON', e)
            return new Response('Erro na formatação da IA: o resultado não foi um JSON válido.', { status: 500 })
          }

          // Salvar métricas brutas junto com a análise para exibição direta
          if (responseJson) {
            responseJson._raw_metrics = body.rawMetrics || {}

            const { data: existingRecord } = await supabase
              .from('executive_summaries')
              .select('id')
              .eq('report_id', reportId)
              .eq('period_start', startDateStr)
              .eq('period_end', endDateStr)
              .single()

            let dbError = null;

            if (existingRecord) {
              const { error } = await supabase
                .from('executive_summaries')
                .update({ summary_data: responseJson })
                .eq('id', existingRecord.id)
              dbError = error;
            } else {
              const { error } = await supabase
                .from('executive_summaries')
                .insert({
                  report_id: reportId,
                  period_start: startDateStr,
                  period_end: endDateStr,
                  summary_data: responseJson
                })
              dbError = error;
            }

            if (dbError) {
              console.error('Error saving executive summary to DB:', dbError)
              return new Response(`Erro ao salvar no banco de dados: ${dbError.message}`, { status: 500 })
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
