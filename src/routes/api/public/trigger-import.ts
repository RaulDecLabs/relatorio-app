import { createFileRoute } from '@tanstack/react-router'
import { exec } from 'child_process'
import { promisify } from 'util'
import { verifyImportSecret } from '@/lib/verify-import-secret'

const execPromise = promisify(exec)

export const Route = createFileRoute('/api/public/trigger-import')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!verifyImportSecret(request)) {
          return new Response('Unauthorized', { status: 401 });
        }

        // 2. Parse days to import
        const url = new URL(request.url)
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
