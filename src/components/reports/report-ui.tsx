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
  /** Workspace do CRM DecLabs que alimenta a aba de CRM (ex. 'alphaz'). Vazio = usa o Nectar. */
  crm_workspace_suffix?: string | null;
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
  // A cor por seção foi substituída pelo bloco preto único do sistema; a prop
  // continua aceita para não exigir mudança nas telas que a passam.
  void color;
  return (
    <div className="flex items-center gap-3 mb-5 mt-12 border-b border-foreground pb-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary text-primary-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-[13px] text-muted-foreground">{description}</p>
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
  // Tiles neutros como no restante do sistema: só o marcador do hint carrega
  // a cor (lima/amarelo/vermelho) para manter a leitura de status.
  const dotMap = {
    blue: "bg-foreground",
    green: "bg-highlight",
    amber: "bg-amber-300",
    red: "bg-destructive",
    indigo: "bg-foreground",
    purple: "bg-foreground/60",
    cyan: "bg-foreground/40",
    pink: "bg-foreground/60",
  };
  const dot = dotMap[color] || dotMap.blue;

  return (
    <Card className="transition-colors hover:border-foreground/20">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="label-caps">{label}</span>
          <Icon className="h-5 w-5 text-foreground" strokeWidth={1.75} />
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">{value}</span>
        </div>
        {hint && (
          <div className="mt-3 flex items-center gap-2 label-caps">
            <div className={cn("h-1.5 w-1.5 rounded-full", dot)} />
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
    blue: "bg-foreground",
    green: "bg-emerald-400",
    amber: "bg-amber-400",
    indigo: "bg-foreground/70",
    purple: "bg-foreground/50"
  };

  return (
    <div className="py-2.5">
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="font-medium text-foreground truncate max-w-[65%]" title={label}>{label}</span>
        <span className="font-semibold text-foreground/80 text-xs">
          {sessions.toLocaleString("pt-BR")} <span className="text-muted-foreground/60 font-normal ml-0.5">({pct.toFixed(1)}%)</span>
        </span>
      </div>
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
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
      <div className="bg-popover border border-foreground/80 p-3 rounded-sm text-xs space-y-1.5 min-w-36">
        <p className="label-caps text-foreground mb-1 border-b pb-1 border-foreground/15">{label}</p>
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
