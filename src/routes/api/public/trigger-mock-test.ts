import { createFileRoute } from '@tanstack/react-router'
import { exec } from 'child_process'
import { promisify } from 'util'
import { verifyImportSecret } from '@/lib/verify-import-secret'

const execPromise = promisify(exec)

export const Route = createFileRoute('/api/public/trigger-mock-test')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!verifyImportSecret(request)) {
          return new Response('Unauthorized', { status: 401 });
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
