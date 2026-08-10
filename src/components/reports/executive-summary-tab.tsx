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
  const media_strategy = d.media_strategy || [];
  const channel_perf = d.channel_performance || {};
  const impacts = d.business_impact || [];
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
              Resultados das<br />Ações de Divulgação
            </h1>
            <p className="text-slate-300/90 text-lg md:text-xl font-light leading-relaxed max-w-2xl">
              Consolidação de investimentos em mídia, mobilização e atração de talentos.
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiBlock label="Investimento Total" value={fmt(exec.total_investment)} icon={DollarSign} color="blue" />
          <KpiBlock label="Praças Impactadas" value={fmtNum(exec.total_regions || 0)} icon={Globe} color="cyan" />
          <KpiBlock label="Candidatos (Leads)" value={fmtNum(exec.total_leads)} icon={Users} color="indigo" />
          <KpiBlock label="Custo por Candidato" value={fmt(exec.cpl)} icon={Target} color="amber" />
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
          SEÇÃO 3: ESTRATÉGIA DE MÍDIA DIGITAL
      ═══════════════════════════════════════════════════════════════ */}
      {media_strategy.length > 0 && (
        <div className="pt-14 space-y-8 border-t border-border/30 mt-14">
          <div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Estratégia de Mídia Digital</h2>
            <p className="text-muted-foreground mt-1">Como o investimento em Ads foi operacionalizado.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {media_strategy.map((strat: any, i: number) => (
              <Card key={i} className="p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                <div className="w-10 h-10 rounded-full bg-indigo-900 dark:bg-indigo-600 text-white flex items-center justify-center font-bold mb-4">{i + 1}</div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2">{strat.title}</h4>
                <p className="text-slate-600 dark:text-slate-400 text-sm">{strat.description}</p>
              </Card>
            ))}
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
            {impacts.map((item: any, i: number) => (
                <Card key={i} className="p-6 bg-[#1a233a] dark:bg-slate-900/50 text-white border-0 shadow-sm flex gap-5">
                  <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-bold mb-1.5">{item.title}</h4>
                    <p className="text-slate-300 text-sm leading-relaxed">{item.description}</p>
                  </div>
                </Card>
            ))}
          </div>
        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════
          SEÇÃO 7: PRÓXIMOS PASSOS
      ═══════════════════════════════════════════════════════════════ */}
      {steps.length > 0 && (
        <div className="pt-14 space-y-8 border-t border-border/30 mt-14">
          <div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Próximos Passos</h2>
            <p className="text-muted-foreground mt-1">Recomendações para elevar a maturidade analítica e o retorno das próximas ondas de divulgação.</p>
          </div>

          <div className="space-y-4">
            {steps.map((item: any, i: number) => (
                <div key={i} className="flex gap-6 p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 rounded-xl items-center">
                  <div className="text-5xl font-black text-indigo-100 dark:text-indigo-900/50">
                    0{i + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-1">{item.title}</h4>
                    <p className="text-slate-600 dark:text-slate-400">{item.description}</p>
                  </div>
                </div>
            ))}
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
