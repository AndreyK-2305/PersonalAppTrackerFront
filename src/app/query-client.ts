import { QueryClient } from "@tanstack/react-query"
import { ApiError } from "@/lib/http"

/** Reintenta una vez los fallos de red o del servidor; nunca los errores del cliente (4xx). */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false
  }
  return failureCount < 1
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
      },
    },
  })
}
