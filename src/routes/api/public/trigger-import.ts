import { createFileRoute } from '@tanstack/react-router'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

export const Route = createFileRoute('/api/public/trigger-import')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1. Verify simple secret to protect the trigger
        const url = new URL(request.url)
        const requestSecret = url.searchParams.get('secret') || request.headers.get('x-import-secret')
        const configuredSecret = process.env.INGEST_HMAC_SECRET || 'insightOS-secret-2024'

        if (requestSecret !== configuredSecret) {
          return new Response('Unauthorized', { status: 401 })
        }

        // 2. Parse days to import
        const daysParam = url.searchParams.get('days')
        const days = daysParam ? parseInt(daysParam, 10) : 2

        console.log(`[API Import] Triggering GA4 import child process: node scripts/import-ga4.js --days=${days}`)

        try {
          // Execute the import-ga4 script as a separate node process
          const { stdout, stderr } = await execPromise(`node scripts/import-ga4.js --days=${days}`)
          
          console.log('[API Import] Success:', stdout)
          if (stderr) {
            console.warn('[API Import] Warning Stderr:', stderr)
          }

          return Response.json({
            ok: true,
            message: 'GA4 import completed successfully',
            output: stdout,
            warning: stderr || null
          })
        } catch (err: any) {
          console.error('[API Import] Exec error:', err)
          return Response.json({
            ok: false,
            error: 'GA4 import execution failed',
            details: err.message,
            stdout: err.stdout || null,
            stderr: err.stderr || null
          }, { status: 500 })
        }
      },
    },
  },
})
