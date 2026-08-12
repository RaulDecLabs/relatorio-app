import { timingSafeEqual } from "crypto";

function clean(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

/**
 * Le o INGEST_HMAC_SECRET do ambiente ja sem aspas/espacos nas bordas.
 * Alguns lugares (Portainer, .env local) guardam o valor com aspas literais
 * na string; usar isso em vez de process.env.INGEST_HMAC_SECRET direto evita
 * quebrar a comparacao/assinatura por causa disso.
 */
export function getIngestSecret(): string {
  return clean(process.env.INGEST_HMAC_SECRET || "");
}

/**
 * Compara o segredo enviado na requisição com o INGEST_HMAC_SECRET configurado.
 * Sem fallback hardcoded: se a env var não estiver setada, nenhuma requisição passa.
 */
export function verifyImportSecret(request: Request): boolean {
  const configured = clean(process.env.INGEST_HMAC_SECRET || "");
  if (!configured) return false;

  const url = new URL(request.url);
  const provided = clean(url.searchParams.get("secret") || request.headers.get("x-import-secret") || "");
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(configured);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
