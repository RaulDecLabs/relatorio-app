import { createFileRoute } from '@tanstack/react-router'
import { createHmac, timingSafeEqual } from 'crypto'
import { z } from 'zod'
import { getIngestSecret } from '@/lib/verify-import-secret'

const GscRowSchema = z.object({
  metric_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  query: z.string().catch(''),
  page: z.string().catch(''),
  device: z.string().catch('desktop'),
  country: z.string().catch('BR'),
  clicks: z.number().int().nonnegative().default(0),
  impressions: z.number().int().nonnegative().default(0),
  position: z.number().nonnegative().default(0.0),
})

const PayloadSchema = z.object({
  client_id: z.string().uuid(),
  table_name: z.string().min(1),
  rows: z.array(GscRowSchema).min(1).max(5000),
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

export const Route = createFileRoute('/api/public/gsc-ingest')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = getIngestSecret()
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
        if (!(await isTableOwnedByClient(supabaseAdmin, client_id, table_name, 'gsc_table_name'))) {
          return Response.json({ error: 'table_name does not belong to client_id' }, { status: 403 })
        }

        const upsertRows = rows.map((r) => ({
          client_id,
          metric_date: r.metric_date,
          query: r.query,
          page: r.page,
          device: r.device,
          country: r.country,
          clicks: r.clicks,
          impressions: r.impressions,
          position: r.position,
        }))

        // Upsert dynamic Google Search Console table
        const { error: upsertErr } = await supabaseAdmin
          .from(table_name as any)
          .upsert(upsertRows, {
            onConflict: 'client_id,metric_date,query,page,device,country',
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
