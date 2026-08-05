import React, { useMemo } from "react";
import { 
  TrendingUp, Globe, Percent, DollarSign, Activity, ShoppingBag, Award, BarChart2 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend 
} from "recharts";
import { 
  SectionTitle, CustomKpiCard, CustomChartTooltip, ReportConfig 
} from "@/components/reports/report-ui";

interface GoogleAdsTabProps {
  adsMetrics: any[];
  activeReport: ReportConfig;
}

export function GoogleAdsTab({ adsMetrics, activeReport }: GoogleAdsTabProps) {
  const data = useMemo(() => {
    const totalAdsCost = adsMetrics.reduce((sum, item) => sum + (item.cost || 0), 0);
    const totalAdsClicks = adsMetrics.reduce((sum, item) => sum + (item.clicks || 0), 0);
    const totalAdsImpressions = adsMetrics.reduce((sum, item) => sum + (item.impressions || 0), 0);
    const totalAdsConversions = adsMetrics.reduce((sum, item) => sum + (item.conversions || 0), 0);
    const totalAdsConversionsValue = adsMetrics.reduce((sum, item) => sum + (item.conversions_value || 0), 0);

    const avgAdsCTR = totalAdsImpressions > 0 
      ? (totalAdsClicks / totalAdsImpressions) * 100 
      : 0;

    const avgAdsCPC = totalAdsClicks > 0 
      ? totalAdsCost / totalAdsClicks 
      : 0;

    const adsROAS = totalAdsCost > 0 
      ? totalAdsConversionsValue / totalAdsCost 
      : 0;

    const campaignMap: { 
      [name: string]: { 
        name: string; 
        impressions: number; 
        clicks: number; 
        cost: number; 
        conversions: number; 
        conversionsValue: number; 
      } 
    } = {};

    adsMetrics.forEach(item => {
      const cName = item.campaign_name || "Campanha Sem Nome";
      if (!campaignMap[cName]) {
        campaignMap[cName] = { 
          name: cName, 
          impressions: 0, 
          clicks: 0, 
          cost: 0, 
          conversions: 0, 
          conversionsValue: 0 
        };
      }
      campaignMap[cName].impressions += item.impressions || 0;
      campaignMap[cName].clicks += item.clicks || 0;
      campaignMap[cName].cost += item.cost || 0;
      campaignMap[cName].conversions += item.conversions || 0;
      campaignMap[cName].conversionsValue += item.conversions_value || 0;
    });
    const campaignData = Object.values(campaignMap).sort((a, b) => b.cost - a.cost);

    const adsDateMap: { 
      [date: string]: { 
        date: string; 
        cost: number; 
        clicks: number; 
        conversions: number; 
      } 
    } = {};

    adsMetrics.forEach(item => {
      const d = item.metric_date;
      if (!adsDateMap[d]) {
        adsDateMap[d] = { date: d, cost: 0, clicks: 0, conversions: 0 };
      }
      adsDateMap[d].cost += item.cost || 0;
      adsDateMap[d].clicks += item.clicks || 0;
      adsDateMap[d].conversions += item.conversions || 0;
    });
    const adsChartData = Object.values(adsDateMap).sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalAdsCost,
      totalAdsClicks,
      totalAdsImpressions,
      totalAdsConversions,
      totalAdsConversionsValue,
      avgAdsCTR,
      avgAdsCPC,
      adsROAS,
      campaignData,
      adsChartData
    };
  }, [adsMetrics]);

  if (adsMetrics.length === 0) {
    return (
      <Card className="border-border/70 shadow-none p-12 text-center bg-card/60 backdrop-blur-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BarChart2 className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Tabela de Google Ads "{activeReport.ads_table_name || 'Desconhecida'}" vazia</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
          Nenhum dado importado para o Google Ads da empresa **{activeReport.name}** ainda. Envie dados reais de campanhas via n8n para visualizar.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle 
        title="Google Ads" 
        description="Desempenho de campanhas de tráfego pago na Rede de Pesquisa e Display do Google." 
        icon={TrendingUp} 
        color="green" 
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CustomKpiCard label="Investimento Total" value={data.totalAdsCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={DollarSign} hint="Gasto total em campanhas" color="blue" />
        <CustomKpiCard label="Cliques Totais" value={data.totalAdsClicks.toLocaleString("pt-BR")} icon={TrendingUp} hint="Interações diretas" color="indigo" />
        <CustomKpiCard label="Impressões Totais" value={data.totalAdsImpressions.toLocaleString("pt-BR")} icon={Globe} hint="Visualizações de anúncios" color="purple" />
        <CustomKpiCard label="CTR Médio" value={`${data.avgAdsCTR.toFixed(2)}%`} icon={Percent} hint="Cliques / Impressões" color="green" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CustomKpiCard label="CPC Médio" value={data.avgAdsCPC.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={DollarSign} hint="Custo médio por clique" color="amber" />
        <CustomKpiCard label="Conversões" value={data.totalAdsConversions.toLocaleString("pt-BR")} icon={Activity} hint="Ações valiosas concluídas" color="green" />
        <CustomKpiCard label="Valor de Conversão" value={data.totalAdsConversionsValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={ShoppingBag} hint="Faturamento gerado" color="amber" />
        <CustomKpiCard label="ROAS Médio" value={`${data.adsROAS.toFixed(2)}x`} icon={Award} hint="Retorno sobre investimento" color="indigo" />
      </div>

      {/* Daily Cost Line Chart */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-semibold">Desempenho Diário da Conta</CardTitle>
            <CardDescription>Evolução diária de investimento e cliques.</CardDescription>
          </div>
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1.5 font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Google Ads Ativo
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.adsChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={8} tickFormatter={(val) => { const [, m, d] = val.split('-'); return `${d}/${m}`; }} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dx={-8} />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Area type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={2.5} name="Investimento (R$)" fillOpacity={1} fill="url(#colorCost)" />
                <Area type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={2.5} name="Cliques" fillOpacity={1} fill="url(#colorClicks)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Performance Table */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Desempenho por Campanha</CardTitle>
          <CardDescription>Métricas detalhadas por campanha de anúncios do Google.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Campanha</TableHead>
                <TableHead className="text-right">Impressões</TableHead>
                <TableHead className="text-right">Cliques</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">CPC Médio</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Conversões</TableHead>
                <TableHead className="text-right pr-6">ROAS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.campaignData.map((campaign, idx) => {
                const ctr = campaign.impressions > 0 
                  ? (campaign.clicks / campaign.impressions) * 100 
                  : 0;
                const cpc = campaign.clicks > 0 
                  ? campaign.cost / campaign.clicks 
                  : 0;
                const roas = campaign.cost > 0 
                  ? campaign.conversionsValue / campaign.cost 
                  : 0;
                return (
                  <TableRow key={idx}>
                    <TableCell className="font-medium pl-6">{campaign.name}</TableCell>
                    <TableCell className="text-right">{campaign.impressions.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">{campaign.clicks.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">{ctr.toFixed(2)}%</TableCell>
                    <TableCell className="text-right">
                      {cpc.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </TableCell>
                    <TableCell className="text-right">
                      {campaign.cost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </TableCell>
                    <TableCell className="text-right">{campaign.conversions.toFixed(1)}</TableCell>
                    <TableCell className="text-right pr-6 font-semibold text-primary">
                      {roas.toFixed(2)}x
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
