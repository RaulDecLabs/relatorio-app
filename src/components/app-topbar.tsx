import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-role";

export function AppTopbar({ title }: { title?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isAgency } = useRoles();
  const roleLabel = isAdmin ? "Admin" : isAgency ? "Agência" : "Cliente";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger />
      {title && <h1 className="text-sm font-semibold text-foreground">{title}</h1>}
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right text-xs sm:block">
          <div className="font-medium">{user?.email}</div>
          <div className="text-muted-foreground">{roleLabel}</div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sair">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
