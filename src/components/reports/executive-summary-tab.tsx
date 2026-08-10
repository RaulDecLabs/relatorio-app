import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Brain, Wand2, RefreshCcw, FileText, CheckCircle2, AlertTriangle, 
  Lightbulb, Target, TrendingUp, TrendingDown, DollarSign, Users, 
  MousePointer, Eye, Search, Globe, BarChart3, ArrowRight, Clock,
  Zap, Shield, ChevronRight, Megaphone, Monitor, Award
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecutiveSummaryTabProps {
  activeReport: any;
  startDateStr: string;
  endDateStr: string;
  isClient: boolean;
  days: string;
  fullDataContext?: any;
  rawMetrics?: any;
}

export function ExecutiveSummaryTab({ activeReport, startDateStr, endDateStr, isClient, days, fullDataContext, rawMetrics }: ExecutiveSummaryTabProps) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ["executive-summary", activeReport?.id, startDateStr, endDateStr],
    enabled: !!activeReport?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('executive_summaries')
        .select('*')
        .eq('report_id', activeReport.id)
        .eq('period_start', startDateStr)
        .eq('period_end', endDateStr)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Erro ao carregar parecer", error);
        return null;
      }
      return data;
    }
  });

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const openaiKey = localStorage.getItem("openai_api_key") || "";
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/generate-executive-summary', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          reportId: activeReport.id,
          activeReport: activeReport,
          days: parseInt(days) || 7,
          startDateStr,
          endDateStr,
          openaiApiKey: openaiKey,
          fullDataContext,
          rawMetrics
        })
      });

      if (!res.ok) {
        let errMessage = `Status ${res.status}`;
        try {
          const errData = await res.json();
          if (errData.error) errMessage = errData.error;
        } catch {
          const text = await res.text().catch(() => '');
          if (text) errMessage = text;
        }
        throw new Error(errMessage);
      }

      toast.success("Parecer Executivo gerado com sucesso!");
      refetch();
    } catch (e: any) {
      toast.error("Erro ao gerar Parecer Executivo: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const fmtNum = (val: number) => new Intl.NumberFormat('pt-BR').format(val || 0);
  const fmtPct = (val: number) => `${(val || 0).toFixed(1)}%`;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground animate-pulse font-medium">Carregando Parecer Executivo...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-card/40 rounded-xl border border-dashed border-border/80">
        <div className="bg-primary/10 p-4 rounded-full mb-4">
          <Brain className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">Nenhum Parecer Executivo gerado para este período</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
          A IA ainda não analisou os dados consolidados do cliente {activeReport?.name} entre {startDateStr} e {endDateStr}.
        </p>
        
        {!isClient ? (
          <Button onClick={handleGenerate} disabled={isGenerating} size="lg" className="gap-2">
            {isGenerating ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {isGenerating ? "Processando Análise (IA)..." : "Gerar Parecer Executivo"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground italic border-t pt-4 border-border/50">
            Aguarde seu administrador gerar o relatório deste período.
          </p>
        )}
      </div>
    );
  }

  // ────── Dados da IA ──────
  const d = summary.summary_data || {};
  const exec = d.executive_summary || {};
  const insights = d.key_insights || [];
  const channels = d.channel_analysis || {};
  const funnel = d.funnel_analysis || {};
  const strategic = d.strategic_reading || "";
  const impacts = d.business_impact || [];
  const recommendations = d.recommendations || [];
  const steps = d.next_steps || [];
  const raw = d._raw_metrics || {};

  const impactTypeConfig: Record<string, { icon: any, color: string, bg: string }> = {
    positive: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
    warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
    neutral: { icon: Lightbulb, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  };

  const priorityConfig: Record<string, { label: string, color: string, bg: string }> = {
    alta: { label: "Alta", color: "text-red-700 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800" },
    media: { label: "Média", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800" },
    baixa: { label: "Baixa", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800" },
  };

  const timelineConfig: Record<string, { color: string }> = {
    "Imediato": { color: "bg-red-500" },
    "Próxima semana": { color: "bg-amber-500" },
    "Próximo mês": { color: "bg-blue-500" },
  };

  return (
    <div className="space-y-0 pb-12 animate-in fade-in duration-700">
      
      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 1: CAPA PREMIUM
      ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-10 md:p-14 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-3xl -mr-40 -mt-40"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-3xl -ml-40 -mb-40"></div>
        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-12">
            <div className="space-y-1">
              <p className="text-xs font-bold tracking-[0.3em] uppercase text-indigo-300/80">Parecer Executivo Institucional</p>
              <div className="w-12 h-0.5 bg-indigo-400/40 mt-2"></div>
            </div>
            <div className="flex items-center gap-3">
              {!isClient && (
                <Button onClick={handleGenerate} disabled={isGenerating} variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs">
                  {isGenerating ? <RefreshCcw className="w-3 h-3 animate-spin mr-1.5" /> : <RefreshCcw className="w-3 h-3 mr-1.5" />}
                  Regerar
                </Button>
              )}
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-5 leading-[1.1] tracking-tight">
              Relatório de<br />Performance Digital
            </h1>
            <p className="text-slate-300/90 text-lg md:text-xl font-light leading-relaxed max-w-2xl">
              Consolidação de investimentos em mídia, tráfego orgânico, engajamento digital e performance comercial.
            </p>
          </div>

          <div className="mt-14 pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center gap-4 text-sm text-slate-400">
            <span className="font-semibold text-slate-300">{activeReport?.name}</span>
            <span className="hidden md:inline text-slate-600">•</span>
            <span>Período: {startDateStr} a {endDateStr}</span>
            <span className="hidden md:inline text-slate-600">•</span>
            <span className="text-indigo-300/80">{days === "yesterday" ? "Ontem" : `Últimos ${days} dias`}</span>
          </div>
        </div>
      </div>


      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 2: SUMÁRIO EXECUTIVO
      ═══════════════════════════════════════════════════════════════ */}
      <div className="pt-14 space-y-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Sumário Executivo</h2>
          <p className="text-muted-foreground mt-1">Visão consolidada do investimento e retorno no período.</p>
        </div>

        {/* Headline */}
        {exec.headline && (
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-6">
            <p className="text-lg md:text-xl font-semibold text-indigo-800 dark:text-indigo-300 text-center italic">
              "{exec.headline}"
            </p>
          </div>
        )}

        {/* KPIs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <KpiBlock label="Investimento Total" value={fmt(exec.total_investment)} icon={DollarSign} color="blue" />
          <KpiBlock label="Leads Gerados" value={fmtNum(exec.total_leads)} icon={Users} color="indigo" />
          <KpiBlock label="Vendas Fechadas" value={fmtNum(exec.total_sales)} icon={Award} color="emerald" />
          <KpiBlock label="Receita Gerada" value={fmt(exec.total_revenue)} icon={TrendingUp} color="green" />
          <KpiBlock label="ROI" value={`${(exec.roi || 0).toFixed(1)}%`} icon={exec.roi >= 0 ? TrendingUp : TrendingDown} color={exec.roi >= 0 ? "emerald" : "red"} />
          <KpiBlock label="CPL Médio" value={fmt(exec.cpl)} icon={Target} color="amber" />
          <KpiBlock label="Sessões no Site" value={fmtNum(exec.total_sessions)} icon={Monitor} color="purple" />
          <KpiBlock label="Cliques Totais" value={fmtNum(exec.total_clicks)} icon={MousePointer} color="cyan" />
        </div>

        {/* Key Insights */}
        {insights.length > 0 && (
          <div className="mt-10">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              Principais Insights
            </h3>
            <div className="grid gap-3">
              {insights.map((item: string, i: number) => (
                <div key={i} className="flex gap-4 items-start p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                  <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                    {i + 1}
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>


      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 3: ANÁLISE POR CANAL
      ═══════════════════════════════════════════════════════════════ */}
      {channels && Object.keys(channels).length > 0 && (
        <div className="pt-14 space-y-8 border-t border-border/30 mt-14">
          <div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Análise por Canal</h2>
            <p className="text-muted-foreground mt-1">Desempenho detalhado de cada canal de aquisição.</p>
          </div>

          <div className="grid gap-6">
            {/* Google Ads */}
            {channels.google_ads && (
              <ChannelCard
                title="Google Ads"
                icon={Search}
                color="blue"
                metrics={raw.google_ads ? [
                  { label: "Investimento", value: fmt(raw.google_ads.cost) },
                  { label: "Cliques", value: fmtNum(raw.google_ads.clicks) },
                  { label: "Conversões", value: fmtNum(raw.google_ads.conversions) },
                  { label: "CTR", value: fmtPct(raw.google_ads.ctr) },
                  { label: "CPC", value: fmt(raw.google_ads.cpc) },
                  { label: "CPL", value: fmt(raw.google_ads.cpl) },
                ] : []}
                summary={channels.google_ads.summary}
                highlights={channels.google_ads.highlights}
                recommendation={channels.google_ads.recommendation}
              />
            )}

            {/* Meta Ads */}
            {channels.meta_ads && (
              <ChannelCard
                title="Meta Ads (Facebook & Instagram)"
                icon={Megaphone}
                color="indigo"
                metrics={raw.meta_ads ? [
                  { label: "Investimento", value: fmt(raw.meta_ads.cost) },
                  { label: "Cliques", value: fmtNum(raw.meta_ads.clicks) },
                  { label: "Conversões", value: fmtNum(raw.meta_ads.conversions) },
                  { label: "CTR", value: fmtPct(raw.meta_ads.ctr) },
                  { label: "CPC", value: fmt(raw.meta_ads.cpc) },
                  { label: "CPL", value: fmt(raw.meta_ads.cpl) },
                ] : []}
                summary={channels.meta_ads.summary}
                highlights={channels.meta_ads.highlights}
                recommendation={channels.meta_ads.recommendation}
              />
            )}

            {/* SEO */}
            {channels.seo && (
              <ChannelCard
                title="SEO — Google Search Console"
                icon={Globe}
                color="emerald"
                metrics={raw.gsc ? [
                  { label: "Cliques Orgânicos", value: fmtNum(raw.gsc.clicks) },
                  { label: "Impressões", value: fmtNum(raw.gsc.impressions) },
                  { label: "CTR Orgânico", value: fmtPct(raw.gsc.ctr) },
                  { label: "Posição Média", value: (raw.gsc.position || 0).toFixed(1) },
                ] : []}
                summary={channels.seo.summary}
                highlights={channels.seo.highlights}
                recommendation={channels.seo.recommendation}
              />
            )}

            {/* Website / GA4 */}
            {channels.website && (
              <ChannelCard
                title="Website — Google Analytics 4"
                icon={Monitor}
                color="purple"
                metrics={raw.ga4 ? [
                  { label: "Sessões", value: fmtNum(raw.ga4.sessions) },
                  { label: "Usuários", value: fmtNum(raw.ga4.users) },
                  { label: "Pageviews", value: fmtNum(raw.ga4.pageviews) },
                  { label: "Tempo Médio", value: `${Math.floor((raw.ga4.avgDuration || 0) / 60)}m ${Math.floor((raw.ga4.avgDuration || 0) % 60)}s` },
                ] : []}
                summary={channels.website.summary}
                highlights={channels.website.highlights}
                recommendation={channels.website.recommendation}
              />
            )}
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 4: ANÁLISE DE FUNIL
      ═══════════════════════════════════════════════════════════════ */}
      {funnel && (funnel.top || funnel.middle || funnel.bottom) && (
        <div className="pt-14 space-y-8 border-t border-border/30 mt-14">
          <div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Análise de Funil</h2>
            <p className="text-muted-foreground mt-1">Jornada do cliente da primeira impressão até a conversão.</p>
          </div>

          <div className="grid gap-0">
            {/* Topo */}
            <div className="relative">
              <div className="flex gap-6 items-stretch p-6 rounded-t-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                <div className="flex flex-col items-center justify-center min-w-[80px]">
                  <div className="w-14 h-14 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Eye className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mt-2">Topo</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Awareness & Alcance</h4>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{funnel.top}</p>
                </div>
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10">
                <ChevronRight className="w-5 h-5 text-slate-400 rotate-90" />
              </div>
            </div>

            {/* Meio */}
            <div className="relative">
              <div className="flex gap-6 items-stretch p-6 bg-amber-50/70 dark:bg-amber-950/20 border-x border-amber-100 dark:border-amber-900/40">
                <div className="flex flex-col items-center justify-center min-w-[80px]">
                  <div className="w-14 h-14 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <MousePointer className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mt-2">Meio</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Engajamento & Interesse</h4>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{funnel.middle}</p>
                </div>
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10">
                <ChevronRight className="w-5 h-5 text-slate-400 rotate-90" />
              </div>
            </div>

            {/* Fundo */}
            <div className="flex gap-6 items-stretch p-6 rounded-b-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
              <div className="flex flex-col items-center justify-center min-w-[80px]">
                <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Target className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mt-2">Fundo</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Conversão & Vendas</h4>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{funnel.bottom}</p>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 5: LEITURA ESTRATÉGICA
      ═══════════════════════════════════════════════════════════════ */}
      {strategic && (
        <div className="pt-14 space-y-6 border-t border-border/30 mt-14">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            <div className="lg:col-span-2 space-y-5">
              <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Leitura Estratégica</h2>
              <p className="text-muted-foreground">Como o investimento se traduziu em resultados concretos no período avaliado.</p>
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 dark:from-indigo-950/30 dark:to-blue-950/20 p-8 rounded-2xl border border-indigo-100/80 dark:border-indigo-900/40 mt-4">
                <p className="text-slate-700 dark:text-slate-300 leading-[1.8] text-[16px]">
                  {strategic}
                </p>
              </div>
            </div>
            
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 rounded-2xl shadow-xl flex flex-col justify-center border-0">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold">Nota Metodológica</h3>
              </div>
              <p className="text-slate-300/90 text-sm leading-relaxed">
                Os valores refletem a sincronização do ecossistema digital (Google Ads, Meta Ads, GA4 e Search Console) em cruzamento com as vendas efetivadas no CRM.
              </p>
              <p className="text-slate-400/80 text-sm leading-relaxed mt-4">
                Recomenda-se a análise deste documento em conjunto com os dashboards operacionais para leitura aprofundada de micro-conversões.
              </p>
            </Card>
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 6: IMPACTO PARA O NEGÓCIO
      ═══════════════════════════════════════════════════════════════ */}
      {impacts.length > 0 && (
        <div className="pt-14 space-y-8 border-t border-border/30 mt-14">
          <div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Impacto para o Negócio</h2>
            <p className="text-muted-foreground mt-1">Ganhos qualitativos da estratégia de divulgação consolidada.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {impacts.map((item: any, i: number) => {
              const cfg = impactTypeConfig[item.type] || impactTypeConfig.neutral;
              const Icon = cfg.icon;
              return (
                <Card key={i} className="p-6 bg-white/80 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/50 shadow-sm hover:shadow-md transition-shadow flex gap-5">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", cfg.bg)}>
                    <Icon className={cn("w-6 h-6", cfg.color)} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1.5">{item.title}</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{item.description}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 7: RECOMENDAÇÕES ESTRATÉGICAS
      ═══════════════════════════════════════════════════════════════ */}
      {recommendations.length > 0 && (
        <div className="pt-14 space-y-8 border-t border-border/30 mt-14">
          <div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Recomendações Estratégicas</h2>
            <p className="text-muted-foreground mt-1">Ações práticas e acionáveis para otimizar o retorno no próximo ciclo.</p>
          </div>
          
          <div className="grid gap-4">
            {recommendations.map((item: any, i: number) => {
              const pCfg = priorityConfig[item.priority] || priorityConfig.media;
              return (
                <Card key={i} className="p-6 bg-white/80 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/50 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-3 md:min-w-[200px]">
                    <div className="text-3xl font-black text-slate-200 dark:text-slate-800 w-10 text-center">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{item.title}</h4>
                      {item.channel && (
                        <Badge variant="outline" className="text-[10px] mt-1 font-medium">{item.channel}</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed flex-1">{item.description}</p>
                  <Badge className={cn("text-[10px] font-bold uppercase tracking-wider border px-3 py-1 self-start md:self-center whitespace-nowrap", pCfg.bg, pCfg.color)}>
                    {pCfg.label}
                  </Badge>
                </Card>
              );
            })}
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 8: PRÓXIMOS PASSOS
      ═══════════════════════════════════════════════════════════════ */}
      {steps.length > 0 && (
        <div className="pt-14 space-y-8 border-t border-border/30 mt-14">
          <div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Próximos Passos</h2>
            <p className="text-muted-foreground mt-1">Cronograma de ações recomendadas para elevar a performance.</p>
          </div>

          <div className="space-y-4">
            {steps.map((item: any, i: number) => {
              const tCfg = timelineConfig[item.timeline] || timelineConfig["Próximo mês"];
              return (
                <div key={i} className="flex gap-5 items-start group">
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center pt-1">
                    <div className={cn("w-4 h-4 rounded-full shadow-sm", tCfg.color)}></div>
                    {i < steps.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 mt-1 min-h-[40px]"></div>}
                  </div>
                  
                  <Card className="flex-1 p-5 bg-white/80 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/50 shadow-sm group-hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100">{item.title}</h4>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-medium">{item.timeline}</span>
                      </div>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{item.description}</p>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-14 mt-14 border-t border-border/30 text-center">
        <p className="text-xs text-muted-foreground/60">
          Documento gerado automaticamente • {activeReport?.name} • {startDateStr} a {endDateStr}
        </p>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ══════════════════════════════════════════════════════════════

function KpiBlock({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: string }) {
  const colorMap: Record<string, { bg: string, text: string, iconBg: string }> = {
    blue:    { bg: "bg-blue-50/80 dark:bg-blue-950/20", text: "text-blue-700 dark:text-blue-400", iconBg: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400" },
    indigo:  { bg: "bg-indigo-50/80 dark:bg-indigo-950/20", text: "text-indigo-700 dark:text-indigo-400", iconBg: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400" },
    emerald: { bg: "bg-emerald-50/80 dark:bg-emerald-950/20", text: "text-emerald-700 dark:text-emerald-400", iconBg: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400" },
    green:   { bg: "bg-green-50/80 dark:bg-green-950/20", text: "text-green-700 dark:text-green-400", iconBg: "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400" },
    amber:   { bg: "bg-amber-50/80 dark:bg-amber-950/20", text: "text-amber-700 dark:text-amber-400", iconBg: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400" },
    red:     { bg: "bg-red-50/80 dark:bg-red-950/20", text: "text-red-700 dark:text-red-400", iconBg: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400" },
    purple:  { bg: "bg-purple-50/80 dark:bg-purple-950/20", text: "text-purple-700 dark:text-purple-400", iconBg: "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400" },
    cyan:    { bg: "bg-cyan-50/80 dark:bg-cyan-950/20", text: "text-cyan-700 dark:text-cyan-400", iconBg: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400" },
  };
  const cfg = colorMap[color] || colorMap.blue;

  return (
    <div className={cn("rounded-xl p-5 border border-slate-100 dark:border-slate-800/50 transition-all hover:shadow-md", cfg.bg)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", cfg.iconBg)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className={cn("text-2xl md:text-3xl font-black tracking-tight", cfg.text)}>{value}</p>
    </div>
  );
}

function ChannelCard({ title, icon: Icon, color, metrics, summary, highlights, recommendation }: {
  title: string, icon: any, color: string, metrics: { label: string, value: string }[],
  summary: string, highlights: string[], recommendation: string
}) {
  const colorMap: Record<string, { border: string, bg: string, iconBg: string, iconColor: string, highlight: string }> = {
    blue:    { border: "border-blue-200 dark:border-blue-900/50", bg: "bg-blue-50/50 dark:bg-blue-950/20", iconBg: "bg-blue-100 dark:bg-blue-900/40", iconColor: "text-blue-600 dark:text-blue-400", highlight: "bg-blue-500" },
    indigo:  { border: "border-indigo-200 dark:border-indigo-900/50", bg: "bg-indigo-50/50 dark:bg-indigo-950/20", iconBg: "bg-indigo-100 dark:bg-indigo-900/40", iconColor: "text-indigo-600 dark:text-indigo-400", highlight: "bg-indigo-500" },
    emerald: { border: "border-emerald-200 dark:border-emerald-900/50", bg: "bg-emerald-50/50 dark:bg-emerald-950/20", iconBg: "bg-emerald-100 dark:bg-emerald-900/40", iconColor: "text-emerald-600 dark:text-emerald-400", highlight: "bg-emerald-500" },
    purple:  { border: "border-purple-200 dark:border-purple-900/50", bg: "bg-purple-50/50 dark:bg-purple-950/20", iconBg: "bg-purple-100 dark:bg-purple-900/40", iconColor: "text-purple-600 dark:text-purple-400", highlight: "bg-purple-500" },
  };
  const cfg = colorMap[color] || colorMap.blue;

  return (
    <Card className={cn("overflow-hidden border-0 shadow-sm hover:shadow-lg transition-shadow", cfg.border)}>
      {/* Header with accent bar */}
      <div className={cn("h-1", cfg.highlight)}></div>
      <div className="p-6 space-y-5">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", cfg.iconBg)}>
            <Icon className={cn("w-5 h-5", cfg.iconColor)} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>
        </div>

        {/* Mini KPIs */}
        {metrics.length > 0 && (
          <div className={cn("grid grid-cols-3 md:grid-cols-6 gap-3 p-4 rounded-xl", cfg.bg)}>
            {metrics.map((m, i) => (
              <div key={i} className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{m.label}</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{m.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Analysis */}
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{summary}</p>

        {/* Highlights */}
        {highlights && highlights.length > 0 && (
          <div className="space-y-2">
            {highlights.map((h: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className={cn("w-4 h-4 mt-0.5 flex-shrink-0", cfg.iconColor)} />
                <span className="text-slate-700 dark:text-slate-300">{h}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recommendation */}
        {recommendation && (
          <div className="flex gap-3 items-start p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/50">
            <Zap className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Recomendação</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{recommendation}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
