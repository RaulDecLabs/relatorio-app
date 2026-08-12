import { createHmac, timingSafeEqual } from "crypto";
import { getIngestSecret } from "./verify-import-secret";

/**
 * Assina o report_id usado como "state" no fluxo OAuth do RD Station Marketing.
 * Sem isso, qualquer pessoa que soubesse/adivinhasse um report_id podia chamar
 * o callback direto com esse state e sequestrar a conexao RD daquele cliente.
 */
export function signState(reportId: string): string {
  const secret = getIngestSecret();
  const sig = createHmac("sha256", secret).update(reportId).digest("hex").slice(0, 16);
  return `${reportId}.${sig}`;
}

export function verifyState(state: string): string | null {
  const secret = getIngestSecret();
  if (!secret) return null;

  const idx = state.lastIndexOf(".");
  if (idx === -1) return null;
  const reportId = state.slice(0, idx);
  const providedSig = state.slice(idx + 1);
  const expectedSig = createHmac("sha256", secret).update(reportId).digest("hex").slice(0, 16);

  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return reportId;
}
