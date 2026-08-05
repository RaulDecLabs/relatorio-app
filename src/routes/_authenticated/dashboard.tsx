import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, DollarSign, Target, BarChart3, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: clientCount } = useQuery({
    queryKey: ["clients-count"],
    queryFn: async () => {
      const { count } = await supabase.from("reports_config").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  return (
    <AppShell title="Dashboard">
      <PageHeader
        title="Visão geral"
        description="Performance consolidada de todos os clientes da agência."
        actions={<Button size="sm"><BarChart3 className="mr-2 h-4 w-4" />Ver parecer executivo</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Clientes ativos" value={String(clientCount ?? 0)} icon={Users} hint="Total cadastrado" />
        <KpiCard label="Investimento total" value="R$ 0" icon={DollarSign} hint="Sem integrações de mídia" />
        <KpiCard label="Leads gerados" value="0" icon={Target} hint="Sem conversões" />
        <KpiCard label="ROAS médio" value="-" icon={TrendingUp} hint="Sem dados de retorno" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/70 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Performance por canal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              Gráficos serão alimentados quando dados reais de Google Analytics forem importados nas tabelas correspondentes.
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Resumo Executivo de Performance</CardTitle>
            <Badge variant="secondary" className="gap-1"><BarChart3 className="h-3 w-3" />Ativo</Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InsightRow severity="info" text="Nenhum relatório com dados configurado ainda. Conecte fontes e campanhas para receber leituras estratégicas consolidadas da sua operação." />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function InsightRow({ severity, text }: { severity: "warning" | "success" | "info"; text: string }) {
  const map = {
    warning: "text-warning",
    success: "text-success",
    info: "text-muted-foreground",
  } as const;
  return (
    <div className="flex items-start gap-2 rounded-md bg-muted/40 p-3">
      <AlertCircle className={`mt-0.5 h-4 w-4 shrink-0 ${map[severity]}`} />
      <span className="leading-snug">{text}</span>
    </div>
  );
}
