import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Building2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/use-role";

export const Route = createFileRoute("/_authenticated/clients/")({
  component: ClientsPage,
});

const schema = z.object({
  company_name: z.string().min(2, "Mínimo 2 caracteres").max(120),
  website: z.string().url().or(z.literal("")).optional(),
  segment: z.string().max(60).optional(),
  contact_name: z.string().max(120).optional(),
  contact_email: z.string().email().or(z.literal("")).optional(),
  contact_phone: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
});
type FormValues = z.infer<typeof schema>;

function ClientsPage() {
  const qc = useQueryClient();
  const { isStaff } = useRoles();
  const [open, setOpen] = useState(false);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { company_name: "" } });

  const createMut = useMutation({
    mutationFn: async (v: FormValues) => {
      const { error } = await supabase.from("clients").insert({
        company_name: v.company_name,
        website: v.website || null,
        segment: v.segment || null,
        contact_name: v.contact_name || null,
        contact_email: v.contact_email || null,
        contact_phone: v.contact_phone || null,
        notes: v.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente criado");
      setOpen(false);
      form.reset();
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["clients-count"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Clientes">
      <PageHeader
        title="Clientes"
        description="Gerencie todos os clientes da agência."
        actions={
          isStaff && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" />Novo cliente</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo cliente</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit((v) => createMut.mutate(v))} className="space-y-3">
                  <Field label="Empresa *" error={form.formState.errors.company_name?.message}>
                    <Input {...form.register("company_name")} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Website"><Input placeholder="https://" {...form.register("website")} /></Field>
                    <Field label="Segmento"><Input {...form.register("segment")} /></Field>
                  </div>
                  <Field label="Responsável"><Input {...form.register("contact_name")} /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Email"><Input type="email" {...form.register("contact_email")} /></Field>
                    <Field label="Telefone"><Input {...form.register("contact_phone")} /></Field>
                  </div>
                  <Field label="Observações"><Textarea rows={3} {...form.register("notes")} /></Field>
                  <DialogFooter>
                    <Button type="submit" disabled={createMut.isPending}>
                      {createMut.isPending ? "Salvando..." : "Criar cliente"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : clients.length === 0 ? (
        <Card className="border-dashed border-border/70 shadow-none">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-medium">Nenhum cliente ainda</h3>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Cadastre seu primeiro cliente para começar a consolidar dados de marketing.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <Link key={c.id} to="/clients/$id" params={{ id: c.id }}>
              <Card className="border-border/70 shadow-none transition hover:border-primary/40 hover:shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="grid h-10 w-10 place-items-center rounded-md bg-accent text-accent-foreground">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="capitalize">{c.status}</Badge>
                  </div>
                  <div className="mt-3 font-semibold">{c.company_name}</div>
                  <div className="text-xs text-muted-foreground">{c.segment || "Sem segmento"}</div>
                  <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                    <span>{c.plan}</span>
                    <span>{c.contact_name || "—"}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
