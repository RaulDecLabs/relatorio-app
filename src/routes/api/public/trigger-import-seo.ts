import { createFileRoute } from '@tanstack/react-router'
import { exec } from 'child_process'
import { promisify } from 'util'
import { verifyImportSecret } from '@/lib/verify-import-secret'

const execPromise = promisify(exec)

export const Route = createFileRoute('/api/public/trigger-import-seo')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!verifyImportSecret(request)) {
          return new Response('Unauthorized', { status: 401 });
        }

        // 2. Parse dias para importar
        const url = new URL(request.url)
        const daysParam = url.searchParams.get('days')
        const days = daysParam ? parseInt(daysParam, 10) : 7

        console.log(`[API Import] Disparando importação SEO (Search Console) em child process: node scripts/import-seo.js --days=${days}`)

        try {
          // Executar script do Search Console
          const { stdout, stderr } = await execPromise(`node scripts/import-seo.js --days=${days}`)
          
          console.log('[API Import SEO] Sucesso:', stdout)
          if (stderr) {
            console.warn('[API Import SEO] Aviso Stderr:', stderr)
          }

          return Response.json({
            ok: true,
            message: 'SEO (Search Console) import completed successfully',
            output: stdout,
            warning: stderr || null
          })
        } catch (err: any) {
          console.error('[API Import SEO] Erro no Exec:', err)
          return Response.json({
            ok: false,
            error: 'SEO (Search Console) import execution failed',
            details: err.message,
            stdout: err.stdout || null,
            stderr: err.stderr || null
          }, { status: 500 })
        }
      },
    },
  },
})
