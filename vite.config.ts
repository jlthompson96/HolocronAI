import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // LLM_SERVER picks the dev-proxy target, e.g. http://localhost:11434 for Ollama.
  // Read from the shell or a .env / .env.local file. Defaults to LM Studio.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/v1': {
          target: env.LLM_SERVER || 'http://localhost:1234',
          changeOrigin: true,
        },
      },
    },
  }
})
