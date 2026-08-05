import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type AppRole = "admin" | "agency" | "client";

export function useRoles() {
  const { user, loading: authLoading } = useAuth();
  const query = useQuery({
    queryKey: ["roles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const isOwner = user?.email?.toLowerCase() === "raul.declabs@gmail.com";
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      const dbRoles = (data ?? []).map((r) => r.role as AppRole);
      if (isOwner && !dbRoles.includes("admin")) {
        // Tentativa preemptiva de registrar admin no banco
        supabase.from("user_roles").upsert({ user_id: user!.id, role: "admin" }, { onConflict: "user_id,role" }).then();
        return ["admin" as AppRole];
      }
      return dbRoles;
    },
  });
  const dbRoles = query.data ?? [];
  const isOwner = user?.email?.toLowerCase() === "raul.declabs@gmail.com";
  const effectiveRoles: AppRole[] = isOwner && !dbRoles.includes("admin") ? [...dbRoles, "admin"] : dbRoles;
  const isAdmin = effectiveRoles.includes("admin");
  const isAgency = effectiveRoles.includes("agency") && !isAdmin;
  const isClient = !isAdmin && !isAgency;

  return {
    roles: effectiveRoles,
    isAdmin,
    isAgency,
    isStaff: isAdmin || isAgency,
    isClient,
    loading: authLoading || (!!user && query.isLoading && !isOwner),
  };
}
