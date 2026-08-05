import { createFileRoute } from '@tanstack/react-router'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

export const Route = createFileRoute('/api/public/trigger-mock-test')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Verificar segredo de autenticação
        const url = new URL(request.url)
        const requestSecret = url.searchParams.get('secret') || request.headers.get('x-import-secret')
        const configuredSecret = process.env.INGEST_HMAC_SECRET || 'insightOS-secret-2024'

        if (requestSecret !== configuredSecret) {
          return new Response('Unauthorized', { status: 401 })
        }

        console.log(`[API Mock] Disparando gerador de dados falsos de teste em child process...`)

        try {
          const { stdout, stderr } = await execPromise(`node scripts/gerar-dados-teste.js`)
          
          console.log('[API Mock] Sucesso:', stdout)
          return Response.json({
            ok: true,
            message: 'Mock test data injected successfully for testing',
            output: stdout
          })
        } catch (err: any) {
          console.error('[API Mock] Erro no Exec:', err)
          return Response.json({
            ok: false,
            error: 'Mock test data execution failed',
            details: err.message
          }, { status: 500 })
        }
      },
    },
  },
})
