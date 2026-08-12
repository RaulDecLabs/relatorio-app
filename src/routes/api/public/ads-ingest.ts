import { createFileRoute } from '@tanstack/react-router'
import { createHmac, timingSafeEqual } from 'crypto'
import { z } from 'zod'

const AdsRowSchema = z.object({
  metric_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  campaign_id: z.string().nullable().default(null),
  campaign_name: z.string().min(1),
  impressions: z.number().int().nonnegative().default(0),
  clicks: z.number().int().nonnegative().default(0),
  cost: z.number().nonnegative().default(0.0),
  conversions: z.number().nonnegative().default(0.0),
  conversions_value: z.number().nonnegative().default(0.0),
})

const PayloadSchema = z.object({
  client_id: z.string().uuid(),
  table_name: z.string().min(1),
  rows: z.array(AdsRowSchema).min(1).max(5000),
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

export const Route = createFileRoute('/api/public/ads-ingest')({
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

        const { isTableOwnedByClient } = await import('@/lib/validate-table-name')
        if (!(await isTableOwnedByClient(supabaseAdmin, client_id, table_name, 'ads_table_name'))) {
          return Response.json({ error: 'table_name does not belong to client_id' }, { status: 403 })
        }

        const upsertRows = rows.map((r) => ({
          client_id,
          metric_date: r.metric_date,
          campaign_id: r.campaign_id,
          campaign_name: r.campaign_name,
          impressions: r.impressions,
          clicks: r.clicks,
          cost: r.cost,
          conversions: r.conversions,
          conversions_value: r.conversions_value,
        }))

        // Upsert dynamic Google Ads table
        const { error: upsertErr } = await supabaseAdmin
          .from(table_name as any)
          .upsert(upsertRows, {
            onConflict: 'client_id,metric_date,campaign_id,campaign_name',
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
