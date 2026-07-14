import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { 
  LayoutTemplate, Sparkles, TrendingUp, DollarSign, 
  MousePointer, Globe, BarChart2, Calendar, Target,
  Zap, Search, Facebook, Activity, Eye, Clock, Table2, History
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("7");

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
    queryKey: ["reports-configs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reports_config").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    }
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
      return data || [];
    }
  });

  const { data: adsMetrics = [], isLoading: loadAds } = useQuery({
    queryKey: ["ads-metrics", activeReport?.ads_table_name, startDateStr, endDateStr],
    enabled: !!activeReport?.ads_table_name,
    queryFn: async () => {
      const { data, error } = await supabase.from(activeReport!.ads_table_name as any).select("*").gte("metric_date", startDateStr).lte("metric_date", endDateStr).order("metric_date", { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: fbAdsMetrics = [], isLoading: loadFbAds } = useQuery({
    queryKey: ["fb-ads-metrics", activeReport?.fb_ads_table_name, startDateStr, endDateStr],
    enabled: !!activeReport?.fb_ads_table_name,
    queryFn: async () => {
      const { data, error } = await supabase.from(activeReport!.fb_ads_table_name as any).select("*").gte("metric_date", startDateStr).lte("metric_date", endDateStr).order("metric_date", { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: gscMetrics = [], isLoading: loadGsc } = useQuery({
    queryKey: ["gsc-metrics", activeReport?.gsc_table_name, startDateStr, endDateStr],
    enabled: !!activeReport?.gsc_table_name,
    queryFn: async () => {
      const { data, error } = await supabase.from(activeReport!.gsc_table_name as any).select("*").gte("metric_date", startDateStr).lte("metric_date", endDateStr).order("metric_date", { ascending: true });
      if (error) throw error;
      return data || [];
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
      return data || [];
    }
  });
  
  const aiInsight = aiInsightsList.length > 0 ? aiInsightsList[0] : null;

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

  return (
    <AppShell>
      <PageHeader
        title="Relatório Executivo"
        description="Central de inteligência comercial: campanhas, métricas vitais e análise estratégica consolidada."
      >
        <div className="flex flex-col sm:flex-row gap-4 items-center">
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
      </PageHeader>

      <main className="flex-1 p-6 lg:p-10 space-y-12 max-w-7xl mx-auto w-full relative">
        
        {/* Background Gradients for Glassmorphism feel */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10" />

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground animate-pulse font-medium">Buscando inteligência de dados...</p>
          </div>
        ) : !activeReport ? (
          <div className="text-center py-20 text-muted-foreground bg-card/30 backdrop-blur-sm rounded-2xl border border-border/50 shadow-sm">
            Selecione um cliente para visualizar o relatório executivo.
          </div>
        ) : (
          <div className="space-y-16">

            {/* SEÇÃO 1: INSIGHTS DA IA */}
            <section className="relative">
              <SectionTitle title="Insights Estratégicos (IA)" description="Leituras consolidadas da operação para acelerar tomada de decisão." icon={Sparkles} color="purple" />
              
              {aiInsight ? (
                <Card className="border-purple-500/40 shadow-lg shadow-purple-500/10 overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 flex gap-2">
                    {aiInsightsList.length > 1 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-6 text-xs bg-card hover:bg-muted border-purple-500/20 text-purple-600 dark:text-purple-400">
                            <History className="w-3 h-3 mr-1" />
                            Histórico
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                              <History className="w-5 h-5" /> 
                              Histórico de Análises (IA)
                            </DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="flex-1 pr-4 mt-4">
                            <div className="space-y-8">
                              {aiInsightsList.map((insight: any, i: number) => (
                                <div key={insight.id} className="pb-8 border-b border-border/40 last:border-0 last:pb-0">
                                  <div className="flex items-center gap-2 mb-4">
                                    <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                                      {new Date(insight.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </Badge>
                                    {i === 0 && <Badge className="bg-purple-500 hover:bg-purple-600 text-white border-none">Atual</Badge>}
                                  </div>
                                  <div className="prose prose-purple dark:prose-invert max-w-none text-sm prose-p:leading-relaxed prose-headings:text-purple-600 dark:prose-headings:text-purple-400">
                                    <ReactMarkdown>{insight.insight_text}</ReactMarkdown>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    )}
                    <Badge className="bg-purple-500 hover:bg-purple-600 text-white border-none shadow-sm flex items-center h-6">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Análise IA Ativa
                    </Badge>
                  </div>
                  <CardContent className="p-8">
                    <div className="prose prose-purple dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:text-purple-600 dark:prose-headings:text-purple-400">
                      <ReactMarkdown>{aiInsight.insight_text}</ReactMarkdown>
                    </div>
                    {aiInsight.analysis_period && (
                      <p className="text-xs text-muted-foreground mt-6 pt-4 border-t border-border/50">
                        Período analisado: {aiInsight.analysis_period}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-purple-500/30 bg-purple-500/5 backdrop-blur-md overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4">
                    <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30">Aguardando IA</Badge>
                  </div>
                  <CardContent className="p-8 flex flex-col items-center justify-center text-center min-h-[200px]">
                    <Sparkles className="w-12 h-12 text-purple-500/40 mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">Análise Inteligente via n8n</h3>
                    <p className="text-muted-foreground max-w-xl mb-4">
                      Configure o fluxo no n8n para salvar a análise no Supabase (tabela <code className="bg-muted px-1 py-0.5 rounded">ai_insights</code>). Assim que os dados chegarem, o texto formatado aparecerá aqui automaticamente!
                    </p>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* SEÇÃO 2: GOOGLE ADS */}
            <section>
              <SectionTitle title="Performance: Google Ads" description="Métricas de aquisição e eficiência da rede de pesquisa e display." icon={Search} color="blue" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KpiCard label="Investimento" value={adsCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={DollarSign} hint="Gasto total no período" color="blue" />
                <KpiCard label="Conversões" value={adsConversions.toLocaleString("pt-BR")} icon={Target} hint="Ações de valor" color="blue" />
                <KpiCard label="CPA" value={adsCpa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={Activity} hint="Custo por Conversão" color="blue" />
                <KpiCard label="Cliques" value={adsClicks.toLocaleString("pt-BR")} icon={MousePointer} hint="Tráfego gerado" color="blue" />
              </div>
              
              <Card className="border-border/50 bg-card/40 backdrop-blur-xl shadow-lg mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Table2 className="w-5 h-5 text-blue-500" /> Desempenho por Campanha (Top 5)</CardTitle>
                  <CardDescription>Detalhamento de investimento e retorno por campanha no Google Ads</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-border/50 overflow-hidden bg-card/60 backdrop-blur-md">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="font-semibold text-foreground">Campanha</TableHead>
                          <TableHead className="text-right font-semibold text-foreground">Impressões</TableHead>
                          <TableHead className="text-right font-semibold text-foreground">Cliques</TableHead>
                          <TableHead className="text-right font-semibold text-foreground">Investimento</TableHead>
                          <TableHead className="text-right font-semibold text-foreground">Conversões</TableHead>
                          <TableHead className="text-right font-semibold text-foreground">CPA</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topAdsCampaigns.length > 0 ? topAdsCampaigns.map((camp, idx) => {
                          const cpa = camp.conversions > 0 ? camp.cost / camp.conversions : 0;
                          return (
                            <TableRow key={idx} className="hover:bg-muted/20">
                              <TableCell className="font-medium">{camp.name}</TableCell>
                              <TableCell className="text-right">{camp.impressions.toLocaleString("pt-BR")}</TableCell>
                              <TableCell className="text-right">{camp.clicks.toLocaleString("pt-BR")}</TableCell>
                              <TableCell className="text-right text-blue-600 dark:text-blue-400 font-semibold">{camp.cost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                              <TableCell className="text-right font-bold">{camp.conversions.toLocaleString("pt-BR")}</TableCell>
                              <TableCell className="text-right">{cpa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                            </TableRow>
                          );
                        }) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Nenhuma campanha registrada no período.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* SEÇÃO 3: META ADS (FACEBOOK) */}
            <section>
              <SectionTitle title="Performance: Meta Ads" description="Métricas de aquisição e eficiência nas redes sociais (Facebook/Instagram)." icon={Facebook} color="indigo" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard label="Investimento" value={fbCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={DollarSign} hint="Gasto total no período" color="indigo" />
                <KpiCard label="Conversões" value={fbConversions.toLocaleString("pt-BR")} icon={Target} hint="Ações de valor" color="indigo" />
                <KpiCard label="CPA" value={fbCpa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={Activity} hint="Custo por Conversão" color="indigo" />
                <KpiCard label="Cliques" value={fbClicks.toLocaleString("pt-BR")} icon={MousePointer} hint="Tráfego gerado" color="indigo" />
              </div>
            </section>

            {/* SEÇÃO 4: TRAFEGO WEB E SEO (GA4 E GSC) */}
            <section>
              <SectionTitle title="Tráfego e Orgânico" description="Comportamento do usuário no site (GA4) e presença em buscas (GSC)." icon={Globe} color="amber" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <KpiCard label="Sessões" value={gaSessions.toLocaleString("pt-BR")} icon={Globe} hint="Visitas totais ao site" color="amber" />
                <KpiCard label="Usuários" value={gaUsers.toLocaleString("pt-BR")} icon={Zap} hint="Visitantes únicos" color="amber" />
                <KpiCard label="Page Views" value={gaPageViews.toLocaleString("pt-BR")} icon={Eye} hint="Páginas visualizadas" color="amber" />
                <KpiCard label="Tempo Médio" value={formatDuration(gaAvgSessionDuration)} icon={Clock} hint="Duração por sessão" color="amber" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard label="Cliques" value={gscClicks.toLocaleString("pt-BR")} icon={MousePointer} hint="Tráfego orgânico" color="amber" />
                <KpiCard label="Impressões" value={gscImpressions.toLocaleString("pt-BR")} icon={TrendingUp} hint="Aparições orgânicas" color="amber" />
              </div>
            </section>

            {/* SEÇÃO 5: CONSOLIDAÇÃO FINANCEIRA E DE PERFORMANCE (SOMAS) */}
            <div className="my-16 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />

            <section className="pb-20">
              <div className="mb-10 text-center">
                <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent mb-3">
                  Resultado Consolidado (G.Ads + Meta)
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Resumo executivo somando os investimentos e resultados das plataformas de mídia paga ativas no período selecionado.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <Card className="bg-emerald-500/10 border-emerald-500/30 backdrop-blur-md shadow-lg shadow-emerald-500/5">
                  <CardContent className="p-8 text-center">
                    <p className="text-sm font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">Investimento Total</p>
                    <p className="text-4xl font-extrabold text-emerald-700 dark:text-emerald-300">
                      {totalCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-500/10 border-blue-500/30 backdrop-blur-md shadow-lg shadow-blue-500/5">
                  <CardContent className="p-8 text-center">
                    <p className="text-sm font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">Conversões Totais</p>
                    <p className="text-4xl font-extrabold text-blue-700 dark:text-blue-300">
                      {totalConversions.toLocaleString("pt-BR")}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-amber-500/10 border-amber-500/30 backdrop-blur-md shadow-lg shadow-amber-500/5">
                  <CardContent className="p-8 text-center">
                    <p className="text-sm font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">CPA Consolidado</p>
                    <p className="text-4xl font-extrabold text-amber-700 dark:text-amber-300">
                      {blendedCpa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Gráfico de Evolução Consolidada */}
              <Card className="border-border/50 bg-card/40 backdrop-blur-xl shadow-xl">
                <CardHeader>
                  <CardTitle>Evolução de Investimento × Conversões Totais</CardTitle>
                  <CardDescription>Comparativo temporal somando Google Ads e Meta Ads</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px] w-full mt-4">
                    {mergedChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={mergedChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                          <XAxis dataKey="date" stroke="currentColor" className="text-xs opacity-50" tickLine={false} axisLine={false} />
                          <YAxis yAxisId="left" stroke="currentColor" className="text-xs opacity-50" tickFormatter={(val) => `R$${val}`} tickLine={false} axisLine={false} />
                          <YAxis yAxisId="right" orientation="right" stroke="currentColor" className="text-xs opacity-50" tickLine={false} axisLine={false} />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Legend verticalAlign="top" height={36} />
                          <Area yAxisId="left" type="monotone" dataKey="totalCost" name="Investimento Total (R$)" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" />
                          <Area yAxisId="right" type="monotone" dataKey="totalConv" name="Conversões Totais" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorConv)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
                        Nenhum dado consolidado no período selecionado.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

            </section>

          </div>
        )}
      </main>
    </AppShell>
  );
}
