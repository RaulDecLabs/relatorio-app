import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { UserPlus, Trash2, ShieldCheck, KeyRound, Building2, Lock } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRoles } from "@/hooks/use-role";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { 
  createUser, deleteUser, listUsers, setUserRole, 
  setUserAssignedReport, adminChangeUserPassword 
} from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/users")({
  component: UsersPage,
});

const schema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2).max(120),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
  role: z.enum(["admin", "agency", "client"]),
  assigned_report_id: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function UsersPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { isAdmin, loading } = useRoles();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  
  // Estado para o modal de trocar senha do usuário
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<{ id: string; name: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const fetchUsers = useServerFn(listUsers);
  const createFn = useServerFn(createUser);
  const setRoleFn = useServerFn(setUserRole);
  const setReportFn = useServerFn(setUserAssignedReport);
  const changePasswordFn = useServerFn(adminChangeUserPassword);
  const deleteFn = useServerFn(deleteUser);

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/reports", replace: true });
  }, [loading, isAdmin, navigate]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-admin"],
    queryFn: () => fetchUsers({}),
    enabled: isAdmin,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["reports-config-list-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reports_config").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", full_name: "", password: "", role: "client", assigned_report_id: "" },
  });

  const selectedRole = form.watch("role");

  const createMut = useMutation({
    mutationFn: (v: FormValues) => createFn({ data: v }),
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      setOpen(false);
      form.reset();
      qc.invalidateQueries({ queryKey: ["users-admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const roleMut = useMutation({
    mutationFn: (v: { user_id: string; role: "admin" | "agency" | "client" }) => setRoleFn({ data: v }),
    onSuccess: () => {
      toast.success("Papel do usuário atualizado!");
      qc.invalidateQueries({ queryKey: ["users-admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reportMut = useMutation({
    mutationFn: (v: { user_id: string; assigned_report_id: string | null }) => setReportFn({ data: v }),
    onSuccess: () => {
      toast.success("Empresa vinculada atualizada!");
      qc.invalidateQueries({ queryKey: ["users-admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const passwordMut = useMutation({
    mutationFn: (v: { user_id: string; new_password: string }) => changePasswordFn({ data: v }),
    onSuccess: () => {
      toast.success("Senha atualizada com sucesso!");
      setPasswordDialogOpen(false);
      setNewPassword("");
      setSelectedUserForPassword(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (user_id: string) => deleteFn({ data: { user_id } }),
    onSuccess: () => {
      toast.success("Usuário removido da plataforma");
      qc.invalidateQueries({ queryKey: ["users-admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) return null;

  return (
    <AppShell title="Gestão de Usuários e Acessos">
      <PageHeader
        title="Gestão de Usuários"
        description="Controle permissões de administradores e restrinja clientes para verem apenas os dados da própria empresa."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90"><UserPlus className="mr-2 h-4 w-4" />Novo usuário</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Cadastrar Novo Usuário</DialogTitle></DialogHeader>
              <form onSubmit={form.handleSubmit((v) => {
                if (v.role === "client" && !v.assigned_report_id) {
                  toast.error("Por favor, selecione qual empresa este usuário cliente poderá visualizar.");
                  return;
                }
                createMut.mutate(v);
              })} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome completo</Label>
                  <Input placeholder="Ex: Ana Silva (Marketing Empresa X)" {...form.register("full_name")} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email do usuário</Label>
                    <Input type="email" placeholder="cliente@empresa.com" {...form.register("email")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Senha inicial</Label>
                    <Input type="text" placeholder="mínimo 6 caracteres" {...form.register("password")} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tipo de Permissão</Label>
                  <Select
                    value={form.watch("role")}
                    onValueChange={(v) => form.setValue("role", v as FormValues["role"])}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador (Acesso total e configurações)</SelectItem>
                      <SelectItem value="client">Cliente (Vê apenas Relatórios e Parecer da sua empresa)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedRole === "client" && (
                  <div className="space-y-1.5 p-3.5 bg-primary/5 border border-primary/20 rounded-lg">
                    <Label className="text-xs font-semibold text-primary flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" /> Empresa / Relatório Designado
                    </Label>
                    <p className="text-[11px] text-muted-foreground mb-2">
                      O cliente terá acesso estritamente restrito aos dados da empresa escolhida.
                    </p>
                    <Select
                      value={form.watch("assigned_report_id")}
                      onValueChange={(v) => form.setValue("assigned_report_id", v)}
                    >
                      <SelectTrigger className="w-full bg-background"><SelectValue placeholder="Selecione a empresa vinculada..." /></SelectTrigger>
                      <SelectContent>
                        {reports.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <DialogFooter className="pt-2">
                  <Button type="submit" disabled={createMut.isPending} className="w-full">
                    {createMut.isPending ? "Criando usuário..." : "Cadastrar Usuário"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="border-border/70 shadow-none mt-4">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-sm text-center text-muted-foreground">Carregando lista de usuários da plataforma...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Nível de Acesso</TableHead>
                  <TableHead>Empresa Vinculada (Cliente)</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const role = (u.roles[0] as "admin" | "agency" | "client") ?? "client";
                  const assignedReportId = u.assigned_report_id || "";
                  const assignedReportName = reports.find(r => r.id === assignedReportId)?.name;
                  const isSelf = u.id === currentUser?.id;

                  return (
                    <TableRow key={u.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{u.full_name || "Sem Nome"}</span>
                          {isSelf && <Badge variant="outline" className="text-[10px] py-0 h-5 border-primary text-primary">Você</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                      <TableCell>
                        <Select
                          value={role === "agency" ? "admin" : role}
                          disabled={isSelf}
                          onValueChange={(v) => roleMut.mutate({ user_id: u.id, role: v as FormValues["role"] })}
                        >
                          <SelectTrigger className="h-8 w-[160px]">
                            <div className="flex items-center gap-1.5">
                              {role === "admin" ? <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" /> : <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="client">Cliente (Restrito)</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {role === "client" ? (
                          <Select
                            value={assignedReportId || "none"}
                            onValueChange={(v) => reportMut.mutate({ user_id: u.id, assigned_report_id: v === "none" ? null : v })}
                          >
                            <SelectTrigger className="h-8 w-[210px] text-xs">
                              <SelectValue placeholder="Vincular empresa..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" className="text-muted-foreground">⚠️ Sem empresa vinculada</SelectItem>
                              {reports.map((r) => (
                                <SelectItem key={r.id} value={r.id}>🏢 {r.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/15">
                            ✨ Acesso Total à Agência
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {role !== "admin" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1.5 px-2.5"
                              onClick={() => {
                                setSelectedUserForPassword({ id: u.id, name: u.full_name || u.email, email: u.email });
                                setNewPassword("");
                                setPasswordDialogOpen(true);
                              }}
                              title="Alterar senha deste usuário"
                            >
                              <KeyRound className="h-3.5 w-3.5 text-primary" />
                              Mudar Senha
                            </Button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic px-2">Protegido (Admin)</span>
                          )}

                          {!isSelf && (
                            <Button
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                if (confirm(`Deseja realmente remover o acesso de ${u.email}?`)) {
                                  deleteMut.mutate(u.id);
                                }
                              }}
                              title="Excluir usuário"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal para Alterar Senha de Usuário */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" /> Alterar Senha de Acesso
            </DialogTitle>
          </DialogHeader>
          {selectedUserForPassword && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                <p><strong>Usuário:</strong> {selectedUserForPassword.name}</p>
                <p className="text-muted-foreground text-xs"><strong>Email:</strong> {selectedUserForPassword.email}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nova Senha</Label>
                <Input
                  type="text"
                  placeholder="Digite a nova senha (mínimo 6 caracteres)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <DialogFooter className="pt-3">
                <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Cancelar</Button>
                <Button
                  disabled={newPassword.length < 6 || passwordMut.isPending}
                  onClick={() => {
                    if (selectedUserForPassword) {
                      passwordMut.mutate({ user_id: selectedUserForPassword.id, new_password: newPassword });
                    }
                  }}
                >
                  {passwordMut.isPending ? "Salvando..." : "Salvar Nova Senha"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
