import React from "react"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line
} from "recharts"
import { MousePointerClick, Eye, UserPlus } from "lucide-react"

// Simple components for the UI
const Card = ({ children, className = "" }: any) => (
  <div className={`bg-card/40 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm p-6 ${className}`}>
    {children}
  </div>
)

export function OverviewTab({ 
  mergedChartData, 
  topAdsCampaigns, 
  topFbCampaigns, 
  startDateStr, 
  endDateStr 
}: any) {
  
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  
  const formatNumber = (val: number) => 
    new Intl.NumberFormat('pt-BR').format(val)

  // Chart 2: Investimento por Canal de Divulgação (Horizontal Bar Chart)
  const channelData = [
    { 
      name: 'Facebook/Meta Ads', 
      investimento: mergedChartData.reduce((acc: number, d: any) => acc + (d.fbCost || 0), 0)
    },
    { 
      name: 'Google Ads', 
      investimento: mergedChartData.reduce((acc: number, d: any) => acc + (d.adsCost || 0), 0)
    }
  ]

  // Table Data: Meta Ads + Google Ads
  const tableData = [
    ...topFbCampaigns.map((c: any) => ({
      campaign: c.name,
      channel: 'Meta Ads',
      impressions: c.impressions,
      clicks: c.clicks,
      conversions: c.conversions,
      cost: c.cost
    })),
    ...topAdsCampaigns.map((c: any) => ({
      campaign: c.name,
      channel: 'Google Ads',
      impressions: c.impressions,
      clicks: c.clicks,
      conversions: c.conversions,
      cost: c.cost
    }))
  ].sort((a, b) => b.cost - a.cost); // Sort by spend

  const totalClicks = tableData.reduce((acc, curr) => acc + curr.clicks, 0);
  const totalViews = tableData.reduce((acc, curr) => acc + curr.impressions, 0);
  const totalLeads = tableData.reduce((acc, curr) => acc + curr.conversions, 0);
  const totalCost = tableData.reduce((acc, curr) => acc + curr.cost, 0);

  const avgCpc = totalClicks > 0 ? totalCost / totalClicks : 0;
  const avgCpl = totalLeads > 0 ? totalCost / totalLeads : 0;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header section similar to PDF Page 5 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Visão Geral Consolidada</h2>
          <p className="text-muted-foreground mt-2 text-lg">
            Acompanhamento diário e distribuição do investimento em mídia digital.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico: Evolução do Investimento */}
        <Card className="flex flex-col justify-between">
          <div className="mb-6">
            <h3 className="text-xl font-bold">Evolução do Investimento no Período</h3>
            <p className="text-sm text-muted-foreground">Investimento diário consolidado ({startDateStr} a {endDateStr})</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mergedChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '8px', border: 'none', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number) => [formatCurrency(value), 'Investimento']}
                />
                <Line 
                  type="monotone" 
                  dataKey="totalCost" 
                  stroke="#dc2626" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#dc2626", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Gráfico: Investimento por Canal */}
        <Card className="flex flex-col justify-between">
          <div className="mb-6">
            <h3 className="text-xl font-bold">Investimento por Canal de Divulgação</h3>
            <p className="text-sm text-muted-foreground">Distribuição da verba entre as plataformas de mídia</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val}`}/>
                <YAxis dataKey="name" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={130} />
                <RechartsTooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '8px', border: 'none', color: '#fff' }}
                  formatter={(value: number) => [formatCurrency(value), 'Investimento']}
                />
                <Bar dataKey="investimento" fill="#1e3a8a" radius={[0, 4, 4, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Resultados do Impulsionamento (Tabela inspirada na pág 7) */}
      <Card>
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-foreground">Resultados do Impulsionamento de Vagas</h3>
          <p className="text-muted-foreground mt-1">
            Performance detalhada das campanhas ativas no período.
          </p>
        </div>

        {/* 3 Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-primary/5 rounded-xl p-6 border border-primary/10 flex flex-col items-center justify-center text-center">
            <div className="text-primary mb-2"><MousePointerClick size={28} /></div>
            <div className="text-4xl font-extrabold text-foreground mb-1">{formatNumber(totalClicks)}</div>
            <div className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Cliques no link</div>
            <div className="mt-2 text-xs text-muted-foreground">Custo médio por clique: <strong className="text-foreground">{formatCurrency(avgCpc)}</strong></div>
          </div>
          
          <div className="bg-primary/5 rounded-xl p-6 border border-primary/10 flex flex-col items-center justify-center text-center">
            <div className="text-primary mb-2"><Eye size={28} /></div>
            <div className="text-4xl font-extrabold text-foreground mb-1">{formatNumber(totalViews)}</div>
            <div className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Visualizações</div>
            <div className="mt-2 text-xs text-muted-foreground">Alcance e Impressões das campanhas</div>
          </div>

          <div className="bg-primary/5 rounded-xl p-6 border border-primary/10 flex flex-col items-center justify-center text-center">
            <div className="text-primary mb-2"><UserPlus size={28} /></div>
            <div className="text-4xl font-extrabold text-foreground mb-1">{formatNumber(totalLeads)}</div>
            <div className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Leads gerados</div>
            <div className="mt-2 text-xs text-muted-foreground">Custo médio por lead: <strong className="text-foreground">{formatCurrency(avgCpl)}</strong></div>
          </div>
        </div>

        {/* Tabela de Campanhas */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border/50">
              <tr>
                <th className="px-4 py-4 font-semibold">Conjunto de Anúncios / Região</th>
                <th className="px-4 py-4 font-semibold">Canal</th>
                <th className="px-4 py-4 font-semibold text-right">Cliques</th>
                <th className="px-4 py-4 font-semibold text-right">Candidatos</th>
                <th className="px-4 py-4 font-semibold text-right">Custo / Candidato</th>
                <th className="px-4 py-4 font-semibold text-right">Investido</th>
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhuma campanha registrada no período.</td>
                </tr>
              ) : tableData.map((row, i) => (
                <tr key={i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-4 font-medium text-foreground">{row.campaign}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${row.channel === 'Meta Ads' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                      {row.channel}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">{formatNumber(row.clicks)}</td>
                  <td className="px-4 py-4 text-right font-medium">{formatNumber(row.conversions)}</td>
                  <td className="px-4 py-4 text-right">{formatCurrency(row.conversions > 0 ? row.cost / row.conversions : 0)}</td>
                  <td className="px-4 py-4 text-right font-bold">{formatCurrency(row.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
