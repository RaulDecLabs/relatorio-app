import { createClient } from "@supabase/supabase-js";

function cleanUrl(val: string | undefined): string | undefined {
  if (!val) return undefined;
  const cleaned = val.trim().replace(/^['"\s`]+|['"\s`]+$/g, "");
  try {
    const url = new URL(cleaned);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

function cleanKey(val: string | undefined): string | undefined {
  if (!val) return undefined;
  const cleaned = val.trim().replace(/^['"\s`]+|['"\s`]+$/g, "");
  return cleaned.length > 10 ? cleaned : undefined;
}

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

  const defaultUrl = "https://btdgetidtawjtqrvzybh.supabase.co";
  const defaultKey = "sb_publishable_ajCs5VZ3suNt9i1DJBtW5w_UNqtw4xm";
  const SUPABASE_URL = cleanUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) || defaultUrl;
  const SUPABASE_PUBLISHABLE_KEY = cleanKey(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY) || defaultKey;
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
