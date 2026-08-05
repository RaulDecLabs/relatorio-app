import React, { useMemo } from "react";
import { 
  Globe, TrendingUp, Percent, Activity, BarChart2 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell 
} from "recharts";
import { 
  SectionTitle, CustomKpiCard, CustomChartTooltip, ReportConfig 
} from "@/components/reports/report-ui";

interface GscTabProps {
  gscMetrics: any[];
  activeReport: ReportConfig;
}

export function GscTab({ gscMetrics, activeReport }: GscTabProps) {
  const data = useMemo(() => {
    const totalGscClicks = gscMetrics.reduce((sum, item) => sum + (item.clicks || 0), 0);
    const totalGscImpressions = gscMetrics.reduce((sum, item) => sum + (item.impressions || 0), 0);

    const avgGscCTR = totalGscImpressions > 0 
      ? (totalGscClicks / totalGscImpressions) * 100 
      : 0;

    const avgGscPosition = totalGscImpressions > 0 
      ? gscMetrics.reduce((sum, item) => sum + ((item.position || 0) * (item.impressions || 0)), 0) / totalGscImpressions
      : 0;

    // Group by Query
    const queryMap: { [query: string]: { query: string; clicks: number; impressions: number; positionSum: number; count: number } } = {};
    gscMetrics.forEach(item => {
      const q = item.query || "(not set)";
      if (!queryMap[q]) {
        queryMap[q] = { query: q, clicks: 0, impressions: 0, positionSum: 0, count: 0 };
      }
      queryMap[q].clicks += item.clicks || 0;
      queryMap[q].impressions += item.impressions || 0;
      queryMap[q].positionSum += item.position || 0;
      queryMap[q].count += 1;
    });
    const queryData = Object.values(queryMap).map(item => ({
      query: item.query,
      clicks: item.clicks,
      impressions: item.impressions,
      position: item.count > 0 ? item.positionSum / item.count : 0
    })).sort((a, b) => b.clicks - a.clicks);

    // Group by Page
    const gscPageMap: { [page: string]: { page: string; clicks: number; impressions: number; positionSum: number; count: number } } = {};
    gscMetrics.forEach(item => {
      const p = item.page || "/";
      if (!gscPageMap[p]) {
        gscPageMap[p] = { page: p, clicks: 0, impressions: 0, positionSum: 0, count: 0 };
      }
      gscPageMap[p].clicks += item.clicks || 0;
      gscPageMap[p].impressions += item.impressions || 0;
      gscPageMap[p].positionSum += item.position || 0;
      gscPageMap[p].count += 1;
    });
    const gscPageData = Object.values(gscPageMap).map(item => ({
      page: item.page,
      clicks: item.clicks,
      impressions: item.impressions,
      position: item.count > 0 ? item.positionSum / item.count : 0
    })).sort((a, b) => b.clicks - a.clicks).slice(0, 10);

    // Group by Device
    const gscDeviceMap: { [device: string]: { name: string; value: number } } = {};
    gscMetrics.forEach(item => {
      const d = item.device || "desktop";
      const name = d.charAt(0).toUpperCase() + d.slice(1);
      if (!gscDeviceMap[name]) {
        gscDeviceMap[name] = { name, value: 0 };
      }
      gscDeviceMap[name].value += item.clicks || 0;
    });
    const gscDeviceData = Object.values(gscDeviceMap).sort((a, b) => b.value - a.value);

    // Group daily metrics
    const gscDateMap: { [date: string]: { date: string; clicks: number; impressions: number } } = {};
    gscMetrics.forEach(item => {
      const d = item.metric_date;
      if (!gscDateMap[d]) {
        gscDateMap[d] = { date: d, clicks: 0, impressions: 0 };
      }
      gscDateMap[d].clicks += item.clicks || 0;
      gscDateMap[d].impressions += item.impressions || 0;
    });
    const gscChartData = Object.values(gscDateMap).sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalGscClicks,
      totalGscImpressions,
      avgGscCTR,
      avgGscPosition,
      queryData,
      gscPageData,
      gscDeviceData,
      gscChartData
    };
  }, [gscMetrics]);

  if (gscMetrics.length === 0) {
    return (
      <Card className="border-border/70 shadow-none p-12 text-center bg-card/60 backdrop-blur-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BarChart2 className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Tabela de Search Console "{activeReport.gsc_table_name || 'Desconhecida'}" vazia</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
          Nenhum dado importado para o Google Search Console da empresa **{activeReport.name}** ainda. Envie dados reais de SEO via n8n para visualizar.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle 
        title="Search Console (SEO)" 
        description="Desempenho orgânico nas buscas do Google — cliques, impressões e posicionamento." 
        icon={Globe} 
        color="purple" 
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CustomKpiCard label="Cliques Orgânicos" value={data.totalGscClicks.toLocaleString("pt-BR")} icon={TrendingUp} hint="Total de cliques em pesquisas" color="blue" />
        <CustomKpiCard label="Impressões Orgânicas" value={data.totalGscImpressions.toLocaleString("pt-BR")} icon={Globe} hint="Total de aparições em buscas" color="indigo" />
        <CustomKpiCard label="CTR Orgânico Médio" value={`${data.avgGscCTR.toFixed(2)}%`} icon={Percent} hint="Cliques / Impressões" color="green" />
        <CustomKpiCard label="Posição Média" value={data.avgGscPosition.toFixed(1)} icon={Activity} hint="Posição média nos resultados" color="amber" />
      </div>

      {/* Daily Performance Chart */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-semibold">Evolução do Tráfego Orgânico</CardTitle>
            <CardDescription>Cliques e impressões ao longo do tempo (SEO).</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.gscChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGscClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorGscImp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickFormatter={(val) => {
                    const [, m, d] = val.split('-');
                    return `${d}/${m}`;
                  }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickFormatter={(val) => val.toLocaleString("pt-BR")}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Area type="monotone" dataKey="impressions" stroke="#8b5cf6" strokeWidth={2} name="Impressões" fillOpacity={1} fill="url(#colorGscImp)" />
                <Area type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2.5} name="Cliques" fillOpacity={1} fill="url(#colorGscClicks)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pages Performance Table */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm overflow-hidden md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Páginas de Destino (SEO)</CardTitle>
            <CardDescription>Desempenho orgânico por página do site.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Página de Destino</TableHead>
                  <TableHead className="text-right">Cliques</TableHead>
                  <TableHead className="text-right">Impressões</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right pr-6">Posição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.gscPageData.map((item, idx) => {
                  const ctr = item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0;
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium pl-6 truncate max-w-[180px]" title={item.page}>
                        {item.page === "/" ? "Home (Página Inicial)" : item.page}
                      </TableCell>
                      <TableCell className="text-right">{item.clicks.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right">{item.impressions.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right">{ctr.toFixed(2)}%</TableCell>
                      <TableCell className="text-right pr-6">{item.position.toFixed(1)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Top Keywords & Device Breakdown */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-lg overflow-hidden lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold tracking-tight">Palavras-Chave Mais Buscadas</CardTitle>
            <CardDescription>Termos de pesquisa que geram tráfego orgânico para o site.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Palavra-chave</TableHead>
                  <TableHead className="text-right">Cliques</TableHead>
                  <TableHead className="text-right">Impressões</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right pr-6">Posição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.queryData.slice(0, 15).map((item, idx) => {
                  const ctr = item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0;
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium pl-6 max-w-[250px] truncate" title={item.query}>{item.query}</TableCell>
                      <TableCell className="text-right">{item.clicks.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right">{item.impressions.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right">{ctr.toFixed(2)}%</TableCell>
                      <TableCell className="text-right pr-6">{item.position.toFixed(1)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold tracking-tight">Dispositivos (SEO)</CardTitle>
            <CardDescription>Cliques orgânicos por tipo de dispositivo.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="relative h-52 w-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.gscDeviceData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" strokeWidth={2} stroke="hsl(var(--background))">
                    {data.gscDeviceData.map((_, idx) => {
                      const pieColors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#94a3b8"];
                      return <Cell key={idx} fill={pieColors[idx % pieColors.length]} />;
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold tracking-tight">{data.totalGscClicks.toLocaleString("pt-BR")}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/85 font-bold">Cliques</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs mt-3">
              {data.gscDeviceData.map((item, idx) => {
                const pieColors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#94a3b8"];
                return (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pieColors[idx % pieColors.length] }} />
                    <span className="text-muted-foreground font-medium">{item.name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
