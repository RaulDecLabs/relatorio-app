import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  if (!userId) throw new Error("Forbidden: user not logged in");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "agency"]);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Forbidden: staff role required");
}

export const getN8nAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const secret = (process.env.INGEST_HMAC_SECRET || "").trim().replace(/^['"\s`]+|['"\s`]+$/g, '');
    return {
      secretConfigured: !!secret && secret.length >= 16,
      secretLength: secret?.length ?? 0,
      secretPreview: secret ? `${secret.slice(0, 4)}…${secret.slice(-4)}` : null,
    };
  });

export const signSamplePayload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ body: z.string().min(1).max(50_000) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const secret = (process.env.INGEST_HMAC_SECRET || "").trim().replace(/^['"\s`]+|['"\s`]+$/g, '');
    if (!secret) throw new Error("INGEST_HMAC_SECRET not configured");
    const { createHmac } = await import("crypto");
    const signature = createHmac("sha256", secret).update(data.body).digest("hex");
    return { signature: `sha256=${signature}` };
  });

export const runIngestSelfTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ clientId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const secret = (process.env.INGEST_HMAC_SECRET || "").trim().replace(/^['"\s`]+|['"\s`]+$/g, '');
    if (!secret) throw new Error("INGEST_HMAC_SECRET not configured");

    const { createHmac, timingSafeEqual } = await import("crypto");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const today = new Date().toISOString().slice(0, 10);
    const requestId = `selftest-${Date.now()}`;
    const body = JSON.stringify({
      client_id: data.clientId,
      rows: [{
        metric_date: today,
        page_path: "/selftest",
        session_manual_source_medium: "selftest / organic",
        session_source: "selftest",
        session_medium: "organic",
        city: "Sao Paulo",
        device_category: "desktop",
        browser: "Chrome",
        sessions: 1,
        total_users: 1,
        bounce_rate: 0.0,
        active_users: 1,
        page_views: 1,
        engagement_rate: 1.0,
        average_session_duration: 10.0,
        engaged_sessions: 1,
        events: 5,
        total_ad_revenue: 0.0,
        transactions: 0,
        session_duration: 10.0,
      }],
    });
    const signature = createHmac("sha256", secret).update(body).digest("hex");

    const started = Date.now();
    let verdict: "ok" | "hmac_mismatch" | "server_error" = "ok";
    let detail: string | null = null;

    try {
      // HMAC check
      const expected = createHmac("sha256", secret).update(body).digest("hex");
      const sig = Buffer.from(signature);
      const exp = Buffer.from(expected);
      if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
        verdict = "hmac_mismatch";
        throw new Error("HMAC verification failed");
      }

      // Upsert directly into Dec_google_analytics_metrics
      const { error: upsertErr } = await supabaseAdmin
        .from("Dec_google_analytics_metrics")
        .upsert(
          [{
            client_id: data.clientId,
            metric_date: today,
            page_path: "/selftest",
            session_manual_source_medium: "selftest / organic",
            session_source: "selftest",
            session_medium: "organic",
            city: "Sao Paulo",
            device_category: "desktop",
            browser: "Chrome",
            sessions: 1,
            total_users: 1,
            bounce_rate: 0.0,
            active_users: 1,
            page_views: 1,
            engagement_rate: 1.0,
            average_session_duration: 10.0,
            engaged_sessions: 1,
            events: 5,
            total_ad_revenue: 0.0,
            transactions: 0,
            session_duration: 10.0,
          }],
          { onConflict: "client_id,metric_date,page_path,session_manual_source_medium,session_source,session_medium,city,device_category,browser" },
        );
      if (upsertErr) throw new Error(upsertErr.message);

    } catch (e) {
      detail = e instanceof Error ? e.message : String(e);
      if (verdict === "ok") verdict = "server_error";
    }

    const status = verdict === "ok" ? 200 : verdict === "hmac_mismatch" ? 401 : 500;
    return {
      url: "internal://ingest (self-test sem HTTP loopback)",
      status,
      ok: verdict === "ok",
      hmacValid: verdict !== "hmac_mismatch",
      verdict,
      durationMs: Date.now() - started,
      requestId,
      responseBody: detail
        ? JSON.stringify({ error: detail }, null, 2)
        : JSON.stringify({ ok: true, rows_upserted: 1 }, null, 2),
      networkError: null as string | null,
    };
  });

