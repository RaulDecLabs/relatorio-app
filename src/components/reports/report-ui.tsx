import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ReportConfig {
  id: string;
  name: string;
  table_name: string;
  ads_table_name?: string | null;
  fb_ads_table_name?: string | null;
  gsc_table_name?: string | null;
  rd_table_name?: string | null;
  ga4_property_id?: string | null;
  google_ads_id?: string | null;
  meta_ads_id?: string | null;
  gsc_url?: string | null;
  rd_public_token?: string | null;
  rd_private_token?: string | null;
  rd_client_id?: string | null;
  rd_client_secret?: string | null;
  rd_access_token?: string | null;
  rd_refresh_token?: string | null;
  nectar_api_token?: string | null;
  created_at: string;
}

export function SectionTitle({ 
  title, 
  description, 
  icon: Icon, 
  color = "blue" 
}: { 
  title: string; 
  description: string; 
  icon: any; 
  color?: "blue" | "green" | "amber" | "indigo" | "purple" | "orange" | "teal" | "cyan" | "rose"
}) {
  const colorMap = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    green: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    indigo: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    purple: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    orange: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    teal: "text-teal-500 bg-teal-500/10 border-teal-500/20",
    cyan: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
    rose: "text-rose-500 bg-rose-500/10 border-rose-500/20",
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

export function CustomKpiCard({ 
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

export function ProgressBreakdownRow({ 
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

export const CustomChartTooltip = ({ active, payload, label }: any) => {
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
