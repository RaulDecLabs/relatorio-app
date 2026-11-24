import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  change?: number;
  icon?: LucideIcon;
  hint?: string;
}

export function KpiCard({ label, value, change, icon: Icon, hint }: KpiCardProps) {
  const positive = (change ?? 0) >= 0;
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="label-caps">{label}</div>
          {Icon && <Icon className="h-5 w-5 text-foreground" strokeWidth={1.75} />}
        </div>
        <div className="mt-3 text-xl font-bold text-foreground">{value}</div>
        <div className="mt-3 flex items-center gap-2">
          {typeof change === "number" && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-[10px] font-bold",
                positive ? "bg-highlight text-highlight-foreground" : "bg-destructive/10 text-destructive",
              )}
            >
              {positive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
          {hint && <span className="label-caps">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
