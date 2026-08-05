import React, { useMemo } from "react";
import { 
  Activity, DollarSign, MousePointer, Globe, Percent, TrendingUp, Award, BarChart2 
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

interface MetaAdsTabProps {
  fbAdsMetrics: any[];
  activeReport: ReportConfig;
}

export function MetaAdsTab({ fbAdsMetrics, activeReport }: MetaAdsTabProps) {
  const data = useMemo(() => {
    const totalFbAdsCost = fbAdsMetrics.reduce((sum, item) => sum + (item.spend || 0), 0);
    const totalFbAdsClicks = fbAdsMetrics.reduce((sum, item) => sum + (item.clicks || 0), 0);
    const totalFbAdsImpressions = fbAdsMetrics.reduce((sum, item) => sum + (item.impressions || 0), 0);
    const totalFbAdsConversions = fbAdsMetrics.reduce((sum, item) => sum + (item.conversions || 0), 0);
    const totalFbAdsConversionsValue = fbAdsMetrics.reduce((sum, item) => sum + (item.conversions_value || 0), 0);
    
    const avgFbAdsCTR = totalFbAdsImpressions > 0 
      ? (totalFbAdsClicks / totalFbAdsImpressions) * 100 
      : 0;

    const avgFbAdsCPC = totalFbAdsClicks > 0 
      ? totalFbAdsCost / totalFbAdsClicks 
      : 0;
    
    const fbAdsROAS = totalFbAdsCost > 0 
      ? totalFbAdsConversionsValue / totalFbAdsCost 
      : 0;

    const fbAdsCPL = totalFbAdsConversions > 0 
      ? totalFbAdsCost / totalFbAdsConversions 
      : 0;

    const fbCampaignMap: { [name: string]: { name: string; impressions: number; clicks: number; spend: number; conversions: number; conversionsValue: number } } = {};
    fbAdsMetrics.forEach(item => {
      const cName = item.campaign_name || "Campanha Sem Nome";
      if (!fbCampaignMap[cName]) {
        fbCampaignMap[cName] = { name: cName, impressions: 0, clicks: 0, spend: 0, conversions: 0, conversionsValue: 0 };
      }
      fbCampaignMap[cName].impressions += item.impressions || 0;
      fbCampaignMap[cName].clicks += item.clicks || 0;
      fbCampaignMap[cName].spend += item.spend || 0;
      fbCampaignMap[cName].conversions += item.conversions || 0;
      fbCampaignMap[cName].conversionsValue += item.conversions_value || 0;
    });
    const fbCampaignData = Object.values(fbCampaignMap).sort((a, b) => b.spend - a.spend);

    const fbAdsDateMap: { [date: string]: { date: string; spend: number; clicks: number; conversions: number } } = {};
    fbAdsMetrics.forEach(item => {
      const d = item.metric_date;
      if (!fbAdsDateMap[d]) {
        fbAdsDateMap[d] = { date: d, spend: 0, clicks: 0, conversions: 0 };
      }
      fbAdsDateMap[d].spend += item.spend || 0;
      fbAdsDateMap[d].clicks += item.clicks || 0;
      fbAdsDateMap[d].conversions += item.conversions || 0;
    });
    const fbAdsChartData = Object.values(fbAdsDateMap).sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalFbAdsCost,
      totalFbAdsClicks,
      totalFbAdsImpressions,
      totalFbAdsConversions,
      totalFbAdsConversionsValue,
      avgFbAdsCTR,
      avgFbAdsCPC,
      fbAdsROAS,
      fbAdsCPL,
      fbCampaignData,
      fbAdsChartData
    };
  }, [fbAdsMetrics]);

  if (fbAdsMetrics.length === 0) {
    return (
      <Card className="border-border/70 shadow-none p-12 text-center bg-card/60 backdrop-blur-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BarChart2 className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Tabela de Facebook Ads "{activeReport.fb_ads_table_name || 'Desconhecida'}" vazia</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
          Nenhum dado importado para o Facebook Ads da empresa **{activeReport.name}** ainda. Envie dados via n8n para visualizar.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle 
        title="Meta Ads (Facebook & Instagram)" 
        description="Desempenho de campanhas de tráfego pago na rede Meta." 
        icon={Activity} 
        color="blue" 
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CustomKpiCard label="Investimento" value={data.totalFbAdsCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={DollarSign} hint="Gasto total no período" color="blue" />
        <CustomKpiCard label="Cliques (Link)" value={data.totalFbAdsClicks.toLocaleString("pt-BR")} icon={MousePointer} hint="Cliques no anúncio" color="indigo" />
        <CustomKpiCard label="Impressões" value={data.totalFbAdsImpressions.toLocaleString("pt-BR")} icon={Globe} hint="Aparições do anúncio" color="purple" />
        <CustomKpiCard label="CTR" value={`${data.avgFbAdsCTR.toFixed(2)}%`} icon={Percent} hint="Taxa de Cliques" color="green" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CustomKpiCard label="CPC Médio" value={data.avgFbAdsCPC.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={DollarSign} hint="Custo Por Clique" color="amber" />
        <CustomKpiCard label="Conversões" value={data.totalFbAdsConversions.toLocaleString("pt-BR")} icon={TrendingUp} hint="Ações de valor realizadas" color="green" />
        <CustomKpiCard label="CPL" value={data.fbAdsCPL.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={Activity} hint="Custo por Lead/Conversão" color="red" />
        <CustomKpiCard label="ROAS" value={`${data.fbAdsROAS.toFixed(2)}x`} icon={Award} hint="Retorno sobre investimento" color="cyan" />
      </div>

      {/* Daily Performance Chart */}
      <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-blue-500/5 to-transparent">
          <div>
            <CardTitle className="text-base font-bold tracking-tight">Desempenho Diário — Meta Ads</CardTitle>
            <CardDescription>Evolução diária de investimento e cliques nas campanhas Meta.</CardDescription>
          </div>
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20 gap-1.5 font-semibold shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" /> Meta Ads Ativo
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.fbAdsChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFbSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorFbClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={8} tickFormatter={(val) => { const [, m, d] = val.split('-'); return `${d}/${m}`; }} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dx={-8} />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Area type="monotone" dataKey="spend" stroke="#3b82f6" strokeWidth={2.5} name="Investimento (R$)" fillOpacity={1} fill="url(#colorFbSpend)" />
                <Area type="monotone" dataKey="clicks" stroke="#8b5cf6" strokeWidth={2.5} name="Cliques" fillOpacity={1} fill="url(#colorFbClicks)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Performance Table */}
      <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-lg overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-bold tracking-tight">Desempenho por Campanha</CardTitle>
          <CardDescription>Métricas detalhadas por campanha de anúncios do Meta (Facebook & Instagram).</CardDescription>
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
                <TableHead className="text-right">Investimento</TableHead>
                <TableHead className="text-right">Conversões</TableHead>
                <TableHead className="text-right pr-6">ROAS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.fbCampaignData.map((campaign, idx) => {
                const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
                const cpc = campaign.clicks > 0 ? campaign.spend / campaign.clicks : 0;
                const roas = campaign.spend > 0 ? campaign.conversionsValue / campaign.spend : 0;
                return (
                  <TableRow key={idx}>
                    <TableCell className="font-medium pl-6">{campaign.name}</TableCell>
                    <TableCell className="text-right">{campaign.impressions.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">{campaign.clicks.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">{ctr.toFixed(2)}%</TableCell>
                    <TableCell className="text-right">{cpc.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                    <TableCell className="text-right">{campaign.spend.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</TableCell>
                    <TableCell className="text-right">{campaign.conversions.toFixed(1)}</TableCell>
                    <TableCell className="text-right pr-6 font-semibold text-primary">{roas.toFixed(2)}x</TableCell>
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
