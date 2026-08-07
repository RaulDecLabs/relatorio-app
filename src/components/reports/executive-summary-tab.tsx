import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Brain, Wand2, RefreshCcw, FileText, CheckCircle2, AlertTriangle, Lightbulb, Target } from "lucide-react";
import ReactMarkdown from 'react-markdown';

export function ExecutiveSummaryTab({ activeReport, startDateStr, endDateStr, isClient, days }: { activeReport: any, startDateStr: string, endDateStr: string, isClient: boolean, days: string }) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  // 1. Fetch saved summary
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
      const res = await fetch('/api/generate-executive-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: activeReport.id,
          days: parseInt(days) || 7
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

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  if (isLoading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Carregando Parecer...</div>;
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

  const d = summary.summary_data || {};
  const execSummary = d.executive_summary || {};
  const insights = d.key_insights || [];
  const strategic = d.strategic_reading || "";
  const impacts = d.business_impact || [];
  const steps = d.next_steps || [];

  return (
    <div className="space-y-12 pb-12 animate-in fade-in duration-700">
      
      {/* HEADER TIPO SLIDE 1 */}
      <div className="bg-slate-900 text-white p-12 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -ml-20 -mb-20"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-16">
            <h5 className="text-slate-300 font-bold tracking-widest text-xs uppercase">Parecer Executivo Institucional</h5>
            {!isClient && (
              <Button onClick={handleGenerate} disabled={isGenerating} variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                {isGenerating ? <RefreshCcw className="w-3 h-3 animate-spin mr-2" /> : <RefreshCcw className="w-3 h-3 mr-2" />}
                Regerar IA
              </Button>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">Resultados das <br/>Ações e Vendas</h1>
          <p className="text-slate-300 text-lg max-w-2xl font-light">Consolidação de investimentos em mídia, engajamento digital e performance comercial.</p>
          <div className="mt-12 pt-6 border-t border-slate-700/50 flex flex-col md:flex-row md:items-center gap-4 text-sm text-slate-400">
            <span><strong>Reunião Executiva</strong> — Diretoria</span>
            <span className="hidden md:inline">•</span>
            <span>Período analisado: {startDateStr} a {endDateStr}</span>
          </div>
        </div>
      </div>

      {/* SUMÁRIO EXECUTIVO SLIDE 2 */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Sumário Executivo</h2>
        <p className="text-muted-foreground">Visão consolidada do investimento e retorno no período.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <Card className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-0 shadow-sm flex flex-col items-center text-center">
            <div className="text-3xl font-black text-indigo-700 dark:text-indigo-400 mb-2">{formatCurrency(execSummary.total_investment)}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Investimento Total</div>
          </Card>
          <Card className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-0 shadow-sm flex flex-col items-center text-center">
            <div className="text-3xl font-black text-indigo-700 dark:text-indigo-400 mb-2">{execSummary.total_opportunities || 0}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Oportunidades (Leads)</div>
          </Card>
          <Card className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-0 shadow-sm flex flex-col items-center text-center">
            <div className="text-3xl font-black text-indigo-700 dark:text-indigo-400 mb-2">{execSummary.total_sales || 0}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Vendas Concluídas</div>
          </Card>
          <Card className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-0 shadow-sm flex flex-col items-center text-center">
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-2">{(execSummary.roi || 0).toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">ROI Estimado</div>
          </Card>
        </div>

        <div className="mt-8 pt-8">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Principais Insights
          </h3>
          <ul className="space-y-4">
            {insights.map((item: string, i: number) => (
              <li key={i} className="flex gap-3 text-slate-700 dark:text-slate-300 items-start">
                <div className="mt-1.5 w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></div>
                <p className="leading-relaxed">{item}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ESTRATÉGIA E NEGÓCIO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pt-12 border-t border-border/40">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Leitura Estratégica</h2>
          <p className="text-muted-foreground text-lg">Como o investimento se traduziu em resultados concretos no período avaliado.</p>
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-8 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 mt-6">
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-lg">
              {strategic}
            </p>
          </div>
        </div>
        
        <Card className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl flex flex-col justify-center border-0">
          <h3 className="text-xl font-bold mb-4">Nota Metodológica</h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            Os valores refletem a sincronização do ecossistema digital (Google Ads, Meta Ads e GA4) em cruzamento com as vendas efetivadas no CRM Nectar.
            <br/><br/>
            Recomenda-se a análise deste documento em conjunto com os dashboards operacionais para leitura aprofundada de micro-conversões.
          </p>
        </Card>
      </div>

      {/* IMPACTO NO NEGÓCIO */}
      <div className="pt-12 border-t border-border/40">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Impacto para o Negócio</h2>
        <p className="text-muted-foreground mb-8">Ganhos qualitativos da estratégia de divulgação consolidada.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {impacts.map((item: any, i: number) => (
            <Card key={i} className="p-8 bg-slate-50/50 dark:bg-slate-900/50 border-0 shadow-sm flex gap-6">
              <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center text-xl font-black flex-shrink-0 shadow-md">
                {i + 1}
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{item.title}</h4>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{item.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* PROXIMOS PASSOS */}
      <div className="pt-12 border-t border-border/40">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Próximos Passos</h2>
        <p className="text-muted-foreground mb-8">Recomendações para elevar a maturidade analítica e o retorno nas próximas ondas.</p>
        
        <div className="space-y-4">
          {steps.map((item: any, i: number) => (
            <Card key={i} className="p-6 bg-slate-50/30 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 shadow-sm flex gap-6 items-center">
              <div className="text-4xl font-black text-indigo-200 dark:text-indigo-900 w-16 text-center">
                0{i + 1}
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">{item.title}</h4>
                <p className="text-slate-600 dark:text-slate-400 text-sm">{item.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

    </div>
  );
}
