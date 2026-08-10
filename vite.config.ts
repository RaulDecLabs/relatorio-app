// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    preset: 'node-server',
    rollupConfig: {
      // Não externalizar nada — openai e ws devem ser embutidos no bundle do servidor
      external: [],
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    build: {
      rollupOptions: {
        // Apenas dependências nativas do Node que não precisam ser empacotadas
        external: [],
      },
    },
    server: {
      allowedHosts: ['.lhr.life', '.loca.lt', '.ngrok-free.app', '.trycloudflare.com', 'localhost'],
    },
  },
});
