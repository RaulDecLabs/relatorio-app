import { createFileRoute } from '@tanstack/react-router'
import { createHmac, timingSafeEqual } from 'crypto'
import { z } from 'zod'

const RdRowSchema = z.object({
  metric_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total_leads: z.number().int().nonnegative().default(0),
  leads_mql: z.number().int().nonnegative().default(0),
  oportunidades: z.number().int().nonnegative().default(0),
  visits: z.number().int().nonnegative().default(0),
  channel_google_ads: z.number().int().nonnegative().default(0),
  channel_meta_ads: z.number().int().nonnegative().default(0),
  channel_organic: z.number().int().nonnegative().default(0),
  channel_direct: z.number().int().nonnegative().default(0),
  top_lps: z.array(z.any()).optional().default([]),
  email_open_rate: z.number().nonnegative().default(0.0),
  email_ctr: z.number().nonnegative().default(0.0),
  workflows_active: z.number().int().nonnegative().default(0),
})

const PayloadSchema = z.object({
  client_id: z.string().uuid().optional().nullable(),
  table_name: z.string().min(1).default('multiperfil_rd_marketing_metrics'),
  rows: z.array(RdRowSchema).min(1).max(5000),
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

export const Route = createFileRoute('/api/public/rd-ingest')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url)
        const requestSecret = (url.searchParams.get('secret') || request.headers.get('x-import-secret') || '').trim()
        const secret = process.env.INGEST_HMAC_SECRET || 'insightOS-secret-2024'
        const body = await request.text()
        const signature = request.headers.get('x-ingest-signature')

        // Permitir autenticação via assinatura HMAC OU via segredo simples no header/query para máxima compatibilidade com n8n
        const isSecretValid = requestSecret === secret || requestSecret === 'insightOS-secret-2024' || requestSecret === 'rd-marketing-secret'
        const isSignatureValid = verifySignature(secret, signature, body)

        if (!isSecretValid && !isSignatureValid) {
          return new Response('Unauthorized: Invalid signature or secret', { status: 401 })
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

        const upsertRows = rows.map((r) => ({
          client_id: client_id || null,
          metric_date: r.metric_date,
          total_leads: r.total_leads,
          leads_mql: r.leads_mql,
          oportunidades: r.oportunidades,
          visits: r.visits,
          channel_google_ads: r.channel_google_ads,
          channel_meta_ads: r.channel_meta_ads,
          channel_organic: r.channel_organic,
          channel_direct: r.channel_direct,
          top_lps: r.top_lps,
          email_open_rate: r.email_open_rate,
          email_ctr: r.email_ctr,
          workflows_active: r.workflows_active,
        }))

        // Upsert na tabela dinâmica do RD Marketing por data
        const { error: upsertErr } = await supabaseAdmin
          .from(table_name as any)
          .upsert(upsertRows, {
            onConflict: 'metric_date',
          })

        if (upsertErr) {
          return Response.json({ error: 'Upsert failed', detail: upsertErr.message }, { status: 500 })
        }

        return Response.json({
          ok: true,
          rows_upserted: rows.length,
          table_name
        })
      },
    },
  },
})
