import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Plug, Plus, RefreshCw, CheckCircle2, XCircle, Clock, Copy, Code, ShieldCheck, ShieldAlert, KeyRound, Workflow, Webhook, ExternalLink, Zap } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/use-role";
import { getN8nAdminStatus, signSamplePayload, runIngestSelfTest } from "@/lib/n8n-admin.functions";

export const Route = createFileRoute("/_authenticated/integrations")({
  component: IntegrationsPage,
});


type SourceKey = "google_ads" | "google_analytics" | "meta_ads" | "tiktok_ads" | "instagram" | "sheets";

const SOURCES: { key: SourceKey; label: string; description: string; color: string }[] = [
  { key: "google_ads", label: "Google Ads", description: "Campanhas, gasto, cliques, conversões", color: "bg-blue-500/10 text-blue-600" },
  { key: "google_analytics", label: "Google Analytics 4", description: "Sessões, usuários, eventos, conversões", color: "bg-orange-500/10 text-orange-600" },
  { key: "meta_ads", label: "Meta Ads", description: "Facebook + Instagram ads", color: "bg-indigo-500/10 text-indigo-600" },
  { key: "tiktok_ads", label: "TikTok Ads", description: "Campanhas TikTok", color: "bg-pink-500/10 text-pink-600" },
  { key: "instagram", label: "Instagram Insights", description: "Orgânico: posts, alcance, engajamento", color: "bg-fuchsia-500/10 text-fuchsia-600" },
  { key: "sheets", label: "Google Sheets", description: "Leads e dados manuais via planilha", color: "bg-emerald-500/10 text-emerald-600" },
];

function IntegrationsPage() {
  const { isStaff, isAdmin } = useRoles();
  const [selectedClient, setSelectedClient] = useState<string>("");

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, company_name").order("company_name");
      if (error) throw error;
      return data;
    },
  });

  const currentClientId = selectedClient || clients[0]?.id || "";

  return (
    <AppShell title="Integrações">
      <PageHeader
        title="Integrações"
        description="Conecte fontes de dados via n8n. Cada cliente tem suas próprias conexões e logs de ingestão."
        actions={
          <div className="flex items-center gap-2">
            <Select value={currentClientId} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {!currentClientId ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            Nenhum cliente cadastrado. Crie um cliente primeiro em <strong>Clientes</strong>.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="sources" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sources">Fontes</TabsTrigger>
            <TabsTrigger value="logs">Logs de ingestão</TabsTrigger>
            <TabsTrigger value="endpoint">Endpoint n8n</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin">Admin n8n</TabsTrigger>}
          </TabsList>

          <TabsContent value="sources">
            <SourcesGrid clientId={currentClientId} isStaff={isStaff} />
          </TabsContent>

          <TabsContent value="logs">
            <LogsPanel clientId={currentClientId} />
          </TabsContent>

          <TabsContent value="endpoint">
            <EndpointPanel clientId={currentClientId} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin">
              <AdminN8nPanel clientId={currentClientId} />
            </TabsContent>
          )}
        </Tabs>
      )}
    </AppShell>
  );
}


function SourcesGrid({ clientId, isStaff }: { clientId: string; isStaff: boolean }) {
  const qc = useQueryClient();

  const { data: integrations = [] } = useQuery({
    queryKey: ["integrations", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integrations")
        .select("*")
        .eq("client_id", clientId);
      if (error) throw error;
      return data;
    },
  });

  const toggleMut = useMutation({
    mutationFn: async ({ source, action }: { source: SourceKey; action: "connect" | "disconnect" }) => {
      const existing = integrations.find((i) => i.source === source);
      if (existing) {
        const { error } = await supabase
          .from("integrations")
          .update({ status: action === "connect" ? "connected" : "disconnected" })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("integrations").insert({
          client_id: clientId,
          source,
          status: action === "connect" ? "connected" : "disconnected",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["integrations", clientId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {SOURCES.map((s) => {
        const integ = integrations.find((i) => i.source === s.key);
        const status = integ?.status ?? "disconnected";
        const lastSync = integ?.last_sync_at;
        return (
          <Card key={s.key} className="border-border/70 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className={`grid h-10 w-10 place-items-center rounded-md ${s.color}`}>
                  <Plug className="h-5 w-5" />
                </div>
                <StatusBadge status={status} />
              </div>
              <CardTitle className="mt-3 text-base">{s.label}</CardTitle>
              <CardDescription className="text-xs">{s.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="text-xs text-muted-foreground">
                {lastSync
                  ? `Último sync: ${formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: ptBR })}`
                  : "Sem sincronizações ainda"}
              </div>
              {isStaff && (
                <Button
                  size="sm"
                  variant={status === "connected" ? "outline" : "default"}
                  className="w-full"
                  onClick={() =>
                    toggleMut.mutate({
                      source: s.key,
                      action: status === "connected" ? "disconnect" : "connect",
                    })
                  }
                  disabled={toggleMut.isPending}
                >
                  {status === "connected" ? "Desconectar" : "Marcar como conectada"}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function LogsPanel({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["ingest-logs", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingest_logs")
        .select("*")
        .eq("client_id", clientId)
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Últimas execuções</CardTitle>
          <CardDescription className="text-xs">Histórico das últimas 50 ingestões deste cliente.</CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => qc.invalidateQueries({ queryKey: ["ingest-logs", clientId] })}
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
            Nenhuma ingestão ainda. Configure um workflow no n8n para começar a enviar dados.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Recebidas</TableHead>
                <TableHead className="text-right">Gravadas</TableHead>
                <TableHead>Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs">
                    {formatDistanceToNow(new Date(log.started_at), { addSuffix: true, locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{log.source}</TableCell>
                  <TableCell>
                    <StatusBadge status={log.status} />
                  </TableCell>
                  <TableCell className="text-right text-xs">{log.rows_received}</TableCell>
                  <TableCell className="text-right text-xs">{log.rows_upserted}</TableCell>
                  <TableCell className="max-w-[280px] truncate text-xs text-destructive">
                    {log.error || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function EndpointPanel({ clientId }: { clientId: string }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const endpoint = `${origin}/api/public/ingest`;

  const exampleBody = JSON.stringify(
    {
      client_id: clientId,
      source: "google_ads",
      request_id: "run-{{ $now }}",
      rows: [
        {
          metric_date: "2026-06-04",
          scope: "campaign",
          entity_id: "1234567890",
          entity_name: "Campanha Leads",
          dimensions: { account_id: "987-654-3210" },
          metrics: { impressions: 12000, clicks: 340, cost: 580.5, conversions: 22 },
        },
      ],
    },
    null,
    2,
  );

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success("Copiado");
  };

  return (
    <div className="grid gap-4">
      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Configuração no n8n</CardTitle>
          <CardDescription className="text-xs">
            Use estas informações para configurar o nó HTTP Request no workflow do n8n.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="URL (POST)" value={endpoint} onCopy={() => copy(endpoint)} />
          <Field label="Header: Content-Type" value="application/json" onCopy={() => copy("application/json")} />
          <Field
            label="Header: x-ingest-signature"
            value="sha256=<HMAC-SHA256(body, INGEST_HMAC_SECRET)>"
            onCopy={() => copy("sha256={{ $crypto.createHmac('sha256', $env.INGEST_HMAC_SECRET).update(JSON.stringify($json)).digest('hex') }}")}
            helper="Calcule HMAC-SHA256 do body com o INGEST_HMAC_SECRET. No n8n, use um nó Code antes do HTTP Request."
          />
          <Field label="client_id da Decsigner (use neste workflow)" value={clientId} onCopy={() => copy(clientId)} />
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Body de exemplo</CardTitle>
          <CardDescription className="text-xs">
            Formato esperado pelo endpoint. Campos: <code>client_id</code>, <code>source</code>, <code>rows[]</code> (1-5000 linhas).
            Cada linha precisa de <code>metric_date</code> (YYYY-MM-DD); o resto é flexível em <code>dimensions</code> e <code>metrics</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">
              <code>{exampleBody}</code>
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute right-2 top-2"
              onClick={() => copy(exampleBody)}
            >
              <Copy className="mr-1.5 h-3 w-3" />
              Copiar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code className="h-4 w-4" />
            Fontes suportadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((s) => (
              <Badge key={s.key} variant="secondary" className="font-mono text-xs">
                {s.key}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, onCopy, helper }: { label: string; value: string; onCopy: () => void; helper?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs">{value}</code>
        <Button size="sm" variant="outline" onClick={onCopy}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "connected" || status === "success") {
    return (
      <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10">
        <CheckCircle2 className="h-3 w-3" /> {status === "success" ? "Sucesso" : "Conectada"}
      </Badge>
    );
  }
  if (status === "failed" || status === "error") {
    return (
      <Badge variant="secondary" className="gap-1 bg-destructive/10 text-destructive hover:bg-destructive/10">
        <XCircle className="h-3 w-3" /> Falhou
      </Badge>
    );
  }
  if (status === "running" || status === "pending") {
    return (
      <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10">
        <Clock className="h-3 w-3" /> {status === "running" ? "Executando" : "Pendente"}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      Desconectada
    </Badge>
  );
}

function AdminN8nPanel({ clientId }: { clientId: string }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const endpoint = `${origin}/api/public/ingest`;
  const n8nUrl = "https://n8n.declabsai.com.br";

  const statusFn = useServerFn(getN8nAdminStatus);
  const signFn = useServerFn(signSamplePayload);
  const selfTestFn = useServerFn(runIngestSelfTest);
  const qc = useQueryClient();

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ["n8n-admin-status"],
    queryFn: () => statusFn(),
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ["n8n-admin-recent-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingest_logs")
        .select("status, source, started_at")
        .gte("started_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000,
  });

  const stats24h = useMemo(() => {
    const total = recentLogs.length;
    const success = recentLogs.filter((l) => l.status === "success").length;
    const failed = recentLogs.filter((l) => l.status === "failed" || l.status === "error").length;
    return { total, success, failed };
  }, [recentLogs]);

  const [testBody, setTestBody] = useState(
    JSON.stringify({ client_id: clientId, source: "sheets", rows: [{ metric_date: "2026-06-05", metrics: { leads: 1 } }] }, null, 2),
  );
  const [computedSig, setComputedSig] = useState<string | null>(null);

  const signMut = useMutation({
    mutationFn: async () => signFn({ data: { body: testBody } }),
    onSuccess: (res) => {
      setComputedSig(res.signature);
      toast.success("Assinatura gerada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  type SelfTestResult = Awaited<ReturnType<typeof selfTestFn>>;
  const [selfTest, setSelfTest] = useState<SelfTestResult | null>(null);
  const selfTestMut = useMutation({
    mutationFn: async () => selfTestFn({ data: { clientId } }),
    onSuccess: (res) => {
      setSelfTest(res);
      qc.invalidateQueries({ queryKey: ["n8n-admin-recent-logs"] });
      qc.invalidateQueries({ queryKey: ["ingest-logs", clientId] });
      if (res.verdict === "ok") toast.success("HMAC OK — endpoint respondeu 200");
      else if (res.verdict === "hmac_mismatch") toast.error("HMAC inválido (401)");
      else toast.warning(`Resposta ${res.status}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success("Copiado");
  };

  return (
    <div className="grid gap-4">
      {/* Status do secret */}
      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" />
            INGEST_HMAC_SECRET
          </CardTitle>
          <CardDescription className="text-xs">
            Chave compartilhada entre o InsightOS e o n8n. Toda requisição precisa vir assinada com ela.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusLoading ? (
            <div className="text-sm text-muted-foreground">Verificando…</div>
          ) : status?.secretConfigured ? (
            <div className="flex items-start gap-3 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
              <div className="flex-1 text-xs">
                <div className="font-medium text-emerald-700">Configurado no backend</div>
                <div className="mt-1 text-muted-foreground">
                  Valor mascarado: <code className="font-mono">{status.secretPreview}</code> ({status.secretLength} caracteres)
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => refetchStatus()}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-destructive" />
              <div className="text-xs">
                <div className="font-medium text-destructive">Secret ausente</div>
                <div className="mt-1 text-muted-foreground">
                  O endpoint <code>/api/public/ingest</code> vai responder 500 até o secret ser configurado.
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="font-medium text-foreground">Como rotacionar</div>
            <ol className="ml-4 mt-2 list-decimal space-y-1">
              <li>Peça ao agente: <em>"Atualize o secret INGEST_HMAC_SECRET"</em>.</li>
              <li>Cole o novo valor (32+ bytes em hex) no formulário seguro que abrir.</li>
              <li>No Portainer, edite o container do n8n → Env → atualize <code>INGEST_HMAC_SECRET</code> → Deploy.</li>
              <li>Os 2 valores precisam bater. Use o testador abaixo para confirmar.</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Saúde do webhook */}
      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Webhook className="h-4 w-4" />
            Webhook de ingestão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="POST" value={endpoint} onCopy={() => copy(endpoint)} />
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Execuções 24h" value={stats24h.total} />
            <StatCard label="Sucesso" value={stats24h.success} tone="emerald" />
            <StatCard label="Falhas" value={stats24h.failed} tone={stats24h.failed > 0 ? "destructive" : "muted"} />
          </div>
        </CardContent>
      </Card>

      {/* Testador HMAC */}
      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Testar assinatura HMAC</CardTitle>
          <CardDescription className="text-xs">
            Calcula no servidor o <code>x-ingest-signature</code> esperado para um body. Use para validar se o n8n está gerando a mesma assinatura.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={testBody}
            onChange={(e) => setTestBody(e.target.value)}
            rows={8}
            className="font-mono text-xs"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => signMut.mutate()} disabled={signMut.isPending}>
              {signMut.isPending ? "Calculando…" : "Calcular assinatura"}
            </Button>
            {computedSig && (
              <Button size="sm" variant="outline" onClick={() => copy(computedSig)}>
                <Copy className="mr-1.5 h-3 w-3" />
                Copiar header
              </Button>
            )}
          </div>
          {computedSig && (
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
              <code>x-ingest-signature: {computedSig}</code>
            </pre>
          )}
        </CardContent>
      </Card>

      {/* Teste end-to-end */}
      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" />
            Teste end-to-end do endpoint
          </CardTitle>
          <CardDescription className="text-xs">
            Assina um payload mínimo no servidor e envia para <code>/api/public/ingest</code>. Confirma que o secret do InsightOS está válido e que o endpoint responde 200. Depois, rode o mesmo teste do seu workflow no n8n: se ambos derem 200 com o mesmo secret, os HMACs batem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => selfTestMut.mutate()}
              disabled={selfTestMut.isPending || !clientId}
            >
              {selfTestMut.isPending ? "Enviando…" : "Enviar requisição de teste"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Vai gravar 1 linha de teste (<code>source=sheets</code>, <code>entity_id=selftest</code>) no cliente selecionado.
            </span>
          </div>

          {selfTest && (
            <div className="space-y-2 rounded-md border p-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {selfTest.verdict === "ok" && (
                  <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10">
                    <CheckCircle2 className="h-3 w-3" /> HMAC OK · {selfTest.status}
                  </Badge>
                )}
                {selfTest.verdict === "hmac_mismatch" && (
                  <Badge variant="secondary" className="gap-1 bg-destructive/10 text-destructive hover:bg-destructive/10">
                    <ShieldAlert className="h-3 w-3" /> HMAC inválido · 401
                  </Badge>
                )}
                {selfTest.verdict === "server_error" && (
                  <Badge variant="secondary" className="gap-1 bg-destructive/10 text-destructive hover:bg-destructive/10">
                    <XCircle className="h-3 w-3" /> Erro do servidor · {selfTest.status}
                  </Badge>
                )}
                <span className="text-muted-foreground">{selfTest.durationMs}ms · {selfTest.url}</span>
              </div>
              <div className="text-muted-foreground">
                request_id: <code className="font-mono">{selfTest.requestId}</code>
              </div>
              {selfTest.networkError ? (
                <pre className="overflow-x-auto rounded bg-destructive/5 p-2 text-destructive">
                  <code>{selfTest.networkError}</code>
                </pre>
              ) : (
                <pre className="overflow-x-auto rounded bg-muted p-2">
                  <code>{selfTest.responseBody || "(sem corpo)"}</code>
                </pre>
              )}
            </div>
          )}
        </CardContent>
      </Card>



      {/* Credenciais & workflows recomendados */}
      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Workflow className="h-4 w-4" />
            Instância e workflows
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="n8n URL" value={n8nUrl} onCopy={() => copy(n8nUrl)} />
          <div className="rounded-md border p-3 text-xs">
            <div className="font-medium">Variáveis de ambiente no container do n8n</div>
            <ul className="ml-4 mt-2 list-disc space-y-1 text-muted-foreground">
              <li><code>INGEST_HMAC_SECRET</code> — mesmo valor do backend</li>
              <li><code>N8N_HOST</code>, <code>N8N_PROTOCOL=https</code>, <code>WEBHOOK_URL</code> — já configurados</li>
            </ul>
          </div>
          <div className="rounded-md border p-3 text-xs">
            <div className="font-medium">Credenciais necessárias no n8n</div>
            <ul className="ml-4 mt-2 list-disc space-y-1 text-muted-foreground">
              <li>Google Sheets OAuth2 (escopo <code>spreadsheets.readonly</code>)</li>
              <li>Google Analytics OAuth2 (escopo <code>analytics.readonly</code>)</li>
            </ul>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <a href={n8nUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-3 w-3" />
                Abrir n8n
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, tone = "muted" }: { label: string; value: number; tone?: "muted" | "emerald" | "destructive" }) {
  const colors = {
    muted: "text-foreground",
    emerald: "text-emerald-600",
    destructive: "text-destructive",
  } as const;
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${colors[tone]}`}>{value}</div>
    </div>
  );
}

