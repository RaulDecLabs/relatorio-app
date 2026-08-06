import React, { useMemo } from "react";
import { 
  Users, Target, Rocket, Mail, TrendingUp, ArrowRight, 
  Award, CheckCircle2, ShieldAlert, Filter, Globe, MousePointer, AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from "recharts";
import { 
  SectionTitle, CustomKpiCard, CustomChartTooltip, ReportConfig 
} from "@/components/reports/report-ui";

interface RdMarketingTabProps {
  rdMetrics?: any[];
  activeReport: ReportConfig;
}

const COLORS = ["#f97316", "#14b8a6", "#3b82f6", "#8b5cf6", "#10b981"];

export function RdMarketingTab({ rdMetrics = [], activeReport }: RdMarketingTabProps) {
  // Exibição estritamente dos dados reais oriundos da tabela do RD Marketing no banco do Supabase
  const hasData = Boolean(rdMetrics && rdMetrics.length > 0);
  
  const data = useMemo(() => {
    if (hasData && rdMetrics) {
      const totalLeads = rdMetrics.reduce((sum, item) => sum + (Number(item.total_leads) || 0), 0);
      const totalMqls = rdMetrics.reduce((sum, item) => sum + (Number(item.leads_mql) || 0), 0);
      const totalOportunidades = rdMetrics.reduce((sum, item) => sum + (Number(item.oportunidades) || 0), 0);
      const totalVisits = rdMetrics.reduce((sum, item) => sum + (Number(item.visits) || 0), 0);
      const taxaConversao = totalLeads > 0 ? ((totalOportunidades / totalLeads) * 100).toFixed(2) : "0.00";
      const taxaMql = totalLeads > 0 ? Math.round((totalMqls / totalLeads) * 100) : 0;
      const taxaOportunidade = totalMqls > 0 ? Math.round((totalOportunidades / totalMqls) * 100) : 0;
      const taxaVisitaLead = totalVisits > 0 ? ((totalLeads / totalVisits) * 100).toFixed(1) : "0.0";
      
      // Mapeamento real por canais de origem salvos no banco de dados
      const googleAds = rdMetrics.reduce((sum, item) => sum + (Number(item.channel_google_ads) || 0), 0);
      const metaAds = rdMetrics.reduce((sum, item) => sum + (Number(item.channel_meta_ads) || 0), 0);
      const organic = rdMetrics.reduce((sum, item) => sum + (Number(item.channel_organic) || 0), 0);
      const direct = rdMetrics.reduce((sum, item) => sum + (Number(item.channel_direct) || 0), 0);
      
      const rawChannels = [
        { name: "Google Ads", value: googleAds },
        { name: "Meta Ads (Instagram/FB)", value: metaAds },
        { name: "Busca Orgânica (SEO)", value: organic },
        { name: "Tráfego Direto / Outros", value: direct },
      ].filter(c => c.value > 0);
      
      // Agregação real das Landing Pages e Pontos de Conversão vindos na coluna top_lps
      const allLps: Record<string, { visits: number; leads: number }> = {};
      rdMetrics.forEach(m => {
        if (m.top_lps && Array.isArray(m.top_lps)) {
          m.top_lps.forEach((lp: any) => {
            const name = lp.name || "Landing Page / Formulário";
            if (!allLps[name]) allLps[name] = { visits: 0, leads: 0 };
            allLps[name].visits += (Number(lp.visits) || 0);
            allLps[name].leads += (Number(lp.leads) || 0);
          });
        }
      });
      
      const topLps = Object.entries(allLps).map(([name, val]) => ({
        name,
        visits: val.visits,
        leads: val.leads,
        conv: val.visits > 0 ? (val.leads / val.visits) * 100 : 0
      })).sort((a, b) => b.leads - a.leads);

      // Últimas métricas de e-mail marketing e fluxos capturados
      const lastRow = rdMetrics[rdMetrics.length - 1];
      const emailOpenRate = lastRow?.email_open_rate || 0;
      const emailCtr = lastRow?.email_ctr || 0;
      const workflowsActive = lastRow?.workflows_active || 0;

      return {
        totalLeads,
        totalMqls,
        totalOportunidades,
        totalVisits,
        taxaConversao,
        taxaMql,
        taxaOportunidade,
        taxaVisitaLead,
        evolutionData: rdMetrics.map(m => {
          let dia = "Dia";
          if (m.metric_date && typeof m.metric_date === 'string') {
            const parts = m.metric_date.split('-');
            if (parts.length === 3) dia = `${parts[2]}/${parts[1]}`;
          }
          return {
            data: dia,
            Leads: Number(m.total_leads) || 0,
            MQLs: Number(m.leads_mql) || 0,
            Oportunidades: Number(m.oportunidades) || 0,
          };
        }),
        channelsData: rawChannels.length > 0 ? rawChannels : [],
        topLps,
        emailOpenRate: Number(emailOpenRate).toFixed(1),
        emailCtr: Number(emailCtr).toFixed(2),
        workflowsActive: Number(workflowsActive) || 0
      };
    }

    // Sem dados demonstrativos nem simulações: Retorno real zerado se o banco ainda não possuir sincronização do período
    return {
      totalLeads: 0,
      totalMqls: 0,
      totalOportunidades: 0,
      totalVisits: 0,
      taxaConversao: "0.00",
      taxaMql: 0,
      taxaOportunidade: 0,
      taxaVisitaLead: "0.0",
      evolutionData: [],
      channelsData: [],
      topLps: [],
      emailOpenRate: "0.0",
      emailCtr: "0.00",
      workflowsActive: 0
    };
  }, [rdMetrics, hasData]);

  const hasTokens = Boolean(activeReport.rd_public_token || activeReport.rd_private_token);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Status da Integração no Topo */}
      <Card className="border-orange-500/30 bg-gradient-to-r from-orange-500/10 via-card/80 to-teal-500/10 shadow-sm backdrop-blur-md">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 text-orange-500 border border-orange-500/30 shadow-inner">
              <Rocket className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-foreground sm:text-base">Integração RD Station Marketing (Dados Reais)</h4>
                {hasTokens ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[11px]">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Tokens Conectados
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[11px]">
                    <ShieldAlert className="w-3 h-3 mr-1" /> Tokens Pendentes no botão "Configurar"
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Empresa conectada: <span className="font-semibold text-foreground">{activeReport.name}</span> • Exibindo exclusivamente informações oficiais importadas da API RD Station.
              </p>
            </div>
          </div>
          {!hasData && (
            <Badge variant="outline" className="px-3 py-1 bg-amber-500/10 text-amber-600 border-amber-500/30 shadow-sm text-xs font-semibold whitespace-nowrap">
              ⚠️ Nenhum registro processado nos últimos 7 dias
            </Badge>
          )}
        </CardContent>
      </Card>

      <SectionTitle 
        title="RD Marketing (Inbound & Leads Reais)" 
        description="Acompanhamento oficial de Captação, Qualificação de MQLs e Eficiência das suas Landing Pages." 
        icon={Users} 
        color="orange" 
      />

      {/* Alerta caso os dados no banco ainda estejam vazios no período */}
      {!hasData && (
        <Card className="border-border/60 bg-muted/20 p-6 text-center shadow-none">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 mb-3">
            <AlertCircle className="h-6 w-6 animate-pulse" />
          </div>
          <h4 className="text-base font-bold text-foreground">Aguardando Importação de Dados Reais do RD Station</h4>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto mt-1">
            Não existem métricas gravadas no banco de dados para este período de 7 dias. Certifique-se de preencher o Token Privado no botão "Configurar" e execute a rotina de importação:
          </p>
          <div className="mt-4 bg-background/80 border rounded-xl p-3 inline-block font-mono text-xs text-orange-600 dark:text-orange-400 font-semibold shadow-inner">
            node scripts/import-rd-marketing.js --days=7
          </div>
        </Card>
      )}

      {/* KPI Cards Reais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CustomKpiCard 
          label="Total de Leads Gerados" 
          value={data.totalLeads.toLocaleString("pt-BR")} 
          icon={Users} 
          hint={hasData ? "Contagem oficial da base RD" : "Sem leads no período"} 
          color="amber" 
        />
        <CustomKpiCard 
          label="Leads Qualificados (MQL)" 
          value={data.totalMqls.toLocaleString("pt-BR")} 
          icon={Award} 
          hint={hasData ? `Taxa de qualificação: ${data.taxaMql}%` : "Aguardando MQLs"} 
          color="indigo" 
        />
        <CustomKpiCard 
          label="Oportunidades ao CRM" 
          value={data.totalOportunidades.toLocaleString("pt-BR")} 
          icon={Target} 
          hint={hasData ? `Taxa de conversão de MQL: ${data.taxaOportunidade}%` : "Sem oportunidades geradas"} 
          color="green" 
        />
        <CustomKpiCard 
          label="Taxa Conversão Oportunidade" 
          value={`${data.taxaConversao}%`} 
          icon={TrendingUp} 
          hint="Eficiência total de Lead para Oportunidade" 
          color="blue" 
        />
      </div>

      {/* Funil Visual do RD Station */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-base font-semibold">Funil de Inbound Marketing (Métricas Reais)</CardTitle>
          </div>
          <CardDescription>Visualização oficial da progressão dos seus leads nos estágios de qualificação.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 relative">
            
            {/* Estágio 1: Tráfego */}
            <div className="group relative rounded-2xl p-5 border bg-gradient-to-b from-card to-background hover:shadow-lg transition-all duration-300 border-border/80 hover:border-orange-500/50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">01. Tráfego & Visitas</span>
                <Globe className="h-4 w-4 text-orange-400 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-2xl font-extrabold tracking-tight">{data.totalVisits.toLocaleString("pt-BR")}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Sessões monitoradas em LPs</p>
              <div className="mt-4 pt-3 border-t flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Conversão para Lead:</span>
                <Badge className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 text-[11px] font-bold">{data.taxaVisitaLead}%</Badge>
              </div>
            </div>

            {/* Setas conectoras desktop */}
            <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-muted-foreground/30">
              <ArrowRight className="h-5 w-5" />
            </div>

            {/* Estágio 2: Leads */}
            <div className="group relative rounded-2xl p-5 border bg-gradient-to-b from-card to-background hover:shadow-lg transition-all duration-300 border-border/80 hover:border-teal-500/50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-teal-500 uppercase tracking-wider">02. Leads Captados</span>
                <Users className="h-4 w-4 text-teal-400 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-2xl font-extrabold tracking-tight text-foreground">{data.totalLeads.toLocaleString("pt-BR")}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Cadastros na base do período</p>
              <div className="mt-4 pt-3 border-t flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Qualificação MQL:</span>
                <Badge className="bg-teal-500/10 text-teal-500 hover:bg-teal-500/20 text-[11px] font-bold">{data.taxaMql}%</Badge>
              </div>
            </div>

            {/* Estágio 3: MQLs */}
            <div className="group relative rounded-2xl p-5 border bg-gradient-to-b from-card to-background hover:shadow-lg transition-all duration-300 border-border/80 hover:border-indigo-500/50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">03. Qualificados (MQL)</span>
                <Award className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-2xl font-extrabold tracking-tight text-foreground">{data.totalMqls.toLocaleString("pt-BR")}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Pontuação de Lead Scoring atingida</p>
              <div className="mt-4 pt-3 border-t flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Passagem p/ CRM:</span>
                <Badge className="bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 text-[11px] font-bold">{data.taxaOportunidade}%</Badge>
              </div>
            </div>

            {/* Estágio 4: Oportunidades */}
            <div className="group relative rounded-2xl p-5 border bg-gradient-to-b from-emerald-500/10 via-card to-background hover:shadow-lg transition-all duration-300 border-emerald-500/40 shadow-emerald-500/5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">04. Oportunidades</span>
                <Target className="h-4 w-4 text-emerald-500 group-hover:scale-110 transition-transform animate-bounce" />
              </div>
              <p className="text-2xl font-extrabold tracking-tight text-emerald-500">{data.totalOportunidades.toLocaleString("pt-BR")}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Leads prontos em negociação</p>
              <div className="mt-4 pt-3 border-t flex justify-between items-center text-xs">
                <span className="text-emerald-500 font-semibold">Status: Comercial Ativo</span>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Gráficos em Grid */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Gráfico de Evolução Temporada de Captação (8 Colunas) */}
        <Card className="md:col-span-7 lg:col-span-8 border-border/60 bg-card/60 backdrop-blur-md shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Evolução de Leads e Qualificação (Últimos 7 Dias)</CardTitle>
            <CardDescription>Acompanhamento diário e real de novos cadastros e leads pontuados na base.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full mt-2">
              {data.evolutionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.evolutionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorMqls" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#888888" strokeOpacity={0.2} vertical={false} />
                    <XAxis dataKey="data" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Area type="monotone" name="Leads Totais" dataKey="Leads" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
                    <Area type="monotone" name="Leads Qualificados (MQL)" dataKey="MQLs" stroke="#14b8a6" strokeWidth={3} fillOpacity={1} fill="url(#colorMqls)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-2xl p-6">
                  <BarChart3 className="w-10 h-10 mb-2 opacity-30 text-orange-500" />
                  <span>Nenhum histórico diário disponível no período selecionado.</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Canais de Origem de Leads (4 Colunas) */}
        <Card className="md:col-span-5 lg:col-span-4 border-border/60 bg-card/60 backdrop-blur-md shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Canais de Origem Reais</CardTitle>
            <CardDescription>Distribuição de onde vieram seus novos leads.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            {data.channelsData.length > 0 ? (
              <>
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip formatter={(value: any) => [`${value} Leads`, "Volume"]} />
                      <Pie
                        data={data.channelsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={78}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {data.channelsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full space-y-2 mt-2">
                  {data.channelsData.map((channel, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                        <span className="text-muted-foreground truncate max-w-[150px]">{channel.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">{channel.value} ({Math.round((channel.value / (data.totalLeads || 1)) * 100)}%)</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-2xl p-6">
                <Filter className="w-8 h-8 mb-2 opacity-30 text-teal-500" />
                <span className="text-center text-xs">Sem dados de canais de origem no período.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Landing Pages & Pontos de Conversão */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-muted/20 border-b pb-4">
          <div>
            <CardTitle className="text-base font-semibold">Eficiência Oficial das Landing Pages & Formulários</CardTitle>
            <CardDescription>Desempenho real das páginas onde houve conversão de contatos na API RD Marketing.</CardDescription>
          </div>
          <MousePointer className="h-5 w-5 text-muted-foreground/50" />
        </CardHeader>
        <CardContent className="p-0">
          {data.topLps.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold text-xs pl-6">Nome da Landing Page / Formulário</TableHead>
                    <TableHead className="font-semibold text-xs text-right">Visitas Monitoradas</TableHead>
                    <TableHead className="font-semibold text-xs text-right">Leads Captados</TableHead>
                    <TableHead className="font-semibold text-xs text-right pr-6">Taxa de Conversão (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topLps.map((lp, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium text-sm pl-6 flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 font-bold text-xs">
                          #{idx + 1}
                        </span>
                        {lp.name}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">{lp.visits > 0 ? lp.visits.toLocaleString("pt-BR") : "-"}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-foreground">{lp.leads.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-muted/60 rounded-full h-2 overflow-hidden hidden sm:block">
                            <div 
                              className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full" 
                              style={{ width: `${Math.min(lp.conv * 4, 100)}%` }}
                            ></div>
                          </div>
                          <span className="font-bold text-sm text-emerald-500 font-mono">{lp.conv > 0 ? `${lp.conv.toFixed(1)}%` : "-"}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center justify-center">
              <span>Nenhuma Landing Page ou formulário de conversão registrado nestes 7 dias.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo de Nutrição e E-mail Marketing */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 bg-card/50 backdrop-blur-md p-5 flex items-center gap-4 hover:border-orange-500/30 transition-colors">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Taxa Abertura de E-mails (Média)</p>
            <p className="text-xl font-extrabold tracking-tight mt-0.5">{data.emailOpenRate}%</p>
            <span className="text-[11px] text-muted-foreground font-medium">Campanhas e Nutrição RD</span>
          </div>
        </Card>
        
        <Card className="border-border/60 bg-card/50 backdrop-blur-md p-5 flex items-center gap-4 hover:border-teal-500/30 transition-colors">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-500 border border-teal-500/20">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Taxa de Cliques (CTR em Nutrição)</p>
            <p className="text-xl font-extrabold tracking-tight mt-0.5">{data.emailCtr}%</p>
            <span className="text-[11px] text-muted-foreground">Cliques nos links de campanhas</span>
          </div>
        </Card>
        
        <Card className="border-border/60 bg-card/50 backdrop-blur-md p-5 flex items-center gap-4 hover:border-indigo-500/30 transition-colors">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Fluxos Ativos de Automação</p>
            <p className="text-xl font-extrabold tracking-tight mt-0.5">{data.workflowsActive} Fluxos</p>
            <span className="text-[11px] text-indigo-400 font-semibold">Automação oficial sincronizada</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
