import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { 
  LayoutTemplate, Award, CheckCircle2, TrendingUp, DollarSign, 
  MousePointer, Globe, BarChart2, Calendar, Target,
  Zap, Search, Facebook, Activity, Eye, Clock, Table2, History, Key, Loader2, RefreshCw
} from "lucide-react";
import { ExecutiveSummaryTab } from "@/components/reports/executive-summary-tab";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, BarChart, Bar, Legend
} from "recharts";

export const Route = createFileRoute("/_authenticated/templates")({
  component: TemplatesPage,
});

interface ReportConfig {
  id: string;
  name: string;
  table_name: string;
  ads_table_name?: string | null;
  fb_ads_table_name?: string | null;
  gsc_table_name?: string | null;
  ga4_property_id?: string | null;
  google_ads_id?: string | null;
  meta_ads_id?: string | null;
  gsc_url?: string | null;
}

function SectionTitle({ title, description, icon: Icon, color = "blue" }: any) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    green: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    indigo: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    purple: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  };
  const design = colorMap[color] || colorMap.blue;
  return (
    <div className="flex items-center gap-4 mb-6 mt-10">
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm", design)}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, hint, color = "blue" }: any) {
  const colorMap: Record<string, any> = {
    blue: { bg: "bg-blue-500/10 text-blue-500", accent: "border-blue-500/30", hover: "hover:border-blue-500/50 hover:shadow-blue-500/20", gradient: "from-blue-500/10 to-transparent", dot: "bg-blue-500" },
    green: { bg: "bg-emerald-500/10 text-emerald-500", accent: "border-emerald-500/30", hover: "hover:border-emerald-500/50 hover:shadow-emerald-500/20", gradient: "from-emerald-500/10 to-transparent", dot: "bg-emerald-500" },
    amber: { bg: "bg-amber-500/10 text-amber-500", accent: "border-amber-500/30", hover: "hover:border-amber-500/50 hover:shadow-amber-500/20", gradient: "from-amber-500/10 to-transparent", dot: "bg-amber-500" },
    indigo: { bg: "bg-indigo-500/10 text-indigo-500", accent: "border-indigo-500/30", hover: "hover:border-indigo-500/50 hover:shadow-indigo-500/20", gradient: "from-indigo-500/10 to-transparent", dot: "bg-indigo-500" },
    purple: { bg: "bg-purple-500/10 text-purple-500", accent: "border-purple-500/30", hover: "hover:border-purple-500/50 hover:shadow-purple-500/20", gradient: "from-purple-500/10 to-transparent", dot: "bg-purple-500" },
    rose: { bg: "bg-rose-500/10 text-rose-500", accent: "border-rose-500/30", hover: "hover:border-rose-500/50 hover:shadow-rose-500/20", gradient: "from-rose-500/10 to-transparent", dot: "bg-rose-500" },
  };
  const design = colorMap[color] || colorMap.blue;

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border-border/50 bg-card/60 backdrop-blur-xl", 
      design.accent,
      design.hover
    )}>
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", design.gradient)} />
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shadow-inner", design.bg)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">{value}</span>
        </div>
        {hint && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground/80 font-medium">
            <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", design.dot)} />
            <span>{hint}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/95 border border-border/80 backdrop-blur-xl p-4 rounded-xl shadow-xl text-xs space-y-2 min-w-40 z-50">
        <p className="font-bold text-foreground mb-2 border-b pb-1 border-border/50">{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium flex-row">
              <span className="h-2 w-2 rounded-full inline-block mr-1" style={{ backgroundColor: entry.stroke || entry.fill }} />
              {entry.name}:
            </span>
            <span className="font-bold text-foreground">{entry.value.toLocaleString("pt-BR")}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function TemplatesPage() {
  const { user } = useAuth();
  const { isClient } = useRoles();
  const queryClient = useQueryClient();
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("7");
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [autoAiEnabled, setAutoAiEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("ai_auto_generation_enabled");
    return saved !== null ? saved === "true" : true;
  });

  const toggleAutoAi = () => {
    const newVal = !autoAiEnabled;
    setAutoAiEnabled(newVal);
    localStorage.setItem("ai_auto_generation_enabled", String(newVal));
    if (newVal) {
      toast.success("⚡ Atualização Automática Ativada! Ao receber novas métricas pelo webhook ou atualizar o banco, o parecer executivo consolidado será emitido instantaneamente.");
    } else {
      toast.info("🔕 Atualização Automática de Leitura Pausada.");
    }
  };

  const getDatesForRange = (range: string) => {
    const end = new Date();
    end.setDate(end.getDate() - 1);
    const start = new Date();
    
    switch (range) {
      case "yesterday": start.setDate(end.getDate()); break;
      case "7": start.setDate(end.getDate() - 6); break;
      case "30": start.setDate(end.getDate() - 29); break;
      case "90": start.setDate(end.getDate() - 89); break;
      case "this_month":
        start.setDate(1);
        break;
      case "last_month":
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        end.setDate(0); 
        break;
      default: start.setDate(end.getDate() - 6);
    }
    
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return { startDateStr: formatDate(start), endDateStr: formatDate(end) };
  };

  const { startDateStr, endDateStr } = getDatesForRange(dateRange);

  // Queries
  const { data: reports = [] } = useQuery<ReportConfig[]>({
    queryKey: ["reports-configs", user?.id, isClient],
    queryFn: async () => {
      const { data, error } = await supabase.from("reports_config").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      const list = data || [];
      if (isClient && user?.user_metadata?.assigned_report_id) {
        return list.filter((r) => r.id === user.user_metadata.assigned_report_id);
      }
      if (isClient && !user?.user_metadata?.assigned_report_id) {
        return [];
      }
      return list;
    },
    enabled: !!user || !isClient,
  });

  useEffect(() => {
    if (reports.length > 0 && !selectedReportId) {
      setSelectedReportId(reports[0].id);
    }
  }, [reports, selectedReportId]);

  const activeReport = reports.find(r => r.id === selectedReportId);

  const { data: gaMetrics = [], isLoading: loadGa } = useQuery({
    queryKey: ["ga-metrics", activeReport?.table_name, startDateStr, endDateStr],
    enabled: !!activeReport?.table_name,
    queryFn: async () => {
      const { data, error } = await supabase.from(activeReport!.table_name as any).select("*").gte("metric_date", startDateStr).lte("metric_date", endDateStr).order("metric_date", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    }
  });

  const { data: adsMetrics = [], isLoading: loadAds } = useQuery({
    queryKey: ["ads-metrics", activeReport?.ads_table_name, startDateStr, endDateStr],
    enabled: !!activeReport?.ads_table_name,
    queryFn: async () => {
      const { data, error } = await supabase.from(activeReport!.ads_table_name as any).select("*").gte("metric_date", startDateStr).lte("metric_date", endDateStr).order("metric_date", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    }
  });

  const { data: fbAdsMetrics = [], isLoading: loadFbAds } = useQuery({
    queryKey: ["fb-ads-metrics", activeReport?.fb_ads_table_name, startDateStr, endDateStr],
    enabled: !!activeReport?.fb_ads_table_name,
    queryFn: async () => {
      const { data, error } = await supabase.from(activeReport!.fb_ads_table_name as any).select("*").gte("metric_date", startDateStr).lte("metric_date", endDateStr).order("metric_date", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    }
  });

  const { data: gscMetrics = [], isLoading: loadGsc } = useQuery({
    queryKey: ["gsc-metrics", activeReport?.gsc_table_name, startDateStr, endDateStr],
    enabled: !!activeReport?.gsc_table_name,
    queryFn: async () => {
      const { data, error } = await supabase.from(activeReport!.gsc_table_name as any).select("*").gte("metric_date", startDateStr).lte("metric_date", endDateStr).order("metric_date", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    }
  });

  const { data: aiInsightsList = [], isLoading: loadAi } = useQuery({
    queryKey: ["ai-insight", activeReport?.id],
    enabled: !!activeReport?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_insights")
        .select("*")
        .eq("report_id", activeReport!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    }
  });
  
  const aiInsight = (aiInsightsList.length > 0 ? aiInsightsList[0] : null) as any;

  const isLoading = loadGa || loadAds || loadFbAds || loadGsc || loadAi;

  // -- CALCULATIONS --
  // We keep them separate per user request, and only merge at the end.

  // GA4
  const gaSessions = gaMetrics.reduce((sum, item) => sum + (item.sessions || 0), 0);
  const gaUsers = gaMetrics.reduce((sum, item) => sum + (item.total_users || 0), 0);
  const gaPageViews = gaMetrics.reduce((sum, item) => sum + Number(item.page_views || 0), 0);
  const gaAvgSessionDuration = gaSessions > 0 
    ? gaMetrics.reduce((sum, item) => sum + (Number(item.average_session_duration || 0) * Number(item.sessions || 0)), 0) / gaSessions 
    : 0;
  
  // Função para formatar duração (segundos -> MM:SS)
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  };

  // Google Ads
  const adsCost = adsMetrics.reduce((sum, item) => sum + (item.cost || 0), 0);
  const adsClicks = adsMetrics.reduce((sum, item) => sum + (item.clicks || 0), 0);
  const adsConversions = adsMetrics.reduce((sum, item) => sum + (item.conversions || 0), 0);
  const adsCpa = adsConversions > 0 ? adsCost / adsConversions : 0;

  const topAdsCampaigns = useMemo(() => {
    const map = new Map<string, any>();
    adsMetrics.forEach(d => {
      const name = d.campaign_name || "Desconhecido";
      if (!map.has(name)) {
        map.set(name, { name, impressions: 0, clicks: 0, cost: 0, conversions: 0 });
      }
      const c = map.get(name);
      c.impressions += d.impressions || 0;
      c.clicks += d.clicks || 0;
      c.cost += Number(d.cost || 0);
      c.conversions += Number(d.conversions || 0);
    });
    return Array.from(map.values()).sort((a, b) => b.cost - a.cost).slice(0, 5); // Top 5
  }, [adsMetrics]);

  // Facebook Ads
  const fbCost = fbAdsMetrics.reduce((sum, item) => sum + (item.spend || 0), 0);
  const fbClicks = fbAdsMetrics.reduce((sum, item) => sum + (item.clicks || 0), 0);
  const fbConversions = fbAdsMetrics.reduce((sum, item) => sum + (item.conversions || 0), 0);
  const fbCpa = fbConversions > 0 ? fbCost / fbConversions : 0;

  // GSC
  const gscClicks = gscMetrics.reduce((sum, item) => sum + (item.clicks || 0), 0);
  const gscImpressions = gscMetrics.reduce((sum, item) => sum + (item.impressions || 0), 0);

  // FINAL SUMMATION (Only at the end)
  const totalCost = adsCost + fbCost;
  const totalConversions = adsConversions + fbConversions;
  const blendedCpa = totalConversions > 0 ? totalCost / totalConversions : 0;
  const totalPaidClicks = adsClicks + fbClicks;

  // CHART DATA (MERGED FOR CONSOLIDATION)
  // We need to merge arrays by date for the consolidated chart
  const mergedChartData = useMemo(() => {
    const map = new Map<string, any>();
    
    // helper to add
    const add = (date: string, key: string, val: number) => {
      if(!date) return;
      if (!map.has(date)) map.set(date, { date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) });
      map.get(date)[key] = (map.get(date)[key] || 0) + val;
    };

    adsMetrics.forEach(d => {
      add(d.metric_date, "adsCost", d.cost || 0);
      add(d.metric_date, "adsConv", d.conversions || 0);
    });
    fbAdsMetrics.forEach(d => {
      add(d.metric_date, "fbCost", d.spend || 0);
      add(d.metric_date, "fbConv", d.conversions || 0);
    });

    const arr = Array.from(map.values());
    arr.forEach(d => {
      d.totalCost = (d.adsCost || 0) + (d.fbCost || 0);
      d.totalConv = (d.adsConv || 0) + (d.fbConv || 0);
    });

    return arr;
  }, [adsMetrics, fbAdsMetrics]);

  const generateAiInsights = async (customKey?: string) => {
    const keyToUse = customKey || import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY || localStorage.getItem("openai_api_key");
    if (!keyToUse || typeof keyToUse !== "string" || keyToUse.trim() === "") {
      console.warn("Chave da API OpenAI não encontrada no arquivo .env (VITE_OPENAI_API_KEY). Geração IA ignorada.");
      return;
    }
    if (!activeReport) return;

    setIsGeneratingAi(true);

    try {
      const promptData = {
        cliente: activeReport.name || "Cliente",
        periodo_analisado: dateRange === "yesterday" ? "Ontem" : `Últimos ${dateRange} dias (${startDateStr} a ${endDateStr})`,
        google_ads: {
          investimento: adsCost,
          cliques: adsClicks,
          conversoes: adsConversions,
          cpa: adsCpa,
          top_campanhas: topAdsCampaigns.map(c => ({ nome: c.name, investimento: c.cost, conversoes: c.conversions }))
        },
        meta_ads_facebook: {
          investimento: fbCost,
          cliques: fbClicks,
          conversoes: fbConversions,
          cpa: fbCpa
        },
        consolidado_trafego_pago: {
          investimento_total: totalCost,
          conversoes_totais: totalConversions,
          cpa_blended_geral: blendedCpa
        },
        ga4: {
          sessoes: gaSessions,
          usuarios: gaUsers,
          pageviews: gaPageViews,
          tempo_medio_sessao_segundos: gaAvgSessionDuration
        },
        seo_search_console: {
          cliques_organicos: gscClicks,
          impressoes: gscImpressions
        },
        crm_nectar: {
          total_oportunidades: nectarDeals?.length || 0,
          vendas_ganhas: nectarDeals?.filter((d: any) => d.status === 'Ganho').length || 0,
          receita_total: nectarDeals?.filter((d: any) => d.status === 'Ganho').reduce((s: number, d: any) => s + (Number(d.value) || 0), 0) || 0
        }
      };
      
      const rawMetrics = {
        google_ads: { cost: adsCost, clicks: adsClicks, conversions: adsConversions, cpa: adsCpa },
        meta_ads: { cost: fbCost, clicks: fbClicks, conversions: fbConversions, cpa: fbCpa },
        gsc: { clicks: gscClicks, impressions: gscImpressions },
        ga4: { sessions: gaSessions, users: gaUsers, pageviews: gaPageViews, avgDuration: gaAvgSessionDuration },
        consolidated: { totalCost, totalConversions, blendedCpa, totalClicks: totalPaidClicks },
        totalRevenue: nectarDeals?.filter((d: any) => d.status === 'Ganho').reduce((s: number, d: any) => s + (Number(d.value) || 0), 0) || 0,
        wonDealsLength: nectarDeals?.filter((d: any) => d.status === 'Ganho').length || 0
      };

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${keyToUse.trim()}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content: `Você é um Diretor Senior de Growth Marketing e Estrategista de alta performance de uma agência de publicidade de elite. Seu papel é analisar os dados de tráfego pago (Google Ads e Meta Ads), SEO (Search Console) e tráfego web (GA4) de uma empresa e gerar um Parecer Executivo e Estratégico extremamente profissional, claro, motivador e analítico.
Use formatação Markdown limpa e elegante (negrito nos KPIs de destaque e bullet points claros), seguindo OBRIGATORIAMENTE ESTA ESTRUTURA EXATA:
# 📊 Parecer Executivo de Growth & Performance
## 1. 📈 Resumo Executivo (O Cenário Geral)
## 2. 🎯 Pontos de Força & Alavanca (O que está acelerando resultados)
## 3. ⚠️ Oportunidades de Correção (Onde otimizar o investimento)
## 4. 🚀 Plano de Ação Estratégico (Recomendações Práticas)

Diretrizes de Especialista:
- IMPORTANTE E OBRIGATÓRIO: Nunca mencione que você é uma IA, inteligência artificial, robô, sistema automatizado ou modelo do OpenAI. Assuma 100% a postura de uma diretoria humana experiente assinando este documento estratégico para a liderança da empresa.
- Seja ultra-preciso nas análises financeiras, destacando o ROAS/CPA e a qualidade da conversão.
- Entregue recomendações acionáveis (ex: sugestão para testar novos criativos no Meta Ads, realocar verbas para campanhas campeãs de Google Ads ou explorar landing pages para as palavras-chave do Search Console).
- Nunca invente números fora do JSON entregue, mas demonstre domínio comercial profundo interpretando o peso de cada canal no resultado final.`
            },
            {
              role: "user",
              content: `Aqui estão os dados consolidados do período para a empresa ${activeReport.name}:\n\n${JSON.stringify(promptData, null, 2)}\n\nPor favor, gere a leitura executiva estratégica de Growth em português agora.`
            }
          ]
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || `Erro de comunicação ao processar parecer (Status: ${res.status})`);
      }

      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("O processamento retornou uma resposta vazia.");
      }

      const { error: dbErr } = await supabase.from("ai_insights").insert({
        report_id: activeReport.id,
        insight_text: content,
        analysis_period: `Período: ${startDateStr} a ${endDateStr} (${dateRange === "yesterday" ? "Ontem" : `Últimos ${dateRange} dias`})`
      });

      if (dbErr) throw dbErr;

      await queryClient.invalidateQueries({ queryKey: ["ai-insight", activeReport.id] });
      toast.success("📊 Parecer executivo consolidado com sucesso com base nas últimas métricas!");
    } catch (err: any) {
      console.error("Erro na geração IA automática:", err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Gatilho reativo inteligente: dispara análise IA sozinho se a opção automática estiver ligada, houver dados e não houver análise para o período
  useEffect(() => {
    if (autoAiEnabled && activeReport && !isLoading && !aiInsight && !isGeneratingAi) {
      const temDados = adsCost > 0 || fbCost > 0 || gscClicks > 0 || gaSessions > 0;
      if (temDados) {
        const timer = setTimeout(() => {
          generateAiInsights();
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [autoAiEnabled, activeReport, isLoading, aiInsight, adsCost, fbCost, gscClicks, gaSessions]);

  return (
    <AppShell>
      <PageHeader
        title="Relatório Executivo"
        description="Central de performance operacional: campanhas, métricas vitais e parecer estratégico consolidado."
        actions={
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {isClient ? (
              <div className="flex items-center h-10 px-4 rounded-md bg-muted/50 border border-border/60 text-xs font-semibold text-foreground backdrop-blur-sm">
                🏢 {activeReport?.name || "Empresa Vinculada"}
              </div>
            ) : (
              <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                <SelectTrigger className="w-[180px] bg-card/50 backdrop-blur-sm border-border/50">
                  <SelectValue placeholder="Selecione o Cliente" />
                </SelectTrigger>
                <SelectContent>
                  {reports.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px] bg-card/50 backdrop-blur-sm border-border/50">
                <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yesterday">Ontem</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="this_month">Mês Atual</SelectItem>
                <SelectItem value="last_month">Mês Anterior</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <main className="flex-1 p-6 lg:p-10 space-y-12 max-w-7xl mx-auto w-full relative">
        
        {/* Background Gradients for Glassmorphism feel */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10" />

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground animate-pulse font-medium">Consolidando métricas e parecer executivo...</p>
          </div>
        ) : !activeReport ? (
          <div className="text-center py-20 text-muted-foreground bg-card/30 backdrop-blur-sm rounded-2xl border border-border/50 shadow-sm">
            Selecione um cliente para visualizar o relatório executivo.
          </div>
        ) : (
          <div className="space-y-16">
            <ExecutiveSummaryTab 
              activeReport={activeReport} 
              startDateStr={startDateStr} 
              endDateStr={endDateStr} 
              isClient={isClient}
              days={dateRange}
              fullDataContext={{
                cliente: activeReport.name || "Cliente",
                periodo_analisado: dateRange === "yesterday" ? "Ontem" : `Últimos ${dateRange} dias (${startDateStr} a ${endDateStr})`,
                google_ads: {
                  investimento: adsCost,
                  cliques: adsClicks,
                  conversoes: adsConversions,
                  cpa: adsCpa,
                  top_campanhas: topAdsCampaigns.map(c => ({ nome: c.name, investimento: c.cost, conversoes: c.conversions }))
                },
                meta_ads_facebook: {
                  investimento: fbCost,
                  cliques: fbClicks,
                  conversoes: fbConversions,
                  cpa: fbCpa
                },
                consolidado_trafego_pago: {
                  investimento_total: totalCost,
                  conversoes_totais: totalConversions,
                  cpa_blended_geral: blendedCpa
                },
                ga4: {
                  sessoes: gaSessions,
                  usuarios: gaUsers,
                  pageviews: gaPageViews,
                  tempo_medio_sessao_segundos: gaAvgSessionDuration
                },
                seo_search_console: {
                  cliques_organicos: gscClicks,
                  impressoes: gscImpressions
                },
                crm_nectar: {
                  total_oportunidades: nectarDeals?.length || 0,
                  vendas_ganhas: nectarDeals?.filter((d: any) => d.status === 'Ganho').length || 0,
                  receita_total: nectarDeals?.filter((d: any) => d.status === 'Ganho').reduce((s: number, d: any) => s + (Number(d.value) || 0), 0) || 0
                }
              }}
              rawMetrics={{
                google_ads: { cost: adsCost, clicks: adsClicks, conversions: adsConversions, cpa: adsCpa },
                meta_ads: { cost: fbCost, clicks: fbClicks, conversions: fbConversions, cpa: fbCpa },
                gsc: { clicks: gscClicks, impressions: gscImpressions },
                ga4: { sessions: gaSessions, users: gaUsers, pageviews: gaPageViews, avgDuration: gaAvgSessionDuration },
                consolidated: { totalCost, totalConversions, blendedCpa, totalClicks: totalPaidClicks },
                totalRevenue: nectarDeals?.filter((d: any) => d.status === 'Ganho').reduce((s: number, d: any) => s + (Number(d.value) || 0), 0) || 0,
                wonDealsLength: nectarDeals?.filter((d: any) => d.status === 'Ganho').length || 0
              }}
            />
          </div>
        )}
      </main>
    </AppShell>
  );
}
