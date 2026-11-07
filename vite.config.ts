import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { loadEnv } from "vite"
import { defineConfig } from "vitest/config"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // BACKEND_URL solo lo usa el proxy de desarrollo; no se expone al navegador.
  const env = loadEnv(mode, process.cwd(), "")
  const backendUrl = env.BACKEND_URL || "http://localhost:8090"

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      // 5173 lo usa otro proyecto local; ver AGENTS.md del workspace.
      port: 5174,
      strictPort: true,
      // Mismo origen: el navegador habla solo con Vite, que reenvía la API al backend (ADR-0007).
      // changeOrigin: false conserva el Host del navegador (localhost:5174): el backend lo compara
      // con la cabecera Origin y, si el proxy lo cambiara por el del backend, rechazaría los POST
      // por CORS. La forma corta ("/api": url) activa changeOrigin, por eso se declara explícito.
      proxy: {
        "/api": { target: backendUrl, changeOrigin: false },
        "/actuator/health": { target: backendUrl, changeOrigin: false },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      css: false,
      // Ver asyncUtilTimeout en src/test/setup.ts.
      testTimeout: 30_000,
    },
  }
})
