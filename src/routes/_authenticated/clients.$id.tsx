import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, DollarSign, Target, TrendingUp, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/clients/$id")({
  component: ClientDetail,
});

function ClientDetail() {
  const { id } = Route.useParams();
  const { data: client } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell title={client?.company_name ?? "Cliente"}>
      <Link to="/clients" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Link>
      <PageHeader
        title={client?.company_name ?? "Carregando..."}
        description={client?.segment ?? ""}
        actions={<Button size="sm" variant="outline" disabled title="Exportação de PDF ainda não implementada">Exportar PDF</Button>}
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="ads">Mídia paga</TabsTrigger>
          <TabsTrigger value="seo">SEO & Analytics</TabsTrigger>
          <TabsTrigger value="crm">CRM</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <KpiCard label="Investimento" value="R$ 0" icon={DollarSign} hint="Sem integração" />
            <KpiCard label="Leads" value="0" icon={Target} hint="Sem integração" />
            <KpiCard label="ROAS" value="—" icon={TrendingUp} hint="Sem integração" />
            <KpiCard label="Usuários" value="0" icon={Users} hint="Sem integração" />
          </div>
          <EmptyChannel title="Performance consolidada" />
        </TabsContent>
        <TabsContent value="ads"><EmptyChannel title="Google Ads, Meta Ads" /></TabsContent>
        <TabsContent value="seo"><EmptyChannel title="Search Console & Analytics" /></TabsContent>
        <TabsContent value="crm"><EmptyChannel title="RD Station & funil" /></TabsContent>
        <TabsContent value="feedback" className="mt-4">
          <Card className="border-border/70 shadow-none">
            <CardHeader><CardTitle className="text-base">Feedback do cliente</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea rows={3} placeholder="Compartilhe um comentário sobre os resultados..." disabled />
              <div className="flex justify-end"><Button size="sm" disabled title="Envio de comentários ainda não implementado">Enviar comentário</Button></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function EmptyChannel({ title }: { title: string }) {
  return (
    <Card className="mt-4 border-dashed border-border/70 shadow-none">
      <CardContent className="grid h-56 place-items-center text-sm text-muted-foreground">
        <div className="text-center">
          <div className="font-medium text-foreground">{title}</div>
          <div className="mt-1">Conecte uma fonte em Integrações para popular este painel.</div>
        </div>
      </CardContent>
    </Card>
  );
}
