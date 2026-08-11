import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Brain, RefreshCcw, CheckCircle2, AlertTriangle, 
  Lightbulb, Target, DollarSign, Users, 
  Globe, BarChart3, ChevronRight, Award,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, Cell
} from "recharts";

interface ExecutiveSummaryTabProps {
  activeReport: any;
  startDateStr: string;
  endDateStr: string;
  isClient: boolean;
  days: string;
  fullDataContext?: any;
  rawMetrics?: any;
  mergedChartData?: any[];
  topAdsCampaigns?: any[];
  topFbCampaigns?: any[];
}

export function ExecutiveSummaryTab({ 
  activeReport, 
  startDateStr, 
  endDateStr, 
  isClient, 
  days,
  fullDataContext,
  rawMetrics,
  mergedChartData = [],
  topAdsCampaigns = [],
  topFbCampaigns = []
}: ExecutiveSummaryTabProps) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ["executive-summary", activeReport?.id, startDateStr, endDateStr],
    enabled: !!activeReport?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executive_summaries" as any)
        .select("*")
        .eq("report_id" as any, activeReport.id)
        .gte("period_start", startDateStr)
        .lte("period_end", endDateStr)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching summary:", error);
        return null;
      }
      return data;
    }
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/generate-executive-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: activeReport.id,
          activeReport,
          days,
          startDateStr,
          endDateStr,
          fullDataContext,
          rawMetrics
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Erro desconhecido');
        throw new Error(errorText || 'Falha ao gerar relatório');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Parecer executivo gerado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["executive-summary"] });
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao gerar parecer: " + error.message);
    },
    onSettled: () => {
      setIsGenerating(false);
    }
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    generateMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-slate-500 font-medium">Buscando parecer executivo...</p>
      </div>
    );
  }

  const summaryAny = summary as any;

  if (!summaryAny || !summaryAny.summary_data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center bg-[#f4f6fb] rounded-2xl border border-slate-200">
        <Brain className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-700 mb-2">Nenhum Parecer Disponível</h3>
        <p className="text-slate-500 max-w-md mb-8">
          Ainda não há um parecer executivo gerado para este período. O motor de inteligência artificial precisa analisar os dados brutos primeiro.
        </p>
        {!isClient && (
          <Button onClick={handleGenerate} disabled={isGenerating} size="lg" className="bg-[#1a2a5e] hover:bg-[#1a2a5e]/90 text-white shadow-lg">
            {isGenerating ? <RefreshCcw className="w-5 h-5 animate-spin mr-2" /> : <Brain className="w-5 h-5 mr-2" />}
            {isGenerating ? "Analisando Dados..." : "Gerar Novo Parecer com IA"}
          </Button>
        )}
      </div>
    );
  }

  const data = summaryAny.summary_data;
  const exec = data.executive_summary || {};
  
  // Filtrar insights legados do banco antigo — remover qualquer texto que seja placeholder ou dado inventado
  const rawInsights = data.key_insights || [];
  const insights = rawInsights.filter((insight: string) => {
    const lower = (insight || "").toLowerCase();
    // Bloqueio de termos negativos proibidos
    if (lower.includes("roi") || lower.includes("perda total") || lower.includes("desperdício") || lower.includes("prejuízo")) return false;
    // Bloqueio de frases genéricas e hardcoded do banco antigo
    if (lower.includes("sem vendas geradas")) return false;
    if (lower.includes("apenas 6 conversões")) return false;
    if (lower.includes("534,92") || lower.includes("534.92")) return false;
    if (lower.startsWith("escreva aqui")) return false;
    if (lower.startsWith("insight 1") || lower.startsWith("insight 2") || lower.startsWith("insight 3")) return false;
    return true;
  });

  const mediaStrategy = data.media_strategy || [];

  const rawBusinessImpact = data.business_impact || [];
  const businessImpact = rawBusinessImpact.filter((impact: any) => {
    const title = (impact.title || "").toLowerCase();
    return !title.includes("desperdício de recursos") && 
           !title.includes("necessidade de revisão estratégica") &&
           !title.includes("oportunidade de aprendizado") &&
           !title.includes("risco à imagem da marca") &&
           !title.includes("pilar estratégico"); // placeholders antigos
  });

  const rawNextSteps = data.next_steps || [];
  const nextSteps = rawNextSteps.filter((step: any) => {
    const title = (step.title || "").toLowerCase();
    return !title.includes("análise de segmentação") &&
           !title.includes("otimização de anúncios") &&
           !title.includes("testes a/b") &&
           !title.includes("relatório de conclusão");
  });

  const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const fmtNum = (val: number) => new Intl.NumberFormat('pt-BR').format(val || 0);

  // Preparing data for Channel Chart
  const channelData = [
    { name: 'Google Ads', value: rawMetrics?.google_ads?.cost || 0, fill: '#4285F4' },
    { name: 'Meta Ads', value: rawMetrics?.meta_ads?.cost || 0, fill: '#0668E1' },
  ].filter(d => d.value > 0);

  // Table Data
  const campaignsList = [
    ...topAdsCampaigns.map((c: any) => ({
      campaign: c.name,
      channel: 'Google Ads',
      leads: c.conversions || 0,
      cost: c.cost || 0,
      clicks: c.clicks || 0,
      impressions: c.impressions || 0
    })),
    ...topFbCampaigns.map((c: any) => ({
      campaign: c.name,
      channel: 'Meta Ads',
      leads: c.conversions || 0,
      cost: c.cost || 0,
      clicks: c.clicks || 0,
      impressions: c.impressions || 0
    }))
  ].sort((a, b) => b.cost - a.cost);

  // Calcula o pior desempenho programaticamente (Parte 2.2)
  const worstCampaign = campaignsList.reduce((worst, current) => {
    if (current.leads === 0 && current.cost > 0) {
      if (!worst || worst.leads > 0 || current.cost > worst.cost) return current;
    }
    if (current.leads > 0) {
      const currentCpl = current.cost / current.leads;
      const worstCpl = worst && worst.leads > 0 ? worst.cost / worst.leads : 0;
      if (!worst || (worst.leads > 0 && currentCpl > worstCpl)) return current;
    }
    return worst;
  }, null as any);

  const attentionPoint = worstCampaign ? 
    `A campanha "${worstCampaign.campaign}" (${worstCampaign.channel}) consumiu ${fmt(worstCampaign.cost)} gerando ${worstCampaign.leads === 0 ? 'nenhum candidato' : `apenas ${worstCampaign.leads} candidatos (CPL: ${fmt(worstCampaign.cost / worstCampaign.leads)})`}.` 
    : data.campaign_attention_point;

  return (
    <div className="space-y-16 pb-16 animate-in fade-in duration-700 font-sans">
      
      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 1: CAPA HERO
      ═══════════════════════════════════════════════════════════════ */}
      <div className="relative bg-gradient-to-br from-[#0f1c42] via-[#1a2a5e] to-[#243572] rounded-2xl overflow-hidden p-10 md:p-14 shadow-2xl">
        {/* Efeito de brilho decorativo */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#d32f2f]/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
        
        {/* Badge + botão na mesma linha */}
        <div className="relative z-10 flex items-center justify-between mb-8">
          <div className="inline-block border border-white/30 text-white/80 text-[10px] font-bold px-4 py-1.5 tracking-[0.2em] uppercase rounded-sm">
            PARECER EXECUTIVO INSTITUCIONAL
          </div>
          {!isClient && (
            <Button onClick={handleGenerate} disabled={isGenerating} size="sm" className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm">
              {isGenerating ? <RefreshCcw className="w-3 h-3 animate-spin mr-1.5" /> : <RefreshCcw className="w-3 h-3 mr-1.5" />}
              Regerar Parecer
            </Button>
          )}
        </div>

        {/* Título dinâmico da IA ou fallback */}
        <div className="relative z-10">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-5 font-serif leading-tight">
            {exec.headline ? exec.headline : (<>Resultados das<br />Ações de Divulgação</>)}
          </h1>
          <p className="text-white/70 text-lg md:text-xl font-light mb-10 max-w-3xl">
            Consolidação estratégica de investimentos em mídia e divulgação de vagas.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-white/60">
            <span className="text-white font-bold">{activeReport?.name}</span>
            <span className="text-white/30">·</span>
            <span>Período: {startDateStr} a {endDateStr}</span>
            <span className="text-white/30">·</span>
            <span className="text-[#ff6b6b] font-bold">{days === "yesterday" ? "ONTEM" : `Últimos ${days} dias`}</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 2: SUMÁRIO EXECUTIVO E INSIGHTS
      ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-[#1a2a5e] font-serif border-b pb-2 border-slate-200">Sumário Executivo</h2>
        
        {exec.headline && (
          <p className="text-xl md:text-2xl font-light text-slate-700 italic border-l-4 border-[#d32f2f] pl-6 py-2">
            "{exec.headline}"
          </p>
        )}

        <div className={`grid grid-cols-2 gap-4 ${exec.total_regions > 1 ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
          <div className="bg-[#f4f6fb] p-5 rounded-lg border border-slate-200 flex flex-col items-center text-center">
            <span className="text-3xl font-bold text-[#1a2a5e] font-serif">{fmt(rawMetrics?.consolidated?.totalCost || 0)}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-2">Investimento Total</span>
          </div>
          {exec.total_regions > 1 && (
            <div className="bg-[#f4f6fb] p-5 rounded-lg border border-slate-200 flex flex-col items-center text-center">
              <span className="text-3xl font-bold text-[#1a2a5e] font-serif">{fmtNum(exec.total_regions)}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-2">Praças Impactadas</span>
            </div>
          )}
          <div className="bg-[#f4f6fb] p-5 rounded-lg border border-slate-200 flex flex-col items-center text-center">
            <span className="text-3xl font-bold text-[#1a2a5e] font-serif">{fmtNum(rawMetrics?.consolidated?.totalLeads || 0)}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-2">Leads</span>
          </div>
          <div className="bg-[#f4f6fb] p-5 rounded-lg border border-slate-200 flex flex-col items-center text-center">
            <span className="text-3xl font-bold text-[#1a2a5e] font-serif">{fmtNum(rawMetrics?.wonDealsLength || 0)}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-2">Contratações (Nectar)</span>
          </div>
          <div className="bg-[#f4f6fb] p-5 rounded-lg border border-slate-200 flex flex-col items-center text-center">
            <span className="text-3xl font-bold text-[#1a2a5e] font-serif">{fmt(rawMetrics?.consolidated?.blendedCpa || 0)}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-2">Custo por Lead</span>
          </div>
        </div>

        {insights.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6">Principais Insights</h3>
            <ul className="space-y-4">
              {insights.map((insight: string, i: number) => (
                <li key={i} className="flex gap-4 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#d32f2f] mt-2 flex-shrink-0" />
                  <p className="text-slate-700 leading-relaxed">{insight}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 3 & 4: INSIGHTS ADICIONAIS
      ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {data.channel_investment_insight && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#1a2a5e] font-serif border-b pb-2 border-slate-200">Investimento por Canal</h2>
            <div className="bg-[#f4f6fb] text-[#1a2a5e] border border-slate-200 p-6 rounded-lg h-full flex items-center">
              <p className="text-lg leading-relaxed font-light">{data.channel_investment_insight}</p>
            </div>
          </div>
        )}

        {data.regional_insight && !data.regional_insight.toLowerCase().includes("não consolidado") && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#1a2a5e] font-serif border-b pb-2 border-slate-200">Leitura Estratégica Regional</h2>
            <div className="bg-[#1a2a5e] text-white p-6 rounded-lg shadow-md h-full flex items-center">
              <p className="text-lg leading-relaxed font-light">
                {data.regional_insight}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 5: EVOLUÇÃO
      ═══════════════════════════════════════════════════════════════ */}
      {data.evolution_insight && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-[#1a2a5e] font-serif border-b pb-2 border-slate-200">Evolução do Investimento</h2>
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-lg text-slate-700 font-light text-lg">
            {data.evolution_insight}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 5.5: INVESTIMENTO POR REGIÃO
      ═══════════════════════════════════════════════════════════════ */}
      {data.regional_investment && data.regional_investment.length > 0 && (
        <div className="space-y-6 pt-10">
          <div className="border-b pb-2 border-slate-200">
            <h2 className="text-3xl font-bold text-[#1a2a5e] font-serif mb-1">Investimento por Região</h2>
            <p className="text-slate-500 font-light">Alocação geográfica do orçamento — {data.regional_investment.length} praças atendidas</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.regional_investment} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="region" type="category" stroke="#475569" fontSize={11} tickMargin={10} width={150} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                    <RechartsTooltip 
                      cursor={{fill: 'rgba(0,0,0,0.02)'}}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [fmt(value), 'Investimento']}
                    />
                    <Bar dataKey="cost" fill="#1a2a5e" radius={[0, 4, 4, 0]} barSize={24}>
                      {
                        data.regional_investment.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill="#1a2a5e" />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="lg:col-span-4 flex flex-col gap-4 justify-center">
              {data.regional_summary?.top_region_text && (
                <div className="bg-[#f8f9fc] p-6 rounded-xl border border-slate-100">
                  <div className="text-3xl font-bold text-[#1a2a5e] font-serif mb-3">
                    {(() => {
                      const match = data.regional_summary.top_region_text.match(/(R\$ [\d.,]+)/);
                      return match ? match[1] : "Destaque";
                    })()}
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{data.regional_summary.top_region_text}</p>
                </div>
              )}
              {data.regional_summary?.secondary_region_text && (
                <div className="bg-[#f8f9fc] p-6 rounded-xl border border-slate-100">
                  <div className="text-3xl font-bold text-[#1a2a5e] font-serif mb-3">
                    {(() => {
                      const match = data.regional_summary.secondary_region_text.match(/(R\$ [\d.,]+)/);
                      return match ? match[1] : "Multirregional";
                    })()}
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{data.regional_summary.secondary_region_text}</p>
                </div>
              )}
              {data.regional_insight && (
                <div className="bg-[#1a2a5e] p-6 rounded-xl text-white shadow-md mt-2">
                  <h4 className="font-bold mb-2">Leitura estratégica</h4>
                  <p className="text-slate-300 text-sm font-light leading-relaxed">{data.regional_insight}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 6: ESTRATÉGIA DE MÍDIA
      ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-8 pt-10">
        <div className="border-b pb-2 border-slate-200">
          <h2 className="text-3xl font-bold text-[#1a2a5e] font-serif mb-1">Estratégia de Mídia Digital</h2>
          <p className="text-slate-500 font-light">Como o investimento em campanhas foi operacionalizado</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mediaStrategy.map((strategy: any, i: number) => (
            <div key={i} className="bg-[#f8f9fc] border border-slate-100 p-8 rounded-xl relative shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-[#1a2a5e] text-white flex items-center justify-center font-bold text-xl mb-6 shadow-sm">
                {strategy.number || (i + 1)}
              </div>
              <h4 className="font-bold text-[#1a2a5e] text-lg mb-3">{strategy.title}</h4>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">{strategy.data_highlight}</p>
              <p className="text-slate-500 text-sm font-light leading-relaxed">{strategy.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 7: RESULTADOS IMPULSIONAMENTO
      ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-6 pt-10">
        <div className="border-b pb-2 border-slate-200">
          <h2 className="text-3xl font-bold text-[#1a2a5e] font-serif mb-1">Resultados do Impulsionamento</h2>
          <p className="text-slate-500 font-light">Cliques, impressões e leads — amostra das principais campanhas</p>
        </div>
        
        {/* CARDS DE RESUMO */}
        {(() => {
          const totalClicks = campaignsList.reduce((sum: number, c: any) => sum + (c.clicks || 0), 0);
          const totalImps = campaignsList.reduce((sum: number, c: any) => sum + (c.impressions || 0), 0);
          const totalLeads = campaignsList.reduce((sum: number, c: any) => sum + (c.leads || 0), 0);
          const totalCost = campaignsList.reduce((sum: number, c: any) => sum + (c.cost || 0), 0);
          
          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-[#f4f6fb] p-6 rounded-xl border border-slate-100">
                <div className="text-4xl font-bold text-[#1a2a5e] font-serif mb-2">{fmtNum(totalClicks)}</div>
                <div className="font-bold text-slate-700 mb-1">Cliques no link</div>
                <div className="text-xs text-slate-500">{fmt(totalCost)} investidos • CPC médio {fmt(totalClicks > 0 ? totalCost / totalClicks : 0)}</div>
              </div>
              <div className="bg-[#f4f6fb] p-6 rounded-xl border border-slate-100">
                <div className="text-4xl font-bold text-[#1a2a5e] font-serif mb-2">{fmtNum(totalImps)}</div>
                <div className="font-bold text-slate-700 mb-1">Visualizações / Impressões</div>
                <div className="text-xs text-slate-500">{fmt(totalCost)} investidos • CPM médio {fmt(totalImps > 0 ? (totalCost / totalImps) * 1000 : 0)}</div>
              </div>
              <div className="bg-[#f4f6fb] p-6 rounded-xl border border-slate-100">
                <div className="text-4xl font-bold text-[#1a2a5e] font-serif mb-2">{fmtNum(totalLeads)}</div>
                <div className="font-bold text-slate-700 mb-1">Leads gerados</div>
                <div className="text-xs text-slate-500">{fmt(totalCost)} investidos • CPL médio {fmt(totalLeads > 0 ? totalCost / totalLeads : 0)}</div>
              </div>
            </div>
          );
        })()}

        <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#1a2a5e] text-white font-bold text-xs tracking-wider">
              <tr>
                <th className="px-4 py-4">Conjunto de anúncios / Região</th>
                <th className="px-4 py-4">Canal</th>
                <th className="px-4 py-4">Métrica</th>
                <th className="px-4 py-4 text-right">Resultado</th>
                <th className="px-4 py-4 text-right">Custo/resultado</th>
                <th className="px-4 py-4 text-right">Investido</th>
              </tr>
            </thead>
            <tbody>
              {campaignsList.length > 0 ? campaignsList.map((c: any, i: number) => {
                const isLead = c.leads > 0;
                const metricName = isLead ? "Leads" : "Cliques no link";
                const resultVal = isLead ? c.leads : c.clicks;
                const costPer = resultVal > 0 ? c.cost / resultVal : 0;
                
                return (
                  <tr key={i} className="border-b border-slate-200 hover:bg-slate-50 last:border-0 bg-white">
                    <td className="px-4 py-3 text-slate-600 truncate max-w-[250px]">{c.campaign}</td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      <span className={`px-2 py-1 rounded text-xs ${c.channel === 'Google Ads' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {c.channel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{metricName}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#1a2a5e]">{fmtNum(resultVal)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{fmt(costPer)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{fmt(c.cost)}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic bg-white">
                    Nenhuma campanha registrada no período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {attentionPoint && (
          <div className="bg-[#fcf8f8] border-l-4 border-red-600 p-4 rounded-r-lg mt-4 text-sm text-slate-700">
            <span className="font-bold text-red-700">Ponto de atenção:</span> {attentionPoint}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 9: IMPACTO PARA O NEGÓCIO
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-[#1e2a53] -mx-8 px-8 py-12 rounded-xl text-white space-y-8 my-10 shadow-inner">
        <div>
          <h2 className="text-3xl font-bold font-serif mb-2">Impacto para o Negócio</h2>
          <p className="text-[#a0aeca] font-light">
            Ganhos qualitativos da estratégia de divulgação para a marca empregadora {activeReport?.name}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {businessImpact.map((impact: any, i: number) => (
            <div key={i} className="bg-[#151d3b] p-8 rounded-lg relative overflow-hidden group border border-[#2a3867]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full transition-transform group-hover:scale-110" />
              
              <div className="flex items-start gap-5 relative z-10">
                <div className="w-12 h-12 rounded-full bg-[#d32f2f] text-white flex items-center justify-center font-black flex-shrink-0 text-xl shadow-lg">
                  {i + 1}
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-3 text-white">{impact.title}</h4>
                  <p className="text-[#a0aeca] text-sm leading-relaxed">{impact.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 10: PRÓXIMOS PASSOS
      ═══════════════════════════════════════════════════════════════ */}
      <div className="space-y-6 pt-6">
        <h2 className="text-2xl font-bold text-[#1a2a5e] font-serif border-b pb-2 border-slate-200">Próximos Passos Recomendados</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {nextSteps.map((step: any, i: number) => (
            <div key={i} className="flex gap-4 items-start">
              <div className="text-5xl font-black text-slate-200 font-serif -mt-2 select-none">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div>
                <h4 className="font-bold text-[#1a2a5e] mb-1">{step.title}</h4>
                <p className="text-slate-600 text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <div className="pt-6 pb-4 text-center border-t border-slate-200 mt-6">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{activeReport?.name}</p>
        <p className="text-xs text-slate-500">Documento executivo emitido via InsightOS • {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

    </div>
  );
}
