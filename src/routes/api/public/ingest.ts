import { createFileRoute } from '@tanstack/react-router'
import { createHmac, timingSafeEqual } from 'crypto'
import { z } from 'zod'

const GARowSchema = z.object({
  metric_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  page_path: z.string().default(''),
  session_manual_source_medium: z.string().default(''),
  session_source: z.string().default(''),
  session_medium: z.string().default(''),
  city: z.string().default(''),
  device_category: z.string().default(''),
  browser: z.string().default(''),
  sessions: z.number().int().nonnegative().default(0),
  total_users: z.number().int().nonnegative().default(0),
  bounce_rate: z.number().default(0.0),
  active_users: z.number().int().nonnegative().default(0),
  page_views: z.number().int().nonnegative().default(0),
  engagement_rate: z.number().default(0.0),
  average_session_duration: z.number().default(0.0),
  engaged_sessions: z.number().int().nonnegative().default(0),
  events: z.number().int().nonnegative().default(0),
  total_ad_revenue: z.number().default(0.0),
  transactions: z.number().int().nonnegative().default(0),
  session_duration: z.number().default(0.0),
})

const PayloadSchema = z.object({
  client_id: z.string().uuid(),
  table_name: z.string().min(1).optional().default('Dec_google_analytics_metrics'),
  rows: z.array(GARowSchema).min(1).max(5000),
})

function verifySignature(secret: string, signature: string | null, body: string): boolean {
  if (!signature) return false
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  const sig = Buffer.from(signature.replace(/^sha256=/, ''))
  const exp = Buffer.from(expected)
  if (sig.length !== exp.length) return false
  try {
    return timingSafeEqual(sig, exp)
  } catch {
    return false
  }
}

export const Route = createFileRoute('/api/public/ingest')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.INGEST_HMAC_SECRET
        if (!secret) {
          return new Response('Server not configured', { status: 500 })
        }

        const body = await request.text()
        const signature = request.headers.get('x-ingest-signature')
        if (!verifySignature(secret, signature, body)) {
          return new Response('Invalid signature', { status: 401 })
        }

        let json: unknown
        try {
          json = JSON.parse(body)
        } catch {
          return new Response('Invalid JSON', { status: 400 })
        }

        const parsed = PayloadSchema.safeParse(json)
        if (!parsed.success) {
          return Response.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 400 })
        }
        const { client_id, table_name, rows } = parsed.data

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

        // upsert rows directly to dynamic table_name
        const upsertRows = rows.map((r) => ({
          client_id,
          metric_date: r.metric_date,
          page_path: r.page_path,
          session_manual_source_medium: r.session_manual_source_medium,
          session_source: r.session_source,
          session_medium: r.session_medium,
          city: r.city,
          device_category: r.device_category,
          browser: r.browser,
          sessions: r.sessions,
          total_users: r.total_users,
          bounce_rate: r.bounce_rate,
          active_users: r.active_users,
          page_views: r.page_views,
          engagement_rate: r.engagement_rate,
          average_session_duration: r.average_session_duration,
          engaged_sessions: r.engaged_sessions,
          events: r.events,
          total_ad_revenue: r.total_ad_revenue,
          transactions: r.transactions,
          session_duration: r.session_duration,
        }))

        const { error: upsertErr } = await supabaseAdmin
          .from(table_name as any)
          .upsert(upsertRows, {
            onConflict: 'client_id,metric_date,page_path,session_manual_source_medium,session_source,session_medium,city,device_category,browser',
          })

        if (upsertErr) {
          return Response.json({ error: 'Upsert failed', detail: upsertErr.message }, { status: 500 })
        }

        return Response.json({
          ok: true,
          rows_upserted: rows.length,
        })
      },
    },
  },
})
