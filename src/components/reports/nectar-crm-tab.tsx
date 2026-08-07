import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, DollarSign, PieChart, ShieldAlert, CheckCircle2, TrendingUp, Users, AlertCircle, ArrowUpRight } from "lucide-react";
import { SectionTitle, ReportConfig } from "@/components/reports/report-ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NectarCrmTabProps {
  activeReport: ReportConfig;
  startDateStr: string;
  endDateStr: string;
  deals?: any[];
}

export function NectarCrmTab({ activeReport, startDateStr, endDateStr, deals = [] }: NectarCrmTabProps) {
  const hasToken = !!activeReport?.nectar_api_token;

  // Calcula Métricas Principais
  const metrics = useMemo(() => {
    let totalDeals = deals.length;
    let wonDeals = 0;
    let lostDeals = 0;
    let openDeals = 0;
    
    let wonValue = 0;
    let totalValue = 0;

    deals.forEach(deal => {
      totalValue += Number(deal.value) || 0;
      if (deal.status === 'Ganho') {
        wonDeals++;
        wonValue += Number(deal.value) || 0;
      } else if (deal.status === 'Perdido') {
        lostDeals++;
      } else {
        openDeals++;
      }
    });

    return {
      totalDeals,
      wonDeals,
      lostDeals,
      openDeals,
      wonValue,
      totalValue
    };
  }, [deals]);

  // Agrupa os negócios por Funil e Etapa
  const funnelData = useMemo(() => {
    const stageCounts: Record<string, { name: string; count: number; value: number }> = {};
    
    deals.forEach(deal => {
      // Ignorar negócios perdidos no funil principal para não poluir
      if (deal.status === 'Perdido') return;
      
      const stage = deal.stage_name || 'Sem Etapa';
      if (!stageCounts[stage]) {
        stageCounts[stage] = { name: stage, count: 0, value: 0 };
      }
      stageCounts[stage].count += 1;
      stageCounts[stage].value += Number(deal.value) || 0;
    });

    return Object.values(stageCounts).sort((a, b) => b.count - a.count);
  }, [deals]);

  // Formatação de Moeda
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Card className="border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-card/80 to-purple-500/10 shadow-sm backdrop-blur-md">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-500 border border-blue-500/30 shadow-inner">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-foreground sm:text-base">Integração Nectar CRM</h4>
                {hasToken ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[11px]">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Token Conectado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[11px]">
                    <ShieldAlert className="w-3 h-3 mr-1" /> Token Pendente
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Oportunidades comerciais e funil de vendas extraídas de {startDateStr} a {endDateStr}.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasToken && (
        <Card className="border-border/70 shadow-none p-12 text-center bg-card/60 backdrop-blur-md">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 mb-3">
            <Target className="h-6 w-6" />
          </div>
          <h4 className="text-base font-bold text-foreground">Aguardando Configuração</h4>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto mt-1 mb-4">
            Vá em "Configurar" lá no topo e insira o Token de API do Nectar CRM primeiro!
          </p>
        </Card>
      )}

      {hasToken && deals.length === 0 && (
        <Card className="border-border/70 shadow-none p-12 text-center bg-card/60 backdrop-blur-md">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-3">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h4 className="text-base font-bold text-foreground">Nenhuma oportunidade encontrada</h4>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto mt-1 mb-4">
            A API do Nectar não retornou nenhum negócio (deal) criado ou modificado no período de {startDateStr} a {endDateStr}.
          </p>
        </Card>
      )}

      {hasToken && deals.length > 0 && (
        <>
          <SectionTitle 
            title="Resultados Comerciais (Nectar CRM)" 
            description="Visão geral do pipeline de vendas, fechamentos e desempenho." 
            icon={TrendingUp} 
            color="blue" 
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm hover:border-blue-500/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-semibold text-muted-foreground">Oportunidades (Total)</CardTitle>
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalDeals}</div>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  Geradas no período
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm hover:border-emerald-500/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-semibold text-muted-foreground">Vendas Ganhas</CardTitle>
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">{metrics.wonDeals}</div>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  {formatCurrency(metrics.wonValue)} em receita
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm hover:border-amber-500/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-semibold text-muted-foreground">Oportunidades em Aberto</CardTitle>
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <PieChart className="w-4 h-4 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.openDeals}</div>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  Negociações em andamento
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/40 backdrop-blur-sm shadow-sm hover:border-rose-500/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-semibold text-muted-foreground">Oportunidades Perdidas</CardTitle>
                <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-500">{metrics.lostDeals}</div>
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  {((metrics.lostDeals / metrics.totalDeals) * 100).toFixed(1)}% de perda
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <Card className="border-border/60 shadow-sm col-span-1">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" /> Distribuição por Etapas do Funil
                </CardTitle>
                <CardDescription>Onde se encontram as oportunidades (excluindo perdidas)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={funnelData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 11}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value: any, name: any, props: any) => {
                          return [value, "Quantidade"];
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {funnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-border/60 shadow-sm col-span-1">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-500" /> Oportunidades Mais Recentes
                </CardTitle>
                <CardDescription>Últimos registros sincronizados do CRM</CardDescription>
              </CardHeader>
              <CardContent className="px-0 pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="font-semibold px-4">Nome do Negócio</TableHead>
                        <TableHead className="font-semibold">Etapa</TableHead>
                        <TableHead className="font-semibold text-right">Valor</TableHead>
                        <TableHead className="font-semibold text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deals.slice(0, 7).map((deal) => (
                        <TableRow key={deal.id} className="hover:bg-muted/50 border-border/40 transition-colors">
                          <TableCell className="px-4 py-3">
                            <div className="font-medium text-sm text-foreground/90">{deal.deal_name || "Negócio sem nome"}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">{formatDate(deal.created_at)}</div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="text-xs line-clamp-1">{deal.stage_name}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{deal.funnel_name}</div>
                          </TableCell>
                          <TableCell className="text-right py-3 font-mono text-sm text-foreground/80">
                            {formatCurrency(Number(deal.value))}
                          </TableCell>
                          <TableCell className="text-center py-3">
                            <Badge 
                              variant={deal.status === 'Ganho' ? "default" : (deal.status === 'Perdido' ? 'destructive' : 'secondary')}
                              className={
                                deal.status === 'Ganho' 
                                  ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' 
                                  : deal.status === 'Aberto' 
                                    ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' 
                                    : ''
                              }
                            >
                              {deal.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
