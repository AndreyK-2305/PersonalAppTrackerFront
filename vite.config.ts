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
      proxy: {
        "/api": backendUrl,
        "/actuator/health": backendUrl,
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      css: false,
      testTimeout: 15_000,
    },
  }
})
