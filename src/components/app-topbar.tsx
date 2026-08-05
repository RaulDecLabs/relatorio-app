import { useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LogOut, KeyRound, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AppTopbar({ title }: { title?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isAgency } = useRoles();
  const roleLabel = isAdmin ? "Admin" : isAgency ? "Agência" : "Cliente";

  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("A confirmação da senha não coincide com a nova senha.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Sua senha foi alterada com sucesso!");
      setOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error("Erro ao alterar senha: " + (err.message || "Tente novamente mais tarde"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger />
      {title && <h1 className="text-sm font-semibold text-foreground">{title}</h1>}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="hidden text-right text-xs sm:block">
          <div className="font-medium">{user?.email}</div>
          <div className="text-muted-foreground">{roleLabel}</div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" title="Alterar Minha Senha" aria-label="Alterar Minha Senha">
              <KeyRound className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleUpdatePassword}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  Alterar Minha Senha
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-pwd" className="text-xs font-medium">Nova Senha</Label>
                  <Input
                    id="new-pwd"
                    type="password"
                    placeholder="Mínimo de 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="conf-pwd" className="text-xs font-medium">Confirmar Nova Senha</Label>
                  <Input
                    id="conf-pwd"
                    type="password"
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading || !newPassword}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Atualizar Senha"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sair do Sistema" aria-label="Sair">
          <LogOut className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
        </Button>
      </div>
    </header>
  );
}
