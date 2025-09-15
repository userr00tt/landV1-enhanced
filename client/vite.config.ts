import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    allowedHosts: [
      'chat-auth-app-tunnel-97nsrw27.devinapps.com',
      'appsec-security-app-tunnel-l821wsns.devinapps.com'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: false,
        secure: false,
        ws: true,
      },
    },
  },
  esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : undefined
}))

