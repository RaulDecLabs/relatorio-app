import React, { useMemo } from "react";
import { 
  Activity, Globe, MousePointer, TrendingUp, Award, Clock, 
  Percent, DollarSign, ShoppingBag, BarChart2 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell 
} from "recharts";
import { 
  SectionTitle, CustomKpiCard, ProgressBreakdownRow, 
  CustomChartTooltip, ReportConfig 
} from "@/components/reports/report-ui";

interface TrafficTabProps {
  metrics: any[];
  activeReport: ReportConfig;
}

export function TrafficTab({ metrics, activeReport }: TrafficTabProps) {
  const data = useMemo(() => {
    const totalSessions = metrics.reduce((sum, item) => sum + (item.sessions || 0), 0);
    const totalUsers = metrics.reduce((sum, item) => sum + (item.total_users || 0), 0);
    const totalPageViews = metrics.reduce((sum, item) => sum + (item.page_views || 0), 0);
    const totalEvents = metrics.reduce((sum, item) => sum + (item.events || 0), 0);
    const totalTransactions = metrics.reduce((sum, item) => sum + (item.transactions || 0), 0);
    const totalActiveUsers = metrics.reduce((sum, item) => sum + (item.active_users || 0), 0);
    const totalAdRevenue = metrics.reduce((sum, item) => sum + (item.total_ad_revenue || 0), 0);

    const rawBounceRate = totalSessions > 0
      ? (metrics.reduce((sum, item) => sum + ((item.bounce_rate || 0) * (item.sessions || 0)), 0) / totalSessions)
      : 0;
    const avgBounceRate = rawBounceRate > 1 ? rawBounceRate : rawBounceRate * 100;

    const rawEngagementRate = totalSessions > 0
      ? (metrics.reduce((sum, item) => sum + ((item.engagement_rate || 0) * (item.sessions || 0)), 0) / totalSessions)
      : 0;
    const avgEngagementRate = rawEngagementRate > 1 ? rawEngagementRate : rawEngagementRate * 100;
    
    const avgDurationSeconds = totalSessions > 0
      ? metrics.reduce((sum, item) => sum + ((item.average_session_duration || 0) * (item.sessions || 0)), 0) / totalSessions
      : 0;

    // Group by date for the time chart
    const dateMap: { [date: string]: { date: string; sessions: number; pageViews: number; events: number } } = {};
    metrics.forEach(item => {
      const d = item.metric_date;
      if (!dateMap[d]) {
        dateMap[d] = { date: d, sessions: 0, pageViews: 0, events: 0 };
      }
      dateMap[d].sessions += item.sessions || 0;
      dateMap[d].pageViews += item.page_views || 0;
      dateMap[d].events += item.events || 0;
    });
    const chartData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

    // Group by Page Path
    const pageMap: { [path: string]: { path: string; sessions: number; pageViews: number; events: number } } = {};
    metrics.forEach(item => {
      const p = item.page_path || "/";
      if (!pageMap[p]) {
        pageMap[p] = { path: p, sessions: 0, pageViews: 0, events: 0 };
      }
      pageMap[p].sessions += item.sessions || 0;
      pageMap[p].pageViews += item.page_views || 0;
      pageMap[p].events += item.events || 0;
    });
    const pageData = Object.values(pageMap).sort((a, b) => b.pageViews - a.pageViews).slice(0, 10);

    // Group by Session Source
    const sourceMap: { [source: string]: { source: string; sessions: number; users: number; transactions: number } } = {};
    metrics.forEach(item => {
      const s = item.session_source || "(not set)";
      if (!sourceMap[s]) {
        sourceMap[s] = { source: s, sessions: 0, users: 0, transactions: 0 };
      }
      sourceMap[s].sessions += item.sessions || 0;
      sourceMap[s].users += item.total_users || 0;
      sourceMap[s].transactions += item.transactions || 0;
    });
    const sourceData = Object.values(sourceMap).sort((a, b) => b.sessions - a.sessions).slice(0, 10);

    // Group by City
    const cityMap: { [city: string]: { city: string; sessions: number } } = {};
    metrics.forEach(item => {
      const c = item.city || "(not set)";
      if (!cityMap[c]) {
        cityMap[c] = { city: c, sessions: 0 };
      }
      cityMap[c].sessions += item.sessions || 0;
    });
    const cityData = Object.values(cityMap).sort((a, b) => b.sessions - a.sessions).slice(0, 5);

    // Group by Device Category
    const deviceMap: { [device: string]: { name: string; value: number } } = {};
    metrics.forEach(item => {
      const d = item.device_category || "desktop";
      const name = d.charAt(0).toUpperCase() + d.slice(1);
      if (!deviceMap[name]) {
        deviceMap[name] = { name, value: 0 };
      }
      deviceMap[name].value += item.sessions || 0;
    });
    const deviceData = Object.values(deviceMap).sort((a, b) => b.value - a.value);

    // Group by Browser
    const browserMap: { [browser: string]: { browser: string; sessions: number } } = {};
    metrics.forEach(item => {
      const b = item.browser || "(not set)";
      if (!browserMap[b]) {
        browserMap[b] = { browser: b, sessions: 0 };
      }
      browserMap[b].sessions += item.sessions || 0;
    });
    const browserData = Object.values(browserMap).sort((a, b) => b.sessions - a.sessions).slice(0, 5);

    return {
      totalSessions,
      totalUsers,
      totalPageViews,
      totalEvents,
      totalTransactions,
      totalActiveUsers,
      totalAdRevenue,
      avgBounceRate,
      avgEngagementRate,
      avgDurationSeconds,
      chartData,
      pageData,
      sourceData,
      cityData,
      deviceData,
      browserData
    };
  }, [metrics]);

  const formatDuration = (sec: number) => {
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60);
    return `${minutes}m ${seconds}s`;
  };

  if (metrics.length === 0) {
    return (
      <Card className="border-border/70 shadow-none p-12 text-center bg-card/60 backdrop-blur-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BarChart2 className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Tabela "{activeReport.table_name}" vazia</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
          Nenhum dado importado para a empresa **{activeReport.name}** ainda. Envie dados reais do Google Analytics via n8n ou API pública para visualizar o relatório.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle 
        title="Visão Geral" 
        description="Métricas consolidadas de tráfego e conversão." 
        icon={Activity} 
        color="blue" 
      />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CustomKpiCard label="Sessões" value={data.totalSessions.toLocaleString("pt-BR")} icon={Globe} hint="Volume de visitas" color="blue" />
        <CustomKpiCard label="Usuários" value={data.totalUsers.toLocaleString("pt-BR")} icon={Activity} hint="Visitantes únicos" color="cyan" />
        <CustomKpiCard label="Visualizações" value={data.totalPageViews.toLocaleString("pt-BR")} icon={MousePointer} hint="Páginas vistas" color="green" />
        <CustomKpiCard label="Eventos" value={data.totalEvents.toLocaleString("pt-BR")} icon={TrendingUp} hint="Interações totais" color="indigo" />
      </div>

      {/* Time Series Chart */}
      <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-xl overflow-hidden mt-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-blue-500/5 to-transparent">
          <div>
            <CardTitle className="text-base font-bold tracking-tight">Evolução de Tráfego Diário</CardTitle>
            <CardDescription>Sessões e visualizações consolidadas ao longo do tempo.</CardDescription>
          </div>
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20 gap-1.5 font-semibold shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" /> GA4 Ativo
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorPageViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={8} tickFormatter={(val) => { const [, m, d] = val.split('-'); return `${d}/${m}`; }} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dx={-8} />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Area type="monotone" dataKey="sessions" stroke="#3b82f6" strokeWidth={2.5} name="Sessões" fillOpacity={1} fill="url(#colorSessions)" />
                <Area type="monotone" dataKey="pageViews" stroke="#10b981" strokeWidth={2.5} name="Visualizações" fillOpacity={1} fill="url(#colorPageViews)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <SectionTitle 
        title="Comportamento" 
        description="Como os usuários interagem com seu site." 
        icon={MousePointer} 
        color="green" 
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CustomKpiCard label="Usuários Ativos" value={data.totalActiveUsers.toLocaleString("pt-BR")} icon={Award} hint="Atividade recorrente" color="blue" />
        <CustomKpiCard label="Duração Média" value={formatDuration(data.avgDurationSeconds)} icon={Clock} hint="Tempo médio logado" color="indigo" />
        <CustomKpiCard label="Taxa de Rejeição" value={`${data.avgBounceRate.toFixed(2)}%`} icon={Percent} hint="Saídas sem interação" color="red" />
        <CustomKpiCard label="Engajamento" value={`${data.avgEngagementRate.toFixed(2)}%`} icon={Activity} hint="Sessões com engajamento" color="green" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <CustomKpiCard label="Receita de Anúncios" value={data.totalAdRevenue.toLocaleString("pt-BR", { style: 'currency', currency: 'BRL' })} icon={DollarSign} hint="Faturamento gerado" color="amber" />
        <CustomKpiCard label="Transações" value={data.totalTransactions.toLocaleString("pt-BR")} icon={ShoppingBag} hint="Vendas confirmadas" color="amber" />
      </div>

      {/* Breakdown Tables Grid */}
      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        {/* Performance by Page Path */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold tracking-tight">Páginas Mais Acessadas</CardTitle>
            <CardDescription>Canais e visualizações por caminho de página.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0">
            <div className="divide-y divide-border/40">
              {data.pageData.map((page, idx) => (
                <ProgressBreakdownRow 
                  key={idx} 
                  label={page.path === "/" ? "Home (Página Inicial)" : page.path} 
                  sessions={page.pageViews} 
                  total={data.totalPageViews} 
                  color="green" 
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance by Session Source */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold tracking-tight">Principais Origens de Tráfego</CardTitle>
            <CardDescription>Distribuição de sessões e usuários por canal.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0">
            <div className="divide-y divide-border/40">
              {data.sourceData.map((source, idx) => (
                <ProgressBreakdownRow 
                  key={idx} 
                  label={source.source} 
                  sessions={source.sessions} 
                  total={data.totalSessions} 
                  color="blue" 
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <SectionTitle 
        title="Público & Dispositivos" 
        description="Quem são os usuários e como eles acessam." 
        icon={Globe} 
        color="purple" 
      />

      {/* Dimension Breakdowns Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Top Cities */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold tracking-tight">Cidades</CardTitle>
            <CardDescription>Acessos por localização geográfica.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0">
            <div className="divide-y divide-border/40">
              {data.cityData.map((item, idx) => (
                <ProgressBreakdownRow 
                  key={idx} 
                  label={item.city} 
                  sessions={item.sessions} 
                  total={data.totalSessions} 
                  color="indigo" 
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Devices Donut Chart */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold tracking-tight">Dispositivos</CardTitle>
            <CardDescription>Sessões por tipo de dispositivo.</CardDescription>
          </CardHeader>
          <CardContent className="pb-6 pt-0">
            <div className="relative flex h-52 items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {data.deviceData.map((entry, index) => {
                      const colors = {
                        Desktop: "#3b82f6",
                        Mobile: "#10b981",
                        Tablet: "#f59e0b",
                        Smarttv: "#8b5cf6",
                        Other: "#94a3b8"
                      };
                      const color = colors[entry.name as keyof typeof colors] || colors.Other;
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: any) => [`${value.toLocaleString("pt-BR")} sessões`]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-bold tracking-tight">{data.totalSessions.toLocaleString("pt-BR")}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/85 font-bold">Sessões</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs mt-3">
              {data.deviceData.map((item, idx) => {
                const colors = {
                  Desktop: "bg-blue-500",
                  Mobile: "bg-emerald-500",
                  Tablet: "bg-amber-500",
                  Smarttv: "bg-purple-500",
                  Other: "bg-slate-400"
                };
                const colorClass = colors[item.name as keyof typeof colors] || colors.Other;
                return (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", colorClass)} />
                    <span className="text-muted-foreground font-medium">{item.name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Browsers */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold tracking-tight">Navegadores</CardTitle>
            <CardDescription>Navegadores de internet utilizados.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0">
            <div className="divide-y divide-border/40">
              {data.browserData.map((item, idx) => (
                <ProgressBreakdownRow 
                  key={idx} 
                  label={item.browser} 
                  sessions={item.sessions} 
                  total={data.totalSessions} 
                  color="purple" 
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
