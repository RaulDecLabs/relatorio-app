import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { 
  RefreshCw, Plus, Share2, Download, Settings, FileSpreadsheet, BarChart2
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogTrigger, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";

import { ReportConfig } from "@/components/reports/report-ui";
import { TrafficTab } from "@/components/reports/traffic-tab";
import { GoogleAdsTab } from "@/components/reports/google-ads-tab";
import { MetaAdsTab } from "@/components/reports/meta-ads-tab";
import { GscTab } from "@/components/reports/gsc-tab";
import { SheetsTab } from "@/components/reports/sheets-tab";
import { RdMarketingTab } from "@/components/reports/rd-marketing-tab";
import { NectarCrmTab } from "@/components/reports/nectar-crm-tab";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { user } = useAuth();
  const { isClient } = useRoles();
  const queryClient = useQueryClient();
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [newReportName, setNewReportName] = useState("");
  const [newGa4PropertyId, setNewGa4PropertyId] = useState("");
  const [newGoogleAdsId, setNewGoogleAdsId] = useState("");
  const [newMetaAdsId, setNewMetaAdsId] = useState("");
  const [newGscUrl, setNewGscUrl] = useState("");
  const [newGoogleSheetsUrl, setNewGoogleSheetsUrl] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"traffic" | "ads" | "fb_ads" | "gsc" | "rd" | "nectar" | "sheets">("traffic");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [ga4PropertyId, setGa4PropertyId] = useState("");
  const [googleAdsId, setGoogleAdsId] = useState("");
  const [metaAdsId, setMetaAdsId] = useState("");
  const [gscUrl, setGscUrl] = useState("");
  const [rdPublicToken, setRdPublicToken] = useState("");
  const [rdPrivateToken, setRdPrivateToken] = useState("");
  const [rdClientId, setRdClientId] = useState("");
  const [rdClientSecret, setRdClientSecret] = useState("");
  const [nectarApiToken, setNectarApiToken] = useState("");
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState("");

  const [dateRange, setDateRange] = useState<string>("7");
  const getYesterdayAnd30DaysAgo = () => {
    const end = new Date();
    end.setDate(end.getDate() - 1);
    const start = new Date();
    start.setDate(end.getDate() - 29);
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    return { start: formatDate(start), end: formatDate(end) };
  };
  const defaults = getYesterdayAnd30DaysAgo();
  const [customStartDate, setCustomStartDate] = useState<string>(defaults.start);
  const [customEndDate, setCustomEndDate] = useState<string>(defaults.end);

  const getDatesForRange = (range: string, customStart: string, customEnd: string) => {
    const end = new Date();
    end.setDate(end.getDate() - 1);
    const start = new Date();

    switch (range) {
      case "yesterday":
        start.setDate(end.getDate());
        break;
      case "7":
        start.setDate(end.getDate() - 6);
        break;
      case "30":
        start.setDate(end.getDate() - 29);
        break;
      case "90":
        start.setDate(end.getDate() - 89);
        break;
      case "custom":
        if (customStart && customEnd) {
          return { startDateStr: customStart, endDateStr: customEnd };
        }
        start.setDate(end.getDate() - 6);
        break;
      default:
        start.setDate(end.getDate() - 6);
    }

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      startDateStr: formatDate(start),
      endDateStr: formatDate(end)
    };
  };

  const { startDateStr, endDateStr } = getDatesForRange(dateRange, customStartDate, customEndDate);

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link de compartilhamento copiado com sucesso!");
  };

  const handleExportData = () => {
    toast.success("Dados do relatório exportados (CSV/PDF) com sucesso!");
  };

  // 1. Query all report configurations from metadata table
  const { data: reports = [], isLoading: isLoadingConfigs } = useQuery<ReportConfig[]>({
    queryKey: ["reports-configs", user?.id, isClient],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports_config")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        toast.error("Erro ao carregar configurações de relatórios: " + error.message);
        throw error;
      }
      const list = data || [];
      if (isClient && user?.user_metadata?.assigned_report_id) {
        return list.filter((r) => r.id === user.user_metadata.assigned_report_id);
      }
      if (isClient && !user?.user_metadata?.assigned_report_id) {
        return [];
      }
      return list;
    },
    enabled: !!user || !isClient,
  });

  // Set default selected report once loaded
  const activeReport = reports.find(r => r.id === selectedReportId) || reports[0];

  useEffect(() => {
    if (activeReport) {
      setGa4PropertyId(activeReport.ga4_property_id || "");
      setGoogleAdsId(activeReport.google_ads_id || "");
      setMetaAdsId(activeReport.meta_ads_id || "");
      setGscUrl(activeReport.gsc_url || "");
      setRdPublicToken(activeReport.rd_public_token || "");
      setRdPrivateToken(activeReport.rd_private_token || "");
      setRdClientId(activeReport.rd_client_id || "");
      setRdClientSecret(activeReport.rd_client_secret || "");
      setNectarApiToken(activeReport.nectar_api_token || "");
      // Carregar link da planilha associada se houver
      supabase
        .from("reports_sheets_config")
        .select("google_sheets_url")
        .eq("report_id", activeReport.id)
        .maybeSingle()
        .then(({ data }) => {
          setGoogleSheetsUrl(data?.google_sheets_url || "");
        });
    }
  }, [activeReport, isSettingsOpen]);

  const updateSettingsMutation = useMutation({
    mutationFn: async ({ id, ga4PropertyId, googleAdsId, metaAdsId, gscUrl, rdPublicToken, rdPrivateToken, rdClientId, rdClientSecret, nectarApiToken, googleSheetsUrl }: { id: string; ga4PropertyId: string; googleAdsId: string; metaAdsId: string; gscUrl: string; rdPublicToken: string; rdPrivateToken: string; rdClientId: string; rdClientSecret: string; nectarApiToken: string; googleSheetsUrl: string }) => {
      const { data, error } = await supabase
        .from("reports_config")
        .update({ 
          ga4_property_id: ga4PropertyId || null,
          google_ads_id: googleAdsId || null,
          meta_ads_id: metaAdsId || null,
          gsc_url: gscUrl || null,
          rd_public_token: rdPublicToken || null,
          rd_private_token: rdPrivateToken || null,
          rd_client_id: rdClientId || null,
          rd_client_secret: rdClientSecret || null,
          nectar_api_token: nectarApiToken || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error("Erro ao salvar configurações: " + error.message);
      }

      if (googleSheetsUrl.trim()) {
        await supabase
          .from("reports_sheets_config")
          .upsert({
            report_id: id,
            google_sheets_url: googleSheetsUrl.trim(),
            client_name: data.name
          }, { onConflict: "report_id" });
      } else {
        await supabase.from("reports_sheets_config").delete().eq("report_id", id);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reports-configs"] });
      queryClient.invalidateQueries({ queryKey: ["sheets-audit"] });
      setIsSettingsOpen(false);
      toast.success(`Configurações e canais de "${data.name}" foram atualizados com sucesso!`);
    },
    onError: (err: any) => {
      toast.error(`Falha ao salvar configurações: ${err.message}`);
    }
  });

  const handleUpdateSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReport) return;
    updateSettingsMutation.mutate({
      id: activeReport.id,
      ga4PropertyId: ga4PropertyId.trim(),
      googleAdsId: googleAdsId.trim(),
      metaAdsId: metaAdsId.trim(),
      gscUrl: gscUrl.trim(),
      rdPublicToken: rdPublicToken.trim(),
      rdPrivateToken: rdPrivateToken.trim(),
      rdClientId: rdClientId.trim(),
      rdClientSecret: rdClientSecret.trim(),
      nectarApiToken: nectarApiToken.trim(),
      googleSheetsUrl: googleSheetsUrl.trim(),
    });
  };

  // 2. Query GA metrics from the dynamically selected table name
  const { data: metrics = [], isLoading: isLoadingMetrics, refetch } = useQuery({
    queryKey: ["ga-metrics", activeReport?.table_name, startDateStr, endDateStr],
    enabled: !!activeReport?.table_name,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(activeReport.table_name as any)
        .select("*")
        .gte("metric_date", startDateStr)
        .lte("metric_date", endDateStr)
        .order("metric_date", { ascending: true });

      if (error) {
        toast.error(`Erro ao carregar dados da tabela ${activeReport.table_name}: ` + error.message);
        throw error;
      }
      return (data || []) as any[];
    },
  });

  const generateTableName = (name: string, suffix: "_google_analytics_metrics" | "_google_ads_metrics" | "_google_search_console_metrics" | "_facebook_ads_metrics" = "_google_analytics_metrics") => {
    if (!name) return "";
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_") // replace spaces and special chars with _
      .replace(/^_+|_+$/g, "") // trim underscores from start/end
      + suffix;
  };

  // 3. Query Google Ads metrics from the dynamically selected ads table name
  const { data: adsMetrics = [], isLoading: isLoadingAdsMetrics } = useQuery({
    queryKey: ["google-ads-metrics", activeReport?.ads_table_name, startDateStr, endDateStr],
    enabled: !!activeReport?.ads_table_name,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(activeReport.ads_table_name as any)
        .select("*")
        .gte("metric_date", startDateStr)
        .lte("metric_date", endDateStr)
        .order("metric_date", { ascending: true });

      if (error) {
        toast.error(`Erro ao carregar dados do Google Ads da tabela ${activeReport.ads_table_name}: ` + error.message);
        throw error;
      }
      return (data || []) as any[];
    },
  });

  // 3.5. Query Facebook Ads metrics from the dynamically selected fb_ads table name
  const { data: fbAdsMetrics = [], isLoading: isLoadingFbAdsMetrics } = useQuery({
    queryKey: ["facebook-ads-metrics", activeReport?.fb_ads_table_name, startDateStr, endDateStr],
    enabled: !!activeReport?.fb_ads_table_name,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(activeReport.fb_ads_table_name as any)
        .select("*")
        .gte("metric_date", startDateStr)
        .lte("metric_date", endDateStr)
        .order("metric_date", { ascending: true });

      if (error) {
        toast.error(`Erro ao carregar dados do Facebook Ads da tabela ${activeReport.fb_ads_table_name}: ` + error.message);
        throw error;
      }
      return (data || []) as any[];
    },
  });

  // 3.8. Query Google Search Console metrics from the dynamically selected gsc table name
  const { data: gscMetrics = [], isLoading: isLoadingGscMetrics } = useQuery({
    queryKey: ["google-search-console-metrics", activeReport?.gsc_table_name, startDateStr, endDateStr],
    enabled: !!activeReport?.gsc_table_name,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(activeReport.gsc_table_name as any)
        .select("*")
        .gte("metric_date", startDateStr)
        .lte("metric_date", endDateStr)
        .order("metric_date", { ascending: true });

      if (error) {
        toast.error(`Erro ao carregar dados do Google Search Console da tabela ${activeReport.gsc_table_name}: ` + error.message);
        throw error;
      }
      return (data || []) as any[];
    },
  });

  // 3.9. Query RD Marketing metrics from the REAL-TIME Webhook events table
  const { data: rdEvents = [], isLoading: isLoadingRdEvents } = useQuery({
    queryKey: ["rd-marketing-events", activeReport?.id, startDateStr, endDateStr],
    enabled: !!activeReport?.id,
    queryFn: async () => {
      // Ajustando a endDate para o final do dia para incluir os webhooks de hoje
      const endDateTime = `${endDateStr}T23:59:59.999Z`;
      const { data, error } = await supabase
        .from("rd_events" as any)
        .select("*")
        .eq("report_id", activeReport.id)
        .gte("created_at", `${startDateStr}T00:00:00.000Z`)
        .lte("created_at", endDateTime)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn(`Aviso ao carregar Webhooks da RD Station:`, error.message);
        return [];
      }
      return (data || []) as any[];
    },
  });

  // 3.8. Query Google Sheets Audit count
  const { data: sheetsAudit, isLoading: isLoadingSheetsAudit, refetch: refetchSheetsAudit } = useQuery({
    queryKey: ["sheets-audit", activeReport?.id, startDateStr, endDateStr],
    enabled: !!activeReport?.id,
    queryFn: async () => {
      const res = await fetch(`/api/public/sheets-audit?report_id=${activeReport.id}&startDate=${startDateStr}&endDate=${endDateStr}`);
      if (!res.ok) {
        throw new Error('Falha ao auditar planilha');
      }
      return res.json();
    }
  });

  // 3.9 Query Nectar CRM Deals
  const { data: nectarDeals = [], isLoading: isLoadingNectarDeals } = useQuery({
    queryKey: ["nectar-deals", activeReport?.id, startDateStr, endDateStr],
    enabled: !!activeReport?.id && !!activeReport?.nectar_api_token,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nectar_deals")
        .select("*")
        .eq("report_id", activeReport.id)
        .gte("created_at", `${startDateStr}T00:00:00.000Z`)
        .lte("created_at", `${endDateStr}T23:59:59.999Z`)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn(`Erro ao carregar Deals do Nectar CRM:`, error.message);
        return [];
      }
      return data || [];
    },
  });

  // 4. Mutation to create report config mapping & dynamic tables (GA4, Ads, FB Ads, and GSC)
  const createReportMutation = useMutation({
    mutationFn: async ({ 
      name, 
      ga4PropertyId, 
      googleAdsId, 
      metaAdsId, 
      gscUrl, 
      googleSheetsUrl 
    }: { 
      name: string;
      ga4PropertyId: string;
      googleAdsId: string;
      metaAdsId: string;
      gscUrl: string;
      googleSheetsUrl: string;
    }) => {
      const gaTableName = generateTableName(name, "_google_analytics_metrics");
      const adsTableName = generateTableName(name, "_google_ads_metrics");
      const fbAdsTableName = generateTableName(name, "_facebook_ads_metrics");
      const gscTableName = generateTableName(name, "_google_search_console_metrics");

      // 1. Create the physical dynamic GA4 table in Postgres
      const { error: rpcGaErr } = await supabase.rpc("create_dynamic_table", {
        p_table_name: gaTableName
      });
      if (rpcGaErr) {
        throw new Error("Erro ao criar a tabela de tráfego (GA4) no banco: " + rpcGaErr.message);
      }

      // 2. Create the physical dynamic Google Ads table in Postgres
      const { error: rpcAdsErr } = await supabase.rpc("create_dynamic_ads_table", {
        p_table_name: adsTableName
      });
      if (rpcAdsErr) {
        throw new Error("Erro ao criar a tabela do Google Ads no banco: " + rpcAdsErr.message);
      }

      // 3. Create the physical dynamic Facebook / Meta Ads table in Postgres
      const { error: rpcFbErr } = await supabase.rpc("create_dynamic_fb_ads_table", {
        p_table_name: fbAdsTableName
      });
      if (rpcFbErr) {
        throw new Error("Erro ao criar a tabela de Facebook/Meta Ads no banco: " + rpcFbErr.message);
      }

      // 4. Create the physical dynamic Google Search Console table in Postgres
      const { error: rpcGscErr } = await supabase.rpc("create_dynamic_gsc_table", {
        p_table_name: gscTableName
      });
      if (rpcGscErr) {
        throw new Error("Erro ao criar a tabela do Google Search Console no banco: " + rpcGscErr.message);
      }

      // 5. Insert mapping configuration
      const { data: newConf, error: insertErr } = await supabase
        .from("reports_config")
        .insert({
          name,
          table_name: gaTableName,
          ads_table_name: adsTableName,
          fb_ads_table_name: fbAdsTableName,
          gsc_table_name: gscTableName,
          ga4_property_id: ga4PropertyId || null,
          google_ads_id: googleAdsId || null,
          meta_ads_id: metaAdsId || null,
          gsc_url: gscUrl || null,
        })
        .select()
        .single();

      if (insertErr) {
        throw new Error("Erro ao salvar configuração de relatório: " + insertErr.message);
      }

      // 6. Link Google Sheets URL if provided
      if (googleSheetsUrl.trim()) {
        await supabase
          .from("reports_sheets_config")
          .upsert({
            report_id: newConf.id,
            google_sheets_url: googleSheetsUrl.trim(),
            client_name: newConf.name
          }, { onConflict: "report_id" });
      }

      return newConf;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reports-configs"] });
      queryClient.invalidateQueries({ queryKey: ["sheets-audit"] });
      setSelectedReportId(data.id);
      setIsDialogOpen(false);
      setNewReportName("");
      setNewGa4PropertyId("");
      setNewGoogleAdsId("");
      setNewMetaAdsId("");
      setNewGscUrl("");
      setNewGoogleSheetsUrl("");
      toast.success(`Relatório para "${data.name}" criado com sucesso! Todas as tabelas (GA4, Google Ads, Meta Ads e GSC) foram conectadas.`);
    },
    onError: (err: any) => {
      toast.error(`Falha ao criar relatório: ${err.message}`);
    }
  });

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReportName.trim()) {
      toast.error("Por favor, preencha o nome da empresa.");
      return;
    }
    createReportMutation.mutate({
      name: newReportName.trim(),
      ga4PropertyId: newGa4PropertyId.trim(),
      googleAdsId: newGoogleAdsId.trim(),
      metaAdsId: newMetaAdsId.trim(),
      gscUrl: newGscUrl.trim(),
      googleSheetsUrl: newGoogleSheetsUrl.trim(),
    });
  };

  const isLoading = isLoadingConfigs || isLoadingMetrics || isLoadingAdsMetrics || isLoadingFbAdsMetrics || isLoadingGscMetrics || isLoadingRdEvents || isLoadingNectarDeals;

  return (
    <AppShell title="Relatórios">
      <PageHeader
        title="Relatórios de Tráfego"
        description="Acompanhe sessões, rolagens, canais e conversões consolidadas do Google Analytics."
        actions={
          <div className="flex items-center gap-2">
            {activeReport && (
              <>
                <Button variant="outline" size="sm" className="h-9 gap-2 bg-card/50 border-border/80 shadow-sm" onClick={handleCopyShareLink}>
                  <Share2 className="h-4 w-4 text-muted-foreground" />
                  <span className="hidden sm:inline">Compartilhar</span>
                </Button>
                <Button variant="outline" size="sm" className="h-9 gap-2 bg-card/50 border-border/80 shadow-sm" onClick={handleExportData}>
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>

                {!isClient && (
                  <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 gap-2 bg-card/50 border-border/80 shadow-sm">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <span className="hidden sm:inline">Configurar</span>
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="sm:max-w-[580px] max-h-[85vh] overflow-y-auto">
                    <form onSubmit={handleUpdateSettings}>
                      <DialogHeader>
                        <DialogTitle>Configurar Canais e Fontes - {activeReport.name}</DialogTitle>
                        <DialogDescription>
                          Insira ou edite as credenciais de conexão, IDs de contas de anúncios e link de planilha para este cliente.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="grid gap-1.5">
                            <Label htmlFor="ga4PropertyId" className="text-xs font-semibold">Google Analytics 4 (GA4 Property ID)</Label>
                            <Input
                              id="ga4PropertyId"
                              placeholder="Ex: 432109876"
                              value={ga4PropertyId}
                              onChange={(e) => setGa4PropertyId(e.target.value)}
                              className="h-9 text-sm"
                            />
                            <p className="text-[10px] text-muted-foreground">Número de 9 dígitos da propriedade GA4.</p>
                          </div>
                          
                          <div className="grid gap-1.5">
                            <Label htmlFor="googleAdsId" className="text-xs font-semibold">Google Ads (Customer Account ID)</Label>
                            <Input
                              id="googleAdsId"
                              placeholder="Ex: 123-456-7890"
                              value={googleAdsId}
                              onChange={(e) => setGoogleAdsId(e.target.value)}
                              className="h-9 text-sm"
                            />
                            <p className="text-[10px] text-muted-foreground">ID da conta no Google Ads.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="grid gap-1.5">
                            <Label htmlFor="metaAdsId" className="text-xs font-semibold">Meta Ads (Facebook & IG Account ID)</Label>
                            <Input
                              id="metaAdsId"
                              placeholder="Ex: act_987654321"
                              value={metaAdsId}
                              onChange={(e) => setMetaAdsId(e.target.value)}
                              className="h-9 text-sm"
                            />
                            <p className="text-[10px] text-muted-foreground">ID da conta de anúncios da Meta/Facebook.</p>
                          </div>
                          
                          <div className="grid gap-1.5">
                            <Label htmlFor="gscUrl" className="text-xs font-semibold">Google Search Console (URL do Site / SEO)</Label>
                            <Input
                              id="gscUrl"
                              placeholder="Ex: https://meusite.com.br"
                              value={gscUrl}
                              onChange={(e) => setGscUrl(e.target.value)}
                              className="h-9 text-sm"
                            />
                            <p className="text-[10px] text-muted-foreground">URL da propriedade cadastrada no Search Console.</p>
                          </div>
                        </div>

                        <div className="grid gap-4 pt-2 border-t border-border/60">
                          <div className="flex flex-col gap-2">
                            <Label className="text-sm font-bold text-orange-600 dark:text-orange-400">Integração RD Station (OAuth 2.0)</Label>
                            <p className="text-xs text-muted-foreground">O Client ID e Secret podem ser cadastrados por cliente abaixo. Se deixados em branco, o sistema tentará usar as chaves globais da sua agência no servidor (.env).</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-1.5">
                              <Label htmlFor="rdClientId" className="text-xs font-semibold">Client ID do App (Opcional)</Label>
                              <Input
                                id="rdClientId"
                                placeholder="Client ID específico deste cliente..."
                                value={rdClientId}
                                onChange={(e) => setRdClientId(e.target.value)}
                                className="h-9 text-sm font-mono"
                              />
                            </div>
                            
                            <div className="grid gap-1.5">
                              <Label htmlFor="rdClientSecret" className="text-xs font-semibold">Client Secret do App (Opcional)</Label>
                              <Input
                                id="rdClientSecret"
                                type="password"
                                placeholder="Client Secret específico..."
                                value={rdClientSecret}
                                onChange={(e) => setRdClientSecret(e.target.value)}
                                className="h-9 text-sm font-mono"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-3 border rounded-md bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30">
                            <div>
                              <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-300">Conexão Oficial RD Station</h4>
                              <p className="text-xs text-orange-600/80 dark:text-orange-400/80">
                                {activeReport.rd_refresh_token 
                                  ? "✅ Token de acesso OAuth conectado. A extração de histórico está ativa." 
                                  : "❌ Não conectado. É necessário fazer o Login com RD Station para puxar os leads do período."}
                              </p>
                            </div>
                            <Button 
                              type="button"
                              onClick={() => {
                                window.location.href = `/api/auth/login/rd-marketing?report_id=${activeReport.id}`;
                              }}
                              className="bg-[#f06924] hover:bg-[#d65d20] text-white whitespace-nowrap"
                            >
                              Conectar RD Station
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-4 pt-2 border-t border-border/60">
                          <div className="flex flex-col gap-2">
                            <Label className="text-sm font-bold text-blue-600 dark:text-blue-400">Integração Nectar CRM</Label>
                            <p className="text-xs text-muted-foreground">Insira o Token de API do Nectar CRM para sincronizar os dados de vendas (Negócios e Funil).</p>
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor="nectarApiToken" className="text-xs font-semibold">Token de API (Nectar CRM)</Label>
                            <Input
                              id="nectarApiToken"
                              type="password"
                              placeholder="Cole o token da API aqui..."
                              value={nectarApiToken}
                              onChange={(e) => setNectarApiToken(e.target.value)}
                              className="h-9 text-sm font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/60 opacity-60">
                          <div className="grid gap-1.5">
                            <Label htmlFor="rdPublicToken" className="text-xs font-semibold">Token Público (Antigo / Legado)</Label>
                            <Input
                              id="rdPublicToken"
                              placeholder="Ex: d7a8f9e0-..."
                              value={rdPublicToken}
                              onChange={(e) => setRdPublicToken(e.target.value)}
                              className="h-9 text-sm font-mono"
                            />
                            <p className="text-[10px] text-muted-foreground">Obsoleto. Não puxe histórico com ele.</p>
                          </div>
                          
                          <div className="grid gap-1.5">
                            <Label htmlFor="rdPrivateToken" className="text-xs font-semibold">Token Privado (Antigo / Legado)</Label>
                            <Input
                              id="rdPrivateToken"
                              type="password"
                              placeholder="Ex: 8c1b2d3e-..."
                              value={rdPrivateToken}
                              onChange={(e) => setRdPrivateToken(e.target.value)}
                              className="h-9 text-sm font-mono"
                            />
                            <p className="text-[10px] text-muted-foreground">Obsoleto. Apenas para Webhooks pontuais.</p>
                          </div>
                        </div>

                        <div className="grid gap-1.5 pt-2 border-t border-border/60">
                          <Label htmlFor="googleSheetsUrl" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Planilha Personalizada (Google Sheets Link)</Label>
                          <Input
                            id="googleSheetsUrl"
                            placeholder="Ex: https://docs.google.com/spreadsheets/d/1XyZ..."
                            value={googleSheetsUrl}
                            onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                            className="h-9 text-sm"
                          />
                          <p className="text-[10px] text-muted-foreground">URL completa da planilha do cliente para alimentar a aba Planilha no relatório.</p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          type="submit" 
                          disabled={updateSettingsMutation.isPending}
                          className="w-full sm:w-auto"
                        >
                          {updateSettingsMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                )}
              </>
            )}

            {reports.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="min-w-48">
                  {isClient ? (
                    <div className="flex items-center h-9 px-3 rounded-md bg-muted/50 border border-border/80 text-xs font-semibold text-foreground">
                      🏢 {activeReport?.name || "Empresa Vinculada"}
                    </div>
                  ) : (
                    <Select
                      value={activeReport?.id}
                      onValueChange={(val) => {
                        setSelectedReportId(val);
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Escolha a empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {reports.map((report) => (
                          <SelectItem key={report.id} value={report.id}>
                            {report.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="min-w-36">
                  <Select
                    value={dateRange}
                    onValueChange={(val) => setDateRange(val)}
                  >
                    <SelectTrigger className="h-9 bg-card/50 border-border/80">
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yesterday">Ontem</SelectItem>
                      <SelectItem value="7">Últimos 7 dias</SelectItem>
                      <SelectItem value="30">Últimos 30 dias</SelectItem>
                      <SelectItem value="90">Últimos 90 dias</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {dateRange === "custom" && (
                  <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-200">
                    <Input
                      type="date"
                      className="h-9 w-[130px] text-xs bg-card/50 border-border/80 px-2.5"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">até</span>
                    <Input
                      type="date"
                      className="h-9 w-[130px] text-xs bg-card/50 border-border/80 px-2.5"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {!isClient && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-9">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Relatório
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-[620px] max-h-[88vh] overflow-y-auto">
                <form onSubmit={handleCreateReport}>
                  <DialogHeader>
                    <DialogTitle className="text-xl">Criar Novo Relatório & Conectar Canais</DialogTitle>
                    <DialogDescription>
                      Cadastre uma nova empresa e concentre aqui todos os parâmetros para ativar as integrações de Tráfego, Anúncios, SEO e Planilhas no mesmo local.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-5 py-4">
                    <div className="grid gap-1.5">
                      <Label htmlFor="companyName" className="font-bold text-sm text-foreground">Nome da Empresa (Obrigatorio)</Label>
                      <Input
                        id="companyName"
                        placeholder="Ex: Minha Empresa ou Cliente Alpha"
                        value={newReportName}
                        onChange={(e) => setNewReportName(e.target.value)}
                        className="h-10 text-sm border-primary/40 focus:border-primary"
                        required
                      />
                    </div>

                    <div className="space-y-3 p-3.5 rounded-xl border border-border/80 bg-muted/20">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Credenciais & IDs das Plataformas (Opcional)</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="grid gap-1">
                          <Label htmlFor="newGa4" className="text-xs">GA4 Property ID</Label>
                          <Input
                            id="newGa4"
                            placeholder="Ex: 432109876"
                            value={newGa4PropertyId}
                            onChange={(e) => setNewGa4PropertyId(e.target.value)}
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor="newGads" className="text-xs">Google Ads ID</Label>
                          <Input
                            id="newGads"
                            placeholder="Ex: 123-456-7890"
                            value={newGoogleAdsId}
                            onChange={(e) => setNewGoogleAdsId(e.target.value)}
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor="newMeta" className="text-xs">Meta Ads Account ID</Label>
                          <Input
                            id="newMeta"
                            placeholder="Ex: act_987654321"
                            value={newMetaAdsId}
                            onChange={(e) => setNewMetaAdsId(e.target.value)}
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label htmlFor="newGsc" className="text-xs">Search Console (SEO URL)</Label>
                          <Input
                            id="newGsc"
                            placeholder="Ex: https://meusite.com.br"
                            value={newGscUrl}
                            onChange={(e) => setNewGscUrl(e.target.value)}
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                      </div>

                      <div className="grid gap-1 pt-1">
                        <Label htmlFor="newSheets" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Link do Google Sheets (Planilha Personalizada)</Label>
                        <Input
                          id="newSheets"
                          placeholder="Ex: https://docs.google.com/spreadsheets/d/..."
                          value={newGoogleSheetsUrl}
                          onChange={(e) => setNewGoogleSheetsUrl(e.target.value)}
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Dica: Você poderá alterar ou adicionar qualquer um destes links e IDs a qualquer momento clicando em <strong>Configurar</strong> no painel.</p>
                    </div>

                    <div className="grid gap-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tabelas Dedicadas Geradas no Banco (Supabase)</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-muted p-2.5 rounded-lg border font-mono text-[10px] text-muted-foreground select-all">
                        <div>GA4: <span className="text-foreground">{newReportName ? generateTableName(newReportName, "_google_analytics_metrics") : "---"}</span></div>
                        <div>Ads: <span className="text-foreground">{newReportName ? generateTableName(newReportName, "_google_ads_metrics") : "---"}</span></div>
                        <div>Meta Ads: <span className="text-foreground">{newReportName ? generateTableName(newReportName, "_facebook_ads_metrics") : "---"}</span></div>
                        <div>GSC: <span className="text-foreground">{newReportName ? generateTableName(newReportName, "_google_search_console_metrics") : "---"}</span></div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Ao clicar em criar, o sistema estrutura instantaneamente as 4 tabelas de métricas para a empresa no banco de dados e vincula todas as contas especificadas.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={createReportMutation.isPending || !newReportName.trim()}
                      className="w-full sm:w-auto font-semibold"
                    >
                      {createReportMutation.isPending ? "Estruturando Empresa & Tabelas..." : "Criar Relatório e Conectar Canais"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            )}

            {activeReport && (
              <Button variant="outline" size="sm" className="h-9" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        }
      />

      {activeReport ? (
        <div className="space-y-6">
          {/* Tabs Selector */}
          <div className="flex border-b border-border/60 mb-6 gap-2 overflow-x-auto">
            <Button
              variant="ghost"
              className={cn(
                "px-4 py-2 text-sm font-semibold rounded-none border-b-2 -mb-[2px] transition-all whitespace-nowrap",
                activeTab === "traffic" 
                  ? "border-primary text-primary bg-primary/5" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("traffic")}
            >
              Tráfego Web (GA4)
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "px-4 py-2 text-sm font-semibold rounded-none border-b-2 -mb-[2px] transition-all whitespace-nowrap",
                activeTab === "ads" 
                  ? "border-primary text-primary bg-primary/5" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("ads")}
            >
              Google Ads
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "px-4 py-2 text-sm font-semibold rounded-none border-b-2 -mb-[2px] transition-all whitespace-nowrap",
                activeTab === "fb_ads" 
                  ? "border-primary text-primary bg-primary/5" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("fb_ads")}
            >
              Facebook Ads
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "px-4 py-2 text-sm font-semibold rounded-none border-b-2 -mb-[2px] transition-all whitespace-nowrap",
                activeTab === "gsc" 
                  ? "border-primary text-primary bg-primary/5" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("gsc")}
            >
              Search Console (SEO)
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "px-4 py-2 text-sm font-semibold rounded-none border-b-2 -mb-[2px] transition-all whitespace-nowrap flex items-center gap-1.5",
                activeTab === "rd" 
                  ? "border-orange-500 text-orange-500 bg-orange-500/5" 
                  : "border-transparent text-muted-foreground hover:text-foreground hover:text-orange-500"
              )}
              onClick={() => setActiveTab("rd")}
            >
              RD Marketing
              <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-pulse" title="Inbound & Leads" />
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "px-4 py-2 text-sm font-semibold rounded-none border-b-2 -mb-[2px] transition-all whitespace-nowrap",
                activeTab === "nectar" 
                  ? "border-primary text-primary bg-primary/5" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("nectar")}
            >
              Nectar CRM
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "px-4 py-2 text-sm font-semibold rounded-none border-b-2 -mb-[2px] transition-all whitespace-nowrap",
                activeTab === "sheets" 
                  ? "border-primary text-primary bg-primary/5" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("sheets")}
            >
              Planilha
            </Button>
          </div>

          {activeTab === "traffic" && (
            <TrafficTab metrics={metrics} activeReport={activeReport} />
          )}

          {activeTab === "ads" && (
            <GoogleAdsTab adsMetrics={adsMetrics} activeReport={activeReport} />
          )}

          {activeTab === "fb_ads" && (
            <MetaAdsTab fbAdsMetrics={fbAdsMetrics} activeReport={activeReport} />
          )}

          {activeTab === "gsc" && (
            <GscTab gscMetrics={gscMetrics} activeReport={activeReport} />
          )}

          {activeTab === "rd" && (
            <div className="mt-6 animate-in fade-in duration-500">
              <RdMarketingTab 
                activeReport={activeReport} 
                startDateStr={startDateStr} 
                endDateStr={endDateStr} 
                rdEvents={rdEvents} 
              />
            </div>
          )}

          {activeTab === "nectar" && (
            <div className="mt-6 animate-in fade-in duration-500">
              <NectarCrmTab 
                activeReport={activeReport} 
                startDateStr={startDateStr} 
                endDateStr={endDateStr} 
                deals={nectarDeals}
              />
            </div>
          )}

          {activeTab === "sheets" && (
            <SheetsTab 
              sheetsAudit={sheetsAudit}
              isLoadingSheetsAudit={isLoadingSheetsAudit}
              refetchSheetsAudit={refetchSheetsAudit}
              dateRange={dateRange}
              isClient={isClient}
            />
          )}
        </div>
      ) : (
        <Card className="border-border/70 shadow-none p-12 text-center bg-card/60 backdrop-blur-md">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <BarChart2 className="h-6 w-6" />
          </div>
          <p className="text-muted-foreground font-medium animate-pulse">Carregando relatórios configurados...</p>
        </Card>
      )}
    </AppShell>
  );
}
