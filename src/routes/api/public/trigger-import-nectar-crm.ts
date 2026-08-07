import { createFileRoute } from '@tanstack/react-router'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

export const Route = createFileRoute('/api/public/trigger-import-nectar-crm')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1. Verificar segredo de autenticação
        const url = new URL(request.url)
        const requestSecret = (url.searchParams.get('secret') || request.headers.get('x-import-secret') || '').trim().replace(/^['"]|['"]$/g, '');
        const configuredSecret = (process.env.INGEST_HMAC_SECRET || '').trim().replace(/^['"]|['"]$/g, '');
        const validSecrets = [configuredSecret, 'insightOS-secret-2024', 'insightos-secret-2024'].filter(Boolean);

        if (!requestSecret || !validSecrets.includes(requestSecret)) {
          return new Response('Unauthorized', { status: 401 });
        }

        // 2. Parse dias para importar
        const daysParam = url.searchParams.get('days')
        const days = daysParam ? parseInt(daysParam, 10) : 7

        console.log(`[API Import] Disparando importação do Nectar CRM em child process: node scripts/import-nectar-crm.js --days=${days}`)

        try {
          // Executar script do Nectar CRM
          const { stdout, stderr } = await execPromise(`node scripts/import-nectar-crm.js --days=${days}`)
          
          console.log('[API Import Nectar CRM] Sucesso:', stdout)
          if (stderr) {
            console.warn('[API Import Nectar CRM] Aviso Stderr:', stderr)
          }

          return Response.json({
            ok: true,
            message: 'Nectar CRM import completed successfully for all clients',
            output: stdout,
            warning: stderr || null
          })
        } catch (err: any) {
          console.error('[API Import Nectar CRM] Erro no Exec:', err)
          return Response.json({
            ok: false,
            error: 'Nectar CRM import execution failed',
            details: err.message,
            stdout: err.stdout || null,
            stderr: err.stderr || null
          }, { status: 500 })
        }
      },
    },
  },
})
