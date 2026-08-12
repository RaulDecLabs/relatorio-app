import { createClient } from "@supabase/supabase-js";

/**
 * Valida o Bearer token da sessao Supabase enviado pelo browser e confere se
 * o usuario e staff (admin/agency) ou se o report_id pedido e o mesmo do seu
 * assigned_report_id. Usado em rotas de API chamadas via fetch() direto do
 * front (nao sao createServerFn, entao o middleware attachSupabaseAuth nao
 * se aplica aqui).
 */
export async function requireReportAccess(request: Request, reportId: string): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice("Bearer ".length);
  if (!token) return false;

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return false;

  const assignedReportId = (data.user.user_metadata as Record<string, unknown> | undefined)?.assigned_report_id;
  if (assignedReportId === reportId) return true;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .in("role", ["admin", "agency"]);

  return !!roles && roles.length > 0;
}
