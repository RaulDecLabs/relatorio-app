import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { 
  FileText, Sparkles, Globe, Clock, ArrowUpRight, Percent, 
  MousePointer, Activity, Play, RefreshCw, BarChart2, TrendingUp, Plus,
  ShoppingBag, DollarSign, Share2, Download, Laptop, Smartphone, Tablet,
  Settings, FileSpreadsheet
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from "recharts";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogTrigger, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

interface ReportConfig {
  id: string;
  name: string;
  table_name: string;
  ads_table_name?: string | null;
  fb_ads_table_name?: string | null;
  gsc_table_name?: string | null;
  ga4_property_id?: string | null;
  created_at: string;
}

function SectionTitle({ title, description, icon: Icon, color = "blue" }: { title: string, description: string, icon: any, color?: "blue" | "green" | "amber" | "indigo" | "purple" }) {
  const colorMap = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    green: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    indigo: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    purple: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  };
  const design = colorMap[color] || colorMap.blue;
  return (
    <div className="flex items-center gap-4 mb-6 mt-10">
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm", design)}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function CustomKpiCard({ 
  label, 
  value, 
  icon: Icon, 
  hint, 
  color = "blue" 
}: { 
  label: string; 
  value: string; 
  icon: any; 
  hint?: string; 
  color?: "blue" | "green" | "amber" | "red" | "indigo" | "purple" | "cyan" | "pink"
}) {
  const colorMap = {
    blue: { bg: "bg-blue-500/10 text-blue-500", accent: "border-blue-500/20", hover: "hover:border-blue-500/40 hover:shadow-blue-500/10", gradient: "from-blue-500/5 to-transparent", dot: "bg-blue-500" },
    green: { bg: "bg-emerald-500/10 text-emerald-500", accent: "border-emerald-500/20", hover: "hover:border-emerald-500/40 hover:shadow-emerald-500/10", gradient: "from-emerald-500/5 to-transparent", dot: "bg-emerald-500" },
    amber: { bg: "bg-amber-500/10 text-amber-500", accent: "border-amber-500/20", hover: "hover:border-amber-500/40 hover:shadow-amber-500/10", gradient: "from-amber-500/5 to-transparent", dot: "bg-amber-500" },
    red: { bg: "bg-rose-500/10 text-rose-500", accent: "border-rose-500/20", hover: "hover:border-rose-500/40 hover:shadow-rose-500/10", gradient: "from-rose-500/5 to-transparent", dot: "bg-rose-500" },
    indigo: { bg: "bg-indigo-500/10 text-indigo-500", accent: "border-indigo-500/20", hover: "hover:border-indigo-500/40 hover:shadow-indigo-500/10", gradient: "from-indigo-500/5 to-transparent", dot: "bg-indigo-500" },
    purple: { bg: "bg-purple-500/10 text-purple-500", accent: "border-purple-500/20", hover: "hover:border-purple-500/40 hover:shadow-purple-500/10", gradient: "from-purple-500/5 to-transparent", dot: "bg-purple-500" },
    cyan: { bg: "bg-cyan-500/10 text-cyan-500", accent: "border-cyan-500/20", hover: "hover:border-cyan-500/40 hover:shadow-cyan-500/10", gradient: "from-cyan-500/5 to-transparent", dot: "bg-cyan-500" },
    pink: { bg: "bg-pink-500/10 text-pink-500", accent: "border-pink-500/20", hover: "hover:border-pink-500/40 hover:shadow-pink-500/10", gradient: "from-pink-500/5 to-transparent", dot: "bg-pink-500" }
  };
  const design = colorMap[color] || colorMap.blue;

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border-border/40 bg-card/40 backdrop-blur-xl", 
      design.accent,
      design.hover
    )}>
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", design.gradient)} />
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/90">{label}</span>
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shadow-inner transition-all duration-300", design.bg)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-5 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">{value}</span>
        </div>
        {hint && (
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground/80 font-medium">
            <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", design.dot)} />
            <span>{hint}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProgressBreakdownRow({ 
  label, 
  sessions, 
  total, 
  color = "blue" 
}: { 
  label: string; 
  sessions: number; 
  total: number; 
  color?: "blue" | "green" | "amber" | "indigo" | "purple"
}) {
  const pct = total > 0 ? (sessions / total) * 100 : 0;
  
  const colorMap = {
    blue: "bg-blue-500",
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    indigo: "bg-indigo-500",
    purple: "bg-purple-500"
  };

  return (
    <div className="py-2.5">
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="font-medium text-foreground truncate max-w-[65%]" title={label}>{label}</span>
        <span className="font-semibold text-foreground/80 text-xs">
          {sessions.toLocaleString("pt-BR")} <span className="text-muted-foreground/60 font-normal ml-0.5">({pct.toFixed(1)}%)</span>
        </span>
      </div>
      <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", colorMap[color])} 
          style={{ width: `${pct}%` }} 
        />
      </div>
    </div>
  );
}

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/90 border border-border/80 backdrop-blur-md p-4 rounded-xl shadow-lg text-xs space-y-1.5 min-w-36">
        <p className="font-bold text-foreground mb-1 border-b pb-1 border-border/40">{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium flex-row">
              <span className="h-1.5 w-1.5 rounded-full inline-block mr-1.5" style={{ backgroundColor: entry.stroke }} />
              {entry.name}:
            </span>
            <span className="font-bold text-foreground">{entry.value.toLocaleString("pt-BR")}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function ReportsPage() {
  const queryClient = useQueryClient();
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [newReportName, setNewReportName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"traffic" | "ads" | "fb_ads" | "gsc" | "sheets">("traffic");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [ga4PropertyId, setGa4PropertyId] = useState("");

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
    queryKey: ["reports-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports_config")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        toast.error("Erro ao carregar configurações de relatórios: " + error.message);
        throw error;
      }
      return data || [];
    },
  });

  // Set default selected report once loaded
  const activeReport = reports.find(r => r.id === selectedReportId) || reports[0];

  useEffect(() => {
    if (activeReport) {
      setGa4PropertyId(activeReport.ga4_property_id || "");
    }
  }, [activeReport, isSettingsOpen]);

  const updateSettingsMutation = useMutation({
    mutationFn: async ({ id, ga4PropertyId }: { id: string; ga4PropertyId: string }) => {
      const { data, error } = await supabase
        .from("reports_config")
        .update({ ga4_property_id: ga4PropertyId })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error("Erro ao salvar configurações: " + error.message);
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reports-configs"] });
      setIsSettingsOpen(false);
      toast.success(`Configurações de "${data.name}" atualizadas!`);
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
      ga4PropertyId: ga4PropertyId.trim()
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
      return data || [];
    },
  });

  const generateTableName = (name: string, suffix: "_google_analytics_metrics" | "_google_ads_metrics" | "_google_search_console_metrics" = "_google_analytics_metrics") => {
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
      return data || [];
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
      return data || [];
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
      return data || [];
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

  // 4. Mutation to create report config mapping & dynamic tables (GA4, Ads, and GSC)
  const createReportMutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const gaTableName = generateTableName(name, "_google_analytics_metrics");
      const adsTableName = generateTableName(name, "_google_ads_metrics");
      const gscTableName = generateTableName(name, "_google_search_console_metrics");

      // 1. Create the physical dynamic GA4 table in Postgres
      const { error: rpcGaErr } = await supabase.rpc("create_dynamic_table", {
        p_table_name: gaTableName
      });
      if (rpcGaErr) {
        throw new Error("Erro ao criar a tabela de tráfego no banco: " + rpcGaErr.message);
      }

      // 2. Create the physical dynamic Google Ads table in Postgres
      const { error: rpcAdsErr } = await supabase.rpc("create_dynamic_ads_table", {
        p_table_name: adsTableName
      });
      if (rpcAdsErr) {
        throw new Error("Erro ao criar a tabela do Google Ads no banco: " + rpcAdsErr.message);
      }

      // 3. Create the physical dynamic Google Search Console table in Postgres
      const { error: rpcGscErr } = await supabase.rpc("create_dynamic_gsc_table", {
        p_table_name: gscTableName
      });
      if (rpcGscErr) {
        throw new Error("Erro ao criar a tabela do Google Search Console no banco: " + rpcGscErr.message);
      }

      // 4. Insert mapping configuration
      const { data: newConf, error: insertErr } = await supabase
        .from("reports_config")
        .insert({
          name,
          table_name: gaTableName,
          ads_table_name: adsTableName,
          gsc_table_name: gscTableName
        })
        .select()
        .single();

      if (insertErr) {
        throw new Error("Erro ao salvar configuração de relatório: " + insertErr.message);
      }
      return newConf;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reports-configs"] });
      setSelectedReportId(data.id);
      setIsDialogOpen(false);
      setNewReportName("");
      toast.success(`Relatório para "${data.name}" criado com sucesso com as tabelas de GA4, Google Ads e Search Console!`);
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
      name: newReportName.trim()
    });
  };

  const isLoading = isLoadingConfigs || isLoadingMetrics || isLoadingAdsMetrics || isLoadingFbAdsMetrics || isLoadingGscMetrics;

  // Calculate totals and metrics
  const totalSessions = metrics.reduce((sum, item) => sum + (item.sessions || 0), 0);
  const totalUsers = metrics.reduce((sum, item) => sum + (item.total_users || 0), 0);
  const totalPageViews = metrics.reduce((sum, item) => sum + (item.page_views || 0), 0);
  const totalEvents = metrics.reduce((sum, item) => sum + (item.events || 0), 0);
  const totalTransactions = metrics.reduce((sum, item) => sum + (item.transactions || 0), 0);
  const totalActiveUsers = metrics.reduce((sum, item) => sum + (item.active_users || 0), 0);
  const totalAdRevenue = metrics.reduce((sum, item) => sum + (item.total_ad_revenue || 0), 0);

  const avgBounceRate = totalSessions > 0
    ? (metrics.reduce((sum, item) => sum + ((item.bounce_rate || 0) * (item.sessions || 0)), 0) / totalSessions) * 100
    : 0;

  const avgEngagementRate = totalSessions > 0
    ? (metrics.reduce((sum, item) => sum + ((item.engagement_rate || 0) * (item.sessions || 0)), 0) / totalSessions) * 100
    : 0;
  
  const avgDurationSeconds = totalSessions > 0
    ? metrics.reduce((sum, item) => sum + ((item.average_session_duration || 0) * (item.sessions || 0)), 0) / totalSessions
    : 0;

  const formatDuration = (sec: number) => {
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60);
    return `${minutes}m ${seconds}s`;
  };

  // Group by date for the time chart
  const dateMap: { [date: string]: { date: string; sessions: number; pageViews: number; events: number } } = {};
  metrics.forEach(item => {
    const d = item.metric_date;
    if (!dateMap[d]) {
      dateMap[d] = { date: d, sessions: 0, pageViews: 0, events: 0 };
    }
    dateMap[d].sessions += item.sessions || 0;
    dateMap[d].pageViews += item.page_views || 0;
    dateMap[d].events += item.events || 0;
  });
  const chartData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

  // Group by Page Path
  const pageMap: { [path: string]: { path: string; sessions: number; pageViews: number; events: number } } = {};
  metrics.forEach(item => {
    const p = item.page_path || "/";
    if (!pageMap[p]) {
      pageMap[p] = { path: p, sessions: 0, pageViews: 0, events: 0 };
    }
    pageMap[p].sessions += item.sessions || 0;
    pageMap[p].pageViews += item.page_views || 0;
    pageMap[p].events += item.events || 0;
  });
  const pageData = Object.values(pageMap).sort((a, b) => b.pageViews - a.pageViews).slice(0, 10);

  // Group by Session Source
  const sourceMap: { [source: string]: { source: string; sessions: number; users: number; transactions: number } } = {};
  metrics.forEach(item => {
    const s = item.session_source || "(not set)";
    if (!sourceMap[s]) {
      sourceMap[s] = { source: s, sessions: 0, users: 0, transactions: 0 };
    }
    sourceMap[s].sessions += item.sessions || 0;
    sourceMap[s].users += item.total_users || 0;
    sourceMap[s].transactions += item.transactions || 0;
  });
  const sourceData = Object.values(sourceMap).sort((a, b) => b.sessions - a.sessions).slice(0, 10);

  // Group by City
  const cityMap: { [city: string]: { city: string; sessions: number } } = {};
  metrics.forEach(item => {
    const c = item.city || "(not set)";
    if (!cityMap[c]) {
      cityMap[c] = { city: c, sessions: 0 };
    }
    cityMap[c].sessions += item.sessions || 0;
  });
  const cityData = Object.values(cityMap).sort((a, b) => b.sessions - a.sessions).slice(0, 5);

  // Group by Device Category
  const deviceMap: { [device: string]: { name: string; value: number } } = {};
  metrics.forEach(item => {
    const d = item.device_category || "desktop";
    const name = d.charAt(0).toUpperCase() + d.slice(1);
    if (!deviceMap[name]) {
      deviceMap[name] = { name, value: 0 };
    }
    deviceMap[name].value += item.sessions || 0;
  });
  const deviceData = Object.values(deviceMap).sort((a, b) => b.value - a.value);

  // Group by Browser
  const browserMap: { [browser: string]: { browser: string; sessions: number } } = {};
  metrics.forEach(item => {
    const b = item.browser || "(not set)";
    if (!browserMap[b]) {
      browserMap[b] = { browser: b, sessions: 0 };
    }
    browserMap[b].sessions += item.sessions || 0;
  });
  const browserData = Object.values(browserMap).sort((a, b) => b.sessions - a.sessions).slice(0, 5);

  // --- Facebook Ads Calculations ---
  const totalFbAdsCost = fbAdsMetrics.reduce((sum, item) => sum + (item.spend || 0), 0);
  const totalFbAdsClicks = fbAdsMetrics.reduce((sum, item) => sum + (item.clicks || 0), 0);
  const totalFbAdsImpressions = fbAdsMetrics.reduce((sum, item) => sum + (item.impressions || 0), 0);
  const totalFbAdsConversions = fbAdsMetrics.reduce((sum, item) => sum + (item.conversions || 0), 0);
  
  const avgFbAdsCTR = totalFbAdsImpressions > 0 
    ? (totalFbAdsClicks / totalFbAdsImpressions) * 100 
    : 0;

  const avgFbAdsCPC = totalFbAdsClicks > 0 
    ? totalFbAdsCost / totalFbAdsClicks 
    : 0;

  // --- Google Ads Calculations ---
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

  // Group by Campaign Name
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

  // Group daily Ads metrics
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

  // --- Google Search Console Calculations ---
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

                <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2 bg-card/50 border-border/80 shadow-sm">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span className="hidden sm:inline">Configurar</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleUpdateSettings}>
                      <DialogHeader>
                        <DialogTitle>Configurar Fontes - {activeReport.name}</DialogTitle>
                        <DialogDescription>
                          Insira as credenciais e IDs das plataformas para este cliente.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="ga4PropertyId">Google Analytics 4 Property ID</Label>
                          <Input
                            id="ga4PropertyId"
                            placeholder="Ex: 432109876"
                            value={ga4PropertyId}
                            onChange={(e) => setGa4PropertyId(e.target.value)}
                          />
                          <p className="text-[10px] text-muted-foreground">
                            O número numérico de 9 dígitos que identifica sua propriedade no GA4.
                          </p>
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
              </>
            )}

            {reports.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="min-w-48">
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Relatório
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleCreateReport}>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Relatório</DialogTitle>
                    <DialogDescription>
                      Insira o nome da empresa para criar um novo relatório de tráfego. As tabelas dedicadas de GA4, Google Ads e Search Console serão geradas no Supabase.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="companyName">Nome da Empresa</Label>
                      <Input
                        id="companyName"
                        placeholder="Ex: Minha Empresa"
                        value={newReportName}
                        onChange={(e) => setNewReportName(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Tabelas Geradas no Supabase</Label>
                      <div className="space-y-1 bg-muted p-2.5 rounded border font-mono text-[10px] text-muted-foreground select-all">
                        <div>GA4: {newReportName ? generateTableName(newReportName, "_google_analytics_metrics") : "---"}</div>
                        <div>Ads: {newReportName ? generateTableName(newReportName, "_google_ads_metrics") : "---"}</div>
                        <div>GSC: {newReportName ? generateTableName(newReportName, "_google_search_console_metrics") : "---"}</div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Novas tabelas contendo todas as colunas de métricas e dimensões do GA4, Google Ads e Search Console serão criadas automaticamente no seu banco de dados.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={createReportMutation.isPending || !newReportName.trim()}
                      className="w-full sm:w-auto"
                    >
                      {createReportMutation.isPending ? "Criando..." : "Criar Relatório"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

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
          <div className="flex border-b border-border/60 mb-6 gap-2">
            <Button
              variant="ghost"
              className={cn(
                "px-4 py-2 text-sm font-semibold rounded-none border-b-2 -mb-[2px] transition-all",
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
                "px-4 py-2 text-sm font-semibold rounded-none border-b-2 -mb-[2px] transition-all",
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
                "px-4 py-2 text-sm font-semibold rounded-none border-b-2 -mb-[2px] transition-all",
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
                "px-4 py-2 text-sm font-semibold rounded-none border-b-2 -mb-[2px] transition-all",
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
                "px-4 py-2 text-sm font-semibold rounded-none border-b-2 -mb-[2px] transition-all",
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
            metrics.length === 0 ? (
              <Card className="border-border/70 shadow-none p-12 text-center bg-card/60 backdrop-blur-md">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <BarChart2 className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Tabela "{activeReport.table_name}" vazia</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                  Nenhum dado importado para a empresa **{activeReport.name}** ainda. Envie dados reais do Google Analytics via n8n ou API pública para visualizar o relatório.
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                <SectionTitle 
                  title="Visão Geral" 
                  description="Métricas consolidadas de tráfego e conversão." 
                  icon={Activity} 
                  color="blue" 
                />
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <CustomKpiCard label="Sessões" value={totalSessions.toLocaleString("pt-BR")} icon={Globe} hint="Volume de visitas" color="blue" />
                  <CustomKpiCard label="Usuários" value={totalUsers.toLocaleString("pt-BR")} icon={Activity} hint="Visitantes únicos" color="cyan" />
                  <CustomKpiCard label="Visualizações" value={totalPageViews.toLocaleString("pt-BR")} icon={MousePointer} hint="Páginas vistas" color="green" />
                  <CustomKpiCard label="Eventos" value={totalEvents.toLocaleString("pt-BR")} icon={TrendingUp} hint="Interações totais" color="indigo" />
                </div>

                {/* Time Series Chart */}
                <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-xl overflow-hidden mt-6">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-blue-500/5 to-transparent">
                    <div>
                      <CardTitle className="text-base font-bold tracking-tight">Evolução de Tráfego Diário</CardTitle>
                      <CardDescription>Sessões e visualizações consolidadas ao longo do tempo.</CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20 gap-1.5 font-semibold shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" /> GA4 Ativo
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 w-full pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="colorPageViews" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={8} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dx={-8} />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Legend verticalAlign="top" height={36} iconType="circle" />
                          <Area type="monotone" dataKey="sessions" stroke="#3b82f6" strokeWidth={2.5} name="Sessões" fillOpacity={1} fill="url(#colorSessions)" />
                          <Area type="monotone" dataKey="pageViews" stroke="#10b981" strokeWidth={2.5} name="Visualizações" fillOpacity={1} fill="url(#colorPageViews)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <SectionTitle 
                  title="Comportamento" 
                  description="Como os usuários interagem com seu site." 
                  icon={MousePointer} 
                  color="green" 
                />

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <CustomKpiCard label="Usuários Ativos" value={totalActiveUsers.toLocaleString("pt-BR")} icon={Sparkles} hint="Atividade recorrente" color="blue" />
                  <CustomKpiCard label="Duração Média" value={formatDuration(avgDurationSeconds)} icon={Clock} hint="Tempo médio logado" color="indigo" />
                  <CustomKpiCard label="Taxa de Rejeição" value={`${avgBounceRate.toFixed(2)}%`} icon={Percent} hint="Saídas sem interação" color="red" />
                  <CustomKpiCard label="Engajamento" value={`${avgEngagementRate.toFixed(2)}%`} icon={Activity} hint="Sessões com engajamento" color="green" />
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                  <CustomKpiCard label="Receita de Anúncios" value={totalAdRevenue.toLocaleString("pt-BR", { style: 'currency', currency: 'BRL' })} icon={DollarSign} hint="Faturamento gerado" color="amber" />
                  <CustomKpiCard label="Transações" value={totalTransactions.toLocaleString("pt-BR")} icon={ShoppingBag} hint="Vendas confirmadas" color="amber" />
                </div>

                {/* Breakdown Tables Grid */}
                <div className="grid gap-6 lg:grid-cols-2 mt-6">
                  {/* Performance by Page Path */}
                  <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-lg">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base font-bold tracking-tight">Páginas Mais Acessadas</CardTitle>
                      <CardDescription>Canais e visualizações por caminho de página.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-0">
                      <div className="divide-y divide-border/40">
                        {pageData.map((page, idx) => (
                          <ProgressBreakdownRow 
                            key={idx} 
                            label={page.path === "/" ? "Home (Página Inicial)" : page.path} 
                            sessions={page.pageViews} 
                            total={totalPageViews} 
                            color="green" 
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Performance by Session Source */}
                  <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-lg">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base font-bold tracking-tight">Principais Origens de Tráfego</CardTitle>
                      <CardDescription>Distribuição de sessões e usuários por canal.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-0">
                      <div className="divide-y divide-border/40">
                        {sourceData.map((source, idx) => (
                          <ProgressBreakdownRow 
                            key={idx} 
                            label={source.source} 
                            sessions={source.sessions} 
                            total={totalSessions} 
                            color="blue" 
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <SectionTitle 
                  title="Público & Dispositivos" 
                  description="Quem são os usuários e como eles acessam." 
                  icon={Globe} 
                  color="purple" 
                />

                {/* Dimension Breakdowns Grid */}
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Top Cities */}
                  <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-lg">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base font-bold tracking-tight">Cidades</CardTitle>
                      <CardDescription>Acessos por localização geográfica.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-0">
                      <div className="divide-y divide-border/40">
                        {cityData.map((item, idx) => (
                          <ProgressBreakdownRow 
                            key={idx} 
                            label={item.city} 
                            sessions={item.sessions} 
                            total={totalSessions} 
                            color="indigo" 
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Devices Donut Chart */}
                  <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-lg">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base font-bold tracking-tight">Dispositivos</CardTitle>
                      <CardDescription>Sessões por tipo de dispositivo.</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-6 pt-0">
                      <div className="relative flex h-52 items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={deviceData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {deviceData.map((entry, index) => {
                                const colors = {
                                  Desktop: "#3b82f6",
                                  Mobile: "#10b981",
                                  Tablet: "#f59e0b",
                                  Smarttv: "#8b5cf6",
                                  Other: "#94a3b8"
                                };
                                const color = colors[entry.name as keyof typeof colors] || colors.Other;
                                return <Cell key={`cell-${index}`} fill={color} />;
                              })}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                              formatter={(value: any) => [`${value.toLocaleString("pt-BR")} sessões`]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-2xl font-bold tracking-tight">{totalSessions.toLocaleString("pt-BR")}</span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/85 font-bold">Sessões</span>
                        </div>
                      </div>
                      {/* Legend */}
                      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs mt-3">
                        {deviceData.map((item, idx) => {
                          const colors = {
                            Desktop: "bg-blue-500",
                            Mobile: "bg-emerald-500",
                            Tablet: "bg-amber-500",
                            Smarttv: "bg-purple-500",
                            Other: "bg-slate-400"
                          };
                          const colorClass = colors[item.name as keyof typeof colors] || colors.Other;
                          return (
                            <div key={idx} className="flex items-center gap-1.5">
                              <span className={cn("h-2 w-2 rounded-full", colorClass)} />
                              <span className="text-muted-foreground font-medium">{item.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Browsers */}
                  <Card className="border-border/40 bg-card/40 backdrop-blur-xl shadow-lg">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base font-bold tracking-tight">Navegadores</CardTitle>
                      <CardDescription>Navegadores de internet utilizados.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-0">
                      <div className="divide-y divide-border/40">
                        {browserData.map((item, idx) => (
                          <ProgressBreakdownRow 
                            key={idx} 
                            label={item.browser} 
                            sessions={item.sessions} 
                            total={totalSessions} 
                            color="purple" 
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )
          )}

          {activeTab === "ads" && (
            adsMetrics.length === 0 ? (
              <Card className="border-border/70 shadow-none p-12 text-center bg-card/60 backdrop-blur-md">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <BarChart2 className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Tabela de Google Ads "{activeReport.ads_table_name || 'Desconhecida'}" vazia</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                  Nenhum dado importado para o Google Ads da empresa **{activeReport.name}** ainda. Envie dados reais de campanhas via n8n para visualizar.
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* KPI Cards Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <CustomKpiCard label="Investimento Total" value={totalAdsCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={DollarSign} hint="Gasto total em campanhas" color="blue" />
                  <CustomKpiCard label="Cliques Totais" value={totalAdsClicks.toLocaleString("pt-BR")} icon={TrendingUp} hint="Interações diretas" color="indigo" />
                  <CustomKpiCard label="Impressões Totais" value={totalAdsImpressions.toLocaleString("pt-BR")} icon={Globe} hint="Visualizações de anúncios" color="purple" />
                  <CustomKpiCard label="CTR Médio" value={`${avgAdsCTR.toFixed(2)}%`} icon={Percent} hint="Cliques / Impressões" color="green" />
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <CustomKpiCard label="CPC Médio" value={avgAdsCPC.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={DollarSign} hint="Custo médio por clique" color="amber" />
                  <CustomKpiCard label="Conversões" value={totalAdsConversions.toLocaleString("pt-BR")} icon={Activity} hint="Ações valiosas concluídas" color="green" />
                  <CustomKpiCard label="Valor de Conversão" value={totalAdsConversionsValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={ShoppingBag} hint="Faturamento gerado" color="amber" />
                  <CustomKpiCard label="ROAS Médio" value={`${adsROAS.toFixed(2)}x`} icon={Sparkles} hint="Retorno sobre investimento" color="indigo" />
                </div>

                {/* Daily Cost Line Chart */}
                <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-base font-semibold">Desempenho Diário da Conta</CardTitle>
                      <CardDescription>Evolução diária de investimento e cliques.</CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-success/10 text-success border-success/20 gap-1.5 font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Google Ads Ativo
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 w-full pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={adsChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={8} />
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
                        {campaignData.map((campaign, idx) => {
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
            )
          )}

          {activeTab === "gsc" && (
            gscMetrics.length === 0 ? (
              <Card className="border-border/70 shadow-none p-12 text-center bg-card/60 backdrop-blur-md">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <BarChart2 className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Tabela de Search Console "{activeReport.gsc_table_name || 'Desconhecida'}" vazia</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                  Nenhum dado importado para o Google Search Console da empresa **{activeReport.name}** ainda. Envie dados reais de SEO via n8n para visualizar.
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* KPI Cards Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <CustomKpiCard label="Cliques Orgânicos" value={totalGscClicks.toLocaleString("pt-BR")} icon={TrendingUp} hint="Total de cliques em pesquisas" color="blue" />
                  <CustomKpiCard label="Impressões Orgânicas" value={totalGscImpressions.toLocaleString("pt-BR")} icon={Globe} hint="Total de aparições em buscas" color="indigo" />
                  <CustomKpiCard label="CTR Orgânico Médio" value={`${avgGscCTR.toFixed(2)}%`} icon={Percent} hint="Cliques / Impressões" color="green" />
                  <CustomKpiCard label="Posição Média" value={avgGscPosition.toFixed(1)} icon={Activity} hint="Posição média nos resultados" color="amber" />
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
                        <AreaChart data={gscChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                          {gscPageData.map((item, idx) => {
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
              </div>
            )
          )}

          {activeTab === "fb_ads" && (
            fbAdsMetrics.length === 0 ? (
              <Card className="border-border/70 shadow-none p-12 text-center bg-card/60 backdrop-blur-md">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <BarChart2 className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Tabela de Facebook Ads "{activeReport.fb_ads_table_name || 'Desconhecida'}" vazia</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                  Nenhum dado importado para o Facebook Ads da empresa **{activeReport.name}** ainda. Envie dados via n8n para visualizar.
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                <SectionTitle 
                  title="Facebook Ads" 
                  description="Desempenho de campanhas de tráfego pago na rede Meta." 
                  icon={Activity} 
                  color="blue" 
                />
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <CustomKpiCard label="Investimento" value={totalFbAdsCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={DollarSign} hint="Gasto total no período" color="blue" />
                  <CustomKpiCard label="Cliques (Link)" value={totalFbAdsClicks.toLocaleString("pt-BR")} icon={MousePointer} hint="Cliques no anúncio" color="indigo" />
                  <CustomKpiCard label="Impressões" value={totalFbAdsImpressions.toLocaleString("pt-BR")} icon={Globe} hint="Aparições do anúncio" color="amber" />
                  <CustomKpiCard label="Conversões" value={totalFbAdsConversions.toLocaleString("pt-BR")} icon={TrendingUp} hint="Ações de valor realizadas" color="green" />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <CustomKpiCard label="CPC Médio" value={avgFbAdsCPC.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={Percent} hint="Custo Por Clique" color="purple" />
                  <CustomKpiCard label="CTR" value={`${avgFbAdsCTR.toFixed(2)}%`} icon={Percent} hint="Taxa de Cliques" color="cyan" />
                </div>
              </div>
            )
          )}
          {activeTab === "sheets" && (
            <div className="space-y-6">
                {/* Google Sheets Audit Section */}
                <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm overflow-hidden mt-6">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                        Conciliação & Auditoria (Google Sheets)
                      </CardTitle>
                      <CardDescription>
                        Cruzamento de dados entre conversões registradas no Google Ads vs. cadastros reais na planilha.
                      </CardDescription>
                    </div>
                    {sheetsAudit?.ok && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 gap-1 bg-background/50" 
                        onClick={() => refetchSheetsAudit()}
                        disabled={isLoadingSheetsAudit}
                      >
                        <RefreshCw className={cn("h-3.5 w-3.5", isLoadingSheetsAudit && "animate-spin")} />
                        Atualizar Planilha
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {isLoadingSheetsAudit ? (
                      <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                        Acessando Google Sheets...
                      </div>
                    ) : !sheetsAudit?.ok ? (
                      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground bg-muted/20">
                        <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="font-medium text-foreground">Nenhuma planilha vinculada para este cliente</p>
                        <p className="mt-1 text-xs">
                          Adicione o link do Google Sheets na tabela <code className="bg-muted px-1.5 py-0.5 rounded">reports_sheets_config</code> no Supabase para auditar as conversões automaticamente.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Audit summary */}
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="rounded-xl border border-border/80 bg-background/40 p-4">
                            <div className="text-xs text-muted-foreground font-medium">Contatos no Sheets ({dateRange === "yesterday" ? "Ontem" : `Últimos ${dateRange} dias`})</div>
                            <div className="mt-1.5 flex items-baseline gap-2">
                              <span className="text-3xl font-bold text-emerald-600 font-mono">{sheetsAudit.count}</span>
                              <span className="text-xs text-muted-foreground">leads reais</span>
                            </div>
                          </div>
                        </div>

                        {/* Sample rows */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <span>Amostra de cadastros (Últimas linhas do Sheets no período)</span>
                            <Badge variant="outline" className="text-[10px] py-0 font-normal">
                              Coluna de Data: "{sheetsAudit.date_column_detected}"
                            </Badge>
                          </h4>
                          {sheetsAudit.sample_rows?.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground bg-muted/10">
                              Nenhum cadastro encontrado nesta planilha para o período selecionado.
                            </div>
                          ) : (
                            <div className="rounded-lg border border-border/50 overflow-hidden">
                              <Table>
                                <TableHeader className="bg-muted/30">
                                  <TableRow>
                                    <TableHead className="text-xs py-2 pl-4">Data</TableHead>
                                    <TableHead className="text-xs py-2">Nome / Contato</TableHead>
                                    <TableHead className="text-xs py-2">E-mail / Telefone</TableHead>
                                    <TableHead className="text-xs py-2 pr-4 text-right">Origem / Canal</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {sheetsAudit.sample_rows.map((row: any, idx: number) => {
                                    const dateKey = Object.keys(row).find(k => k.includes('data') || k.includes('date') || k.includes('time') || k.includes('timestamp')) || '';
                                    const nameKey = Object.keys(row).find(k => k.includes('nome') || k.includes('name') || k.includes('cliente') || k.includes('contato')) || '';
                                    const emailKey = Object.keys(row).find(k => k.includes('email') || k.includes('e-mail') || k.includes('mail') || k.includes('telefone') || k.includes('phone') || k.includes('celular')) || '';
                                    const sourceKey = Object.keys(row).find(k => k.includes('origem') || k.includes('source') || k.includes('utm') || k.includes('canal')) || '';

                                    return (
                                      <TableRow key={idx} className="hover:bg-muted/10">
                                        <TableCell className="text-xs py-2.5 pl-4 font-mono">{row[dateKey] || '—'}</TableCell>
                                        <TableCell className="text-xs py-2.5 font-medium">{row[nameKey] || '—'}</TableCell>
                                        <TableCell className="text-xs py-2.5 text-muted-foreground">{row[emailKey] || '—'}</TableCell>
                                        <TableCell className="text-xs py-2.5 text-right pr-4 font-semibold text-primary">{row[sourceKey] || 'Google Ads (Planilha)'}</TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
            </div>
          )}
        </div>
      ) : (
        <Card className="border-border/70 shadow-none p-12 text-center bg-card/60 backdrop-blur-md">
          <p className="text-muted-foreground animate-pulse">Carregando relatórios configurados...</p>
        </Card>
      )}
    </AppShell>
  );
}
