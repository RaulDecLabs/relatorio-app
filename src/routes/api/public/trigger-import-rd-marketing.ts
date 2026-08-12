import { createFileRoute } from '@tanstack/react-router'
import { exec } from 'child_process'
import { promisify } from 'util'
import { verifyImportSecret } from '@/lib/verify-import-secret'

const execPromise = promisify(exec)

export const Route = createFileRoute('/api/public/trigger-import-rd-marketing')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!verifyImportSecret(request)) {
          return new Response('Unauthorized - Segredo inválido', { status: 401 });
        }

        const url = new URL(request.url)
        const daysParam = url.searchParams.get('days')
        const days = daysParam ? parseInt(daysParam, 10) : 7

        console.log(`[API Import RD] Disparando importação RD Station em child process: node scripts/import-rd-marketing.js --days=${days}`)

        try {
          const { stdout, stderr } = await execPromise(`node scripts/import-rd-marketing.js --days=${days}`)
          
          console.log('[API Import RD] Sucesso:', stdout)
          if (stderr) {
            console.warn('[API Import RD] Aviso Stderr:', stderr)
          }

          return Response.json({
            ok: true,
            message: 'RD Marketing real data import completed successfully',
            output: stdout,
            warning: stderr || null
          })
        } catch (err: any) {
          console.error('[API Import RD] Erro no Exec:', err)
          return Response.json({
            ok: false,
            error: 'RD Marketing import execution failed',
            details: err.message,
            stdout: err.stdout || null,
            stderr: err.stderr || null
          }, { status: 500 })
        }
      },
      GET: async ({ request }) => {
        // Suporte a GET para facilitação de testes em navegadores e webhooks simples do n8n
        if (!verifyImportSecret(request)) {
          return new Response('Unauthorized - Segredo inválido', { status: 401 });
        }

        const url = new URL(request.url)
        const daysParam = url.searchParams.get('days')
        const days = daysParam ? parseInt(daysParam, 10) : 7

        try {
          const { stdout, stderr } = await execPromise(`node scripts/import-rd-marketing.js --days=${days}`)
          return Response.json({
            ok: true,
            message: 'RD Marketing real data import completed successfully via GET',
            output: stdout,
            warning: stderr || null
          })
        } catch (err: any) {
          return Response.json({
            ok: false,
            error: 'RD Marketing import execution failed',
            details: err.message
          }, { status: 500 })
        }
      }
    },
  },
})
