import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Confirma que table_name enviado no payload e realmente a tabela dinamica
 * cadastrada para esse client_id (reports_config.id) na coluna indicada.
 * Sem isso, qualquer chamador com o segredo/HMAC valido poderia escrever em
 * qualquer tabela do banco so nomeando ela no payload (o client de servico
 * ignora RLS).
 */
export async function isTableOwnedByClient(
  supabaseAdmin: SupabaseClient,
  clientId: string,
  tableName: string,
  column: "table_name" | "ads_table_name" | "gsc_table_name" | "rd_table_name" | "fb_ads_table_name",
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("reports_config")
    .select(column)
    .eq("id", clientId)
    .single();

  if (error || !data) return false;
  return (data as Record<string, string | null>)[column] === tableName;
}
