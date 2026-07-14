import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Clock, KanbanSquare, ListChecks } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/use-role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/roadmap")({
  component: RoadmapPage,
});

type Item = {
  id: string;
  phase: string;
  phase_order: number;
  title: string;
  description: string | null;
  status: "todo" | "doing" | "done";
  item_order: number;
  completed_at: string | null;
};

function RoadmapPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAdmin, loading } = useRoles();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [loading, isAdmin, navigate]);

  const { data: items = [] } = useQuery({
    queryKey: ["roadmap"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmap_items")
        .select("*")
        .order("phase_order")
        .order("item_order");
      if (error) throw error;
      return data as Item[];
    },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Item["status"] }) => {
      const { error } = await supabase.from("roadmap_items").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roadmap"] }),
  });

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((i) => i.status === "done").length;
    const doing = items.filter((i) => i.status === "doing").length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, doing, pct };
  }, [items]);

  const phases = useMemo(() => {
    const map = new Map<string, Item[]>();
    items.forEach((i) => {
      if (!map.has(i.phase)) map.set(i.phase, []);
      map.get(i.phase)!.push(i);
    });
    return Array.from(map.entries()).map(([phase, list]) => {
      const done = list.filter((i) => i.status === "done").length;
      return { phase, list, done, total: list.length, pct: list.length ? Math.round((done / list.length) * 100) : 0 };
    });
  }, [items]);

  if (loading) return <AppShell title="Roadmap"><div className="p-8 text-sm text-muted-foreground">Carregando…</div></AppShell>;
  if (!isAdmin) return <AppShell title="Roadmap"><div className="p-8 text-sm text-muted-foreground">Acesso restrito.</div></AppShell>;

  return (
    <AppShell title="Roadmap">
      <PageHeader
        title="Roadmap InsightOS"
        description="Painel interno: progresso, fases e checklist do projeto."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="border-border/70 shadow-none">
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">Progresso geral</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-semibold">{stats.pct}%</span>
              <span className="text-xs text-muted-foreground">{stats.done}/{stats.total}</span>
            </div>
            <Progress value={stats.pct} className="mt-3" />
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-none">
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">Em andamento</div>
            <div className="mt-1 text-2xl font-semibold">{stats.doing}</div>
            <div className="mt-1 text-xs text-muted-foreground">tarefas ativas agora</div>
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-none">
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">Concluídas</div>
            <div className="mt-1 text-2xl font-semibold">{stats.done}</div>
            <div className="mt-1 text-xs text-muted-foreground">de {stats.total} no total</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="checklist">
        <TabsList>
          <TabsTrigger value="checklist"><ListChecks className="mr-2 h-4 w-4" />Checklist</TabsTrigger>
          <TabsTrigger value="kanban"><KanbanSquare className="mr-2 h-4 w-4" />Kanban</TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="mt-4 space-y-5">
          {phases.map((p) => (
            <Card key={p.phase} className="border-border/70 shadow-none">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{p.phase}</div>
                    <div className="text-xs text-muted-foreground">{p.done}/{p.total} concluído</div>
                  </div>
                  <div className="w-40"><Progress value={p.pct} /></div>
                </div>
                <ul className="space-y-2">
                  {p.list.map((i) => (
                    <li key={i.id} className="flex items-start gap-3 rounded-md border border-border/60 p-3">
                      <Checkbox
                        checked={i.status === "done"}
                        onCheckedChange={(c) =>
                          updateMut.mutate({ id: i.id, status: c ? "done" : "todo" })
                        }
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className={cn("text-sm font-medium", i.status === "done" && "text-muted-foreground line-through")}>
                          {i.title}
                        </div>
                        {i.description && (
                          <div className="text-xs text-muted-foreground">{i.description}</div>
                        )}
                      </div>
                      <StatusBadge
                        status={i.status}
                        onToggleDoing={() =>
                          updateMut.mutate({
                            id: i.id,
                            status: i.status === "doing" ? "todo" : "doing",
                          })
                        }
                      />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            {(["todo", "doing", "done"] as const).map((col) => (
              <Card key={col} className="border-border/70 bg-muted/30 shadow-none">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold capitalize">
                      {col === "todo" ? "A fazer" : col === "doing" ? "Em andamento" : "Concluído"}
                    </div>
                    <Badge variant="secondary">{items.filter((i) => i.status === col).length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {items.filter((i) => i.status === col).map((i) => (
                      <Card key={i.id} className="border-border/60 shadow-none">
                        <CardContent className="p-3">
                          <div className="text-[11px] text-muted-foreground">{i.phase}</div>
                          <div className="mt-0.5 text-sm font-medium">{i.title}</div>
                          <div className="mt-2 flex gap-1">
                            {(["todo", "doing", "done"] as const).filter((s) => s !== i.status).map((s) => (
                              <Button
                                key={s} variant="outline" size="sm" className="h-7 text-[11px]"
                                onClick={() => updateMut.mutate({ id: i.id, status: s })}
                              >
                                → {s === "todo" ? "a fazer" : s === "doing" ? "em andamento" : "concluído"}
                              </Button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function StatusBadge({
  status, onToggleDoing,
}: { status: "todo" | "doing" | "done"; onToggleDoing: () => void }) {
  if (status === "done") {
    return (
      <Badge variant="secondary" className="gap-1 bg-emerald-50 text-emerald-700">
        <CheckCircle2 className="h-3 w-3" />Concluído
      </Badge>
    );
  }
  if (status === "doing") {
    return (
      <Badge onClick={onToggleDoing} className="cursor-pointer gap-1 bg-amber-100 text-amber-800 hover:bg-amber-200">
        <Clock className="h-3 w-3" />Em andamento
      </Badge>
    );
  }
  return (
    <Badge onClick={onToggleDoing} variant="outline" className="cursor-pointer gap-1">
      <Circle className="h-3 w-3" />A fazer
    </Badge>
  );
}
