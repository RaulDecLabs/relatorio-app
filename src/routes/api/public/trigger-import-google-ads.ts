import { createFileRoute } from '@tanstack/react-router'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

export const Route = createFileRoute('/api/public/trigger-import-google-ads')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1. Verificar segredo de autenticação
        const url = new URL(request.url)
        const requestSecret = url.searchParams.get('secret') || request.headers.get('x-import-secret')
        const configuredSecret = process.env.INGEST_HMAC_SECRET || 'insightOS-secret-2024'

        if (requestSecret !== configuredSecret) {
          return new Response('Unauthorized', { status: 401 })
        }

        // 2. Parse dias para importar
        const daysParam = url.searchParams.get('days')
        const days = daysParam ? parseInt(daysParam, 10) : 7

        console.log(`[API Import] Disparando importação Google Ads em child process: node scripts/import-google-ads.js --days=${days}`)

        try {
          // Executar script do Google Ads
          const { stdout, stderr } = await execPromise(`node scripts/import-google-ads.js --days=${days}`)
          
          console.log('[API Import Google Ads] Sucesso:', stdout)
          if (stderr) {
            console.warn('[API Import Google Ads] Aviso Stderr:', stderr)
          }

          return Response.json({
            ok: true,
            message: 'Google Ads import completed successfully',
            output: stdout,
            warning: stderr || null
          })
        } catch (err: any) {
          console.error('[API Import Google Ads] Erro no Exec:', err)
          return Response.json({
            ok: false,
            error: 'Google Ads import execution failed',
            details: err.message,
            stdout: err.stdout || null,
            stderr: err.stderr || null
          }, { status: 500 })
        }
      },
    },
  },
})
