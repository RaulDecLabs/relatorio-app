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
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });
  const roles = query.data ?? [];
  return {
    roles,
    isAdmin: roles.includes("admin"),
    isAgency: roles.includes("agency"),
    isStaff: roles.includes("admin") || roles.includes("agency"),
    isClient: roles.includes("client"),
    loading: authLoading || (!!user && query.isLoading),
  };
}
