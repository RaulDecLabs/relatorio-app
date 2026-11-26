import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Users, Target, Handshake, CheckCircle2, ShoppingBag, DollarSign, Wallet, Receipt,
  Compass, Package, RotateCcw, Database,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  SectionTitle, CustomKpiCard, CustomChartTooltip, ProgressBreakdownRow, ReportConfig,
} from "@/components/reports/report-ui";

export interface CrmLead {
  lead_id: string;
  data_criacao: string | null;
  origem: string | null;
  estagio_funil: string | null;
  status: string | null;
  valor_estimado: number | null;
  atualizado_em?: string | null;
}

export interface CrmPedido {
  pedido_id: string;
  data_venda: string;
  produto: string | null;
  valor_venda: number | null;
  valor_liquido: number | null;
  situacao: string;
  atualizado_em?: string | null;
}

interface CrmDeclabsTabProps {
  activeReport: ReportConfig;
  startDateStr: string;
  endDateStr: string;
  leads?: CrmLead[];
  pedidos?: CrmPedido[];
}

// Mesmas etapas e nomes do CRM (src/lib/painel.ts do CRM DecLabs).
const ETAPAS: { id: string; nome: string }[] = [
  { id: "prospeccao", nome: "Prospecção" },
  { id: "qualificacao", nome: "Qualificação" },
  { id: "proposta", nome: "Proposta" },
  { id: "fechamento", nome: "Fechamento" },
];

const SITUACAO: Record<string, string> = {
  pago: "Pago",
  em_reclamacao: "Em reclamação",
  pendente: "Pendente",
  estornado: "Estornado",
  devolvido: "Devolvido",
  cancelado: "Cancelado",
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (v: number) => v.toLocaleString("pt-BR");

/** Data (YYYY-MM-DD) no fuso de Brasília, para comparar com o período do relatório. */
function diaBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

const noPeriodo = (dia: string, ini: string, fim: string) => !!dia && dia >= ini && dia <= fim;

export function CrmDeclabsTab({ activeReport, startDateStr, endDateStr, leads = [], pedidos = [] }: CrmDeclabsTabProps) {
  const crm = useMemo(() => {
    const leadsPeriodo = leads.filter((l) => noPeriodo(diaBR(l.data_criacao), startDateStr, endDateStr));
    const clientesPeriodo = leadsPeriodo.filter((l) => l.status === "cliente").length;
    const perdidosPeriodo = leadsPeriodo.filter((l) => l.status === "perdido").length;

    // Funil atual: todos os leads que não foram perdidos, pela etapa em que estão hoje.
    const ativos = leads.filter((l) => l.status !== "perdido");
    const funil = ETAPAS.map((e) => {
      const daEtapa = ativos.filter((l) => (l.estagio_funil || "prospeccao") === e.id);
      return {
        name: e.nome,
        leads: daEtapa.length,
        valor: daEtapa.reduce((s, l) => s + Number(l.valor_estimado || 0), 0),
      };
    });
    const outras = ativos.filter((l) => !ETAPAS.some((e) => e.id === (l.estagio_funil || "prospeccao")));
    if (outras.length) {
      funil.push({
        name: "Outras etapas",
        leads: outras.length,
        valor: outras.reduce((s, l) => s + Number(l.valor_estimado || 0), 0),
      });
    }
    const emNegociacao = leads.filter((l) => l.status === "em_negociacao");

    const origens: Record<string, number> = {};
    leadsPeriodo.forEach((l) => {
      const o = l.origem?.trim() || "Não informada";
      origens[o] = (origens[o] || 0) + 1;
    });
    const origemData = Object.entries(origens)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalLeads: leads.length,
      novos: leadsPeriodo.length,
      clientesPeriodo,
      perdidosPeriodo,
      conversao: leadsPeriodo.length ? (clientesPeriodo / leadsPeriodo.length) * 100 : 0,
      emNegociacao: emNegociacao.length,
      valorNegociacao: emNegociacao.reduce((s, l) => s + Number(l.valor_estimado || 0), 0),
      funil,
      origemData,
    };
  }, [leads, startDateStr, endDateStr]);

  const ml = useMemo(() => {
    const doPeriodo = pedidos.filter((p) => noPeriodo(diaBR(p.data_venda), startDateStr, endDateStr));
    const pagos = doPeriodo.filter((p) => p.situacao === "pago");
    const bruto = pagos.reduce((s, p) => s + Number(p.valor_venda || 0), 0);
    const liquido = pagos.reduce((s, p) => s + Number(p.valor_liquido || 0), 0);
    const problemas = doPeriodo.filter((p) => ["devolvido", "estornado", "em_reclamacao", "cancelado"].includes(p.situacao));

    const porDia: Record<string, { date: string; pedidos: number; faturamento: number }> = {};
    pagos.forEach((p) => {
      const d = diaBR(p.data_venda);
      if (!porDia[d]) porDia[d] = { date: d, pedidos: 0, faturamento: 0 };
      porDia[d].pedidos += 1;
      porDia[d].faturamento += Number(p.valor_venda || 0);
    });
    const chart = Object.values(porDia)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ ...d, faturamento: Math.round(d.faturamento * 100) / 100 }));

    const produtos: Record<string, { name: string; pedidos: number; bruto: number; liquido: number }> = {};
    pagos.forEach((p) => {
      const n = p.produto?.trim() || "Sem descrição";
      if (!produtos[n]) produtos[n] = { name: n, pedidos: 0, bruto: 0, liquido: 0 };
      produtos[n].pedidos += 1;
      produtos[n].bruto += Number(p.valor_venda || 0);
      produtos[n].liquido += Number(p.valor_liquido || 0);
    });
    const topProdutos = Object.values(produtos).sort((a, b) => b.bruto - a.bruto).slice(0, 10);

    const situacoes: Record<string, number> = {};
    doPeriodo.forEach((p) => { situacoes[p.situacao] = (situacoes[p.situacao] || 0) + 1; });

    return {
      totalPedidos: doPeriodo.length,
      pagos: pagos.length,
      bruto,
      liquido,
      ticket: pagos.length ? bruto / pagos.length : 0,
      taxa: bruto > 0 ? ((bruto - liquido) / bruto) * 100 : 0,
      problemas: problemas.length,
      chart,
      topProdutos,
      situacoes: Object.entries(situacoes).sort((a, b) => b[1] - a[1]),
    };
  }, [pedidos, startDateStr, endDateStr]);

  const ultimaSync = useMemo(() => {
    const datas = [...leads, ...pedidos].map((x) => x.atualizado_em).filter(Boolean) as string[];
    if (!datas.length) return null;
    const max = datas.reduce((a, b) => (a > b ? a : b));
    return new Date(max).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
  }, [leads, pedidos]);

  if (leads.length === 0 && pedidos.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm bg-primary text-primary-foreground">
          <Database className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Nenhum dado do CRM DecLabs ainda</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          O importador copia os leads e os pedidos do Mercado Livre da {activeReport.name} uma vez por dia.
          Assim que a primeira cópia rodar, os números aparecem aqui.
        </p>
      </Card>
    );
  }

  const maxFunil = Math.max(1, ...crm.funil.map((f) => f.leads));

  return (
    <div className="space-y-6">
      {/* ---------------- Funil de vendas ---------------- */}
      <SectionTitle
        title="Funil de Vendas (CRM DecLabs)"
        description={`Leads que entraram de ${startDateStr.split("-").reverse().join("/")} a ${endDateStr.split("-").reverse().join("/")} e o funil como está hoje.${ultimaSync ? ` Atualizado em ${ultimaSync}.` : ""}`}
        icon={Target}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CustomKpiCard label="Novos leads" value={num(crm.novos)} icon={Users} hint={`${num(crm.totalLeads)} no CRM ao todo`} color="blue" />
        <CustomKpiCard label="Viraram clientes" value={num(crm.clientesPeriodo)} icon={CheckCircle2} hint={`${crm.conversao.toFixed(1)}% dos novos leads`} color="green" />
        <CustomKpiCard label="Em negociação" value={num(crm.emNegociacao)} icon={Handshake} hint={`${brl(crm.valorNegociacao)} estimados`} color="amber" />
        <CustomKpiCard label="Perdidos" value={num(crm.perdidosPeriodo)} icon={RotateCcw} hint="Dos leads que entraram no período" color="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Funil atual por etapa</CardTitle>
            <CardDescription>Leads em aberto no CRM hoje, sem os perdidos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {crm.funil.map((f) => (
              <div key={f.name} className="py-2.5">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium text-foreground">{f.name}</span>
                  <span className="text-xs font-semibold text-foreground/80">
                    {num(f.leads)} {f.leads === 1 ? "lead" : "leads"}
                    {f.valor > 0 && <span className="ml-2 font-normal text-muted-foreground">{brl(f.valor)}</span>}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-foreground transition-all duration-500" style={{ width: `${(f.leads / maxFunil) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Compass className="h-4 w-4" /> Origem dos novos leads
            </CardTitle>
            <CardDescription>Por onde chegaram os leads do período.</CardDescription>
          </CardHeader>
          <CardContent>
            {crm.origemData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum lead novo no período.</p>
            ) : (
              crm.origemData.map((o) => (
                <ProgressBreakdownRow key={o.name} label={o.name} sessions={o.count} total={crm.novos} color="green" />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------------- Mercado Livre ---------------- */}
      <SectionTitle
        title="Vendas no Mercado Livre"
        description="Pedidos do período, recebidos pelo Mercado Pago. Faturamento e líquido contam só os pedidos pagos."
        icon={ShoppingBag}
      />

      {pedidos.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Este CRM não tem pedidos do Mercado Livre.
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <CustomKpiCard label="Pedidos pagos" value={num(ml.pagos)} icon={ShoppingBag} hint={`${num(ml.totalPedidos)} pedidos no período`} color="blue" />
            <CustomKpiCard label="Faturamento bruto" value={brl(ml.bruto)} icon={DollarSign} hint="Valor das vendas pagas" color="green" />
            <CustomKpiCard label="Valor líquido" value={brl(ml.liquido)} icon={Wallet} hint={`${ml.taxa.toFixed(1)}% ficaram em taxas e frete`} color="amber" />
            <CustomKpiCard label="Ticket médio" value={brl(ml.ticket)} icon={Receipt} hint={ml.problemas ? `${ml.problemas} devolução/reclamação` : "Sem devoluções no período"} color={ml.problemas ? "red" : "green"} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Vendas pagas por dia</CardTitle>
              <CardDescription>Faturamento bruto de cada dia do período.</CardDescription>
            </CardHeader>
            <CardContent>
              {ml.chart.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma venda paga no período.</p>
              ) : (
                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ml.chart} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dcdcd7" strokeOpacity={0.5} />
                      <XAxis dataKey="date" stroke="#a3a39d" fontSize={11} tickLine={false} axisLine={false} dy={8}
                        tickFormatter={(v) => { const [, m, d] = String(v).split("-"); return `${d}/${m}`; }} />
                      <YAxis stroke="#a3a39d" fontSize={11} tickLine={false} axisLine={false} dx={-8} />
                      <Tooltip content={<CustomChartTooltip />} cursor={{ fill: "#141414", fillOpacity: 0.04 }} />
                      <Bar dataKey="faturamento" name="Faturamento (R$)" fill="#141414" stroke="#141414" radius={[2, 2, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" /> Produtos mais vendidos
                </CardTitle>
                <CardDescription>Pedidos pagos no período, por faturamento.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {ml.topProdutos.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-6 pb-6">Nenhuma venda paga no período.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">Produto</TableHead>
                        <TableHead className="text-center">Pedidos</TableHead>
                        <TableHead className="text-right">Bruto</TableHead>
                        <TableHead className="text-right pr-6">Líquido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ml.topProdutos.map((p) => (
                        <TableRow key={p.name}>
                          <TableCell className="pl-6 py-3 text-sm max-w-[320px]">
                            <span className="line-clamp-2" title={p.name}>{p.name}</span>
                          </TableCell>
                          <TableCell className="text-center text-sm">{num(p.pedidos)}</TableCell>
                          <TableCell className="text-right text-sm font-semibold">{brl(p.bruto)}</TableCell>
                          <TableCell className="text-right pr-6 text-sm text-muted-foreground">{brl(p.liquido)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Situação dos pedidos</CardTitle>
                <CardDescription>Todos os pedidos do período.</CardDescription>
              </CardHeader>
              <CardContent>
                {ml.situacoes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum pedido no período.</p>
                ) : (
                  ml.situacoes.map(([s, n]) => (
                    <ProgressBreakdownRow key={s} label={SITUACAO[s] || s} sessions={n} total={ml.totalPedidos}
                      color={s === "pago" ? "green" : s === "pendente" ? "amber" : "purple"} />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
