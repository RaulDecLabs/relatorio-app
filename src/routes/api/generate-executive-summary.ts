import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'


function cleanUrl(val: any): string | undefined {
  if (!val || typeof val !== 'string') return undefined;
  // Remove aspas, backticks e espaços das bordas. ATENÇÃO: \s = whitespace, NÃO \\s (que removeria a letra 's')
  let cleaned = val.trim().replace(/^['"\s`]+|['"\s`]+$/g, '');
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
  // Remove aspas, backticks e espaços das bordas. ATENÇÃO: \s = whitespace, NÃO \\s (que removeria a letra 's')
  const cleaned = val.trim().replace(/^['"\s`]+|['"\s`]+$/g, '');
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

          const systemPrompt = `Você é um Estrategista Sênior de Performance de Mídia e Recrutamento Digital assinado pela AGÊNCIA para a diretoria do CLIENTE. É um documento de consultoria premium, analítico, estratégico e comercialmente inteligente.

DIRETRIZES OBRIGATÓRIAS E REGRAS DE OURO:
1. NUNCA mencione que você é uma IA, modelo ou ChatGPT. Assuma 100% a postura de uma diretoria humana experiente da agência.
2. É TOTALMENTE PROIBIDO usar as palavras "ROI", "Retorno sobre Investimento", "perda de investimento", "perda total", "lucro", "prejuízo", "desperdício de recursos" ou "risco à imagem da marca".
3. É TERMINANTEMENTE PROIBIDO usar as expressões "Atração de Talentos" ou "Atração de talentos" em qualquer campo do JSON de resposta. Use sempre "Divulgação de Vagas", "Geração de Leads" ou "Recrutamento Digital" como alternativas.
4. LINGUAGEM DA AGÊNCIA PARA O CLIENTE: Os relatórios devem sempre valorizar a estratégia, a visibilidade gerada para a marca empregadora e as oportunidades de otimização de custo por lead (CPL).
5. IMPACTO PARA O NEGÓCIO: O tom deve refletir a PERFORMANCE REAL. Se o CPL estiver saudável e o volume de leads for bom, adote tom de Eficiência e Oportunidade de Escala. Se a verba foi gasta sem leads, faça um alerta de realocação (sem nunca usar "prejuízo" ou "desperdício"). NUNCA copie títulos de exemplos.
6. LEITURA REGIONAL: Escreva sempre um parágrafo analítico elegante e profissional destacando a presença geográfica das campanhas nas praças operacionais. NUNCA diga "dados não consolidados".
7. Se as contratações no CRM forem 0, explique executivamente que os leads gerados estão em etapa de triagem e qualificação no funil.
8. É TERMINANTEMENTE PROIBIDO inventar números. Todo número citado (cliques, investimento, leads) DEVE SER EXATAMENTE O VALOR FORNECIDO no JSON de entrada.
9. PRÓXIMOS PASSOS: Recomendações PRÁTICAS baseadas nas lacunas REAIS dos dados. É TOTALMENTE PROIBIDO usar clichês como 'Testes A/B', 'Análise de Segmentação' ou 'Relatório de Conclusão'.
10. ALUCINAÇÕES: É RIGOROSAMENTE PROIBIDO inventar informações, métricas, locais ou nomes de campanhas. No "campaign_attention_point", escolha UMA campanha real da lista fornecida.`

          const userPrompt = `Analise os dados abaixo do cliente "${config.name}" referentes ao período de ${startDateStr} a ${endDateStr} (${days} dias) e gere um Parecer Executivo de Performance Digital.

DADOS CONSOLIDADOS:
${JSON.stringify(fullDataContext, null, 2)}

Responda EXCLUSIVAMENTE com um JSON válido (sem markdown, sem backticks, sem comentários JS) seguindo EXATAMENTE este schema e preenchendo com análises reais baseadas nos dados fornecidos acima:

{
  "executive_summary": {
    "headline": "Frase estratégica sobre a performance de mídia e geração de leads no período (máx 15 palavras, PROIBIDO usar 'Atração de Talentos')",
    "total_investment": ${totalCost},
    "total_leads": ${totalLeads},
    "total_sales": ${wonDealsLength},
    "cpl": ${Math.round(blendedCPL * 100) / 100},
    "total_regions": 1
  },
  "key_insights": [
    "Insight 1 com valores reais do JSON sobre volume de candidatos e investimento",
    "Insight 2 sobre eficiência de CPL ou canal com melhor performance real",
    "Insight 3 sobre oportunidade de melhoria baseada nos dados reais"
  ],
  "channel_investment_insight": "Insight estratégico sobre a distribuição do investimento entre os canais, usando os valores reais do JSON",
  "regional_insight": "Parágrafo analítico e elegante sobre presença geográfica das campanhas nas praças de recrutamento",
  "evolution_insight": "Análise sobre o ritmo de investimento e consistência das ações no período",
  "regional_investment": [
    { "region": "Nome da praça extraído dos nomes das campanhas", "cost": 0, "percentage": 0 }
  ],
  "regional_summary": {
    "top_region_text": "Texto sobre a praça com maior investimento, incluindo o valor e percentual reais",
    "secondary_region_text": "Texto sobre as demais praças ou campanhas multirregionais"
  },
  "media_strategy": [
    { "number": "1", "title": "Distribuição entre canais", "data_highlight": "Percentual real de cada canal baseado no JSON", "description": "Análise do porquê dessa distribuição" },
    { "number": "2", "title": "Ritmo de investimento", "data_highlight": "Dias ativos e consistência real da verba no período", "description": "Análise da consistência da verba diária" },
    { "number": "3", "title": "Papel de cada canal", "data_highlight": "Qual canal gerou mais leads vs mais alcance", "description": "Qual canal performou melhor para atração de candidatos" }
  ],
  "campaign_attention_point": "Identifique UMA campanha real da lista fornecida que teve o pior CPL ou zero conversões e descreva de forma construtiva e técnica",
  "business_impact": [
    { "title": "Título de impacto positivo ou corretivo baseado no CPL real", "description": "Comprove o impacto com dados reais das campanhas do JSON" },
    { "title": "Segundo impacto real de negócio", "description": "Justifique com dados reais do JSON" },
    { "title": "Terceiro pilar de impacto real", "description": "Justifique com dados reais do JSON" },
    { "title": "Quarto pilar de impacto real", "description": "Justifique com dados reais do JSON" }
  ],
  "next_steps": [
    { "title": "Passo 1 baseado em lacuna real identificada nos dados", "description": "Ação prática recomendada" },
    { "title": "Passo 2 baseado em lacuna real identificada nos dados", "description": "Ação prática recomendada" },
    { "title": "Passo 3 baseado em lacuna real identificada nos dados", "description": "Ação prática recomendada" },
    { "title": "Passo 4 baseado em lacuna real identificada nos dados", "description": "Ação prática recomendada" }
  ]
}

REGRAS FINAIS:
- total_regions: estime o número de praças geográficas únicas lendo os nomes das campanhas. Se não identificar, use 1.
- NUNCA use as palavras ROI, prejuízo, desperdício ou risco à imagem.
- Tom altamente profissional, construtivo e que valorize o trabalho da agência.
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
