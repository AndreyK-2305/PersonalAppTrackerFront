import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { sessionQueryKey } from "@/features/auth/api/auth"
import { ApiError } from "@/lib/http"

/** Reintenta una vez los fallos de red o del servidor; nunca los errores del cliente (4xx). */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false
  }
  return failureCount < 1
}

export function createQueryClient(): QueryClient {
  // Si la sesión expira mientras se usa la aplicación, cualquier petición responde 401
  // ("unauthorized"); se marca la sesión como cerrada y RequireSession lleva al inicio de sesión.
  // Las credenciales inválidas del login usan otro código y no entran aquí.
  const onError = (error: Error) => {
    if (error instanceof ApiError && error.status === 401 && error.code === "unauthorized") {
      queryClient.setQueryData(sessionQueryKey, null)
    }
  }

  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
      },
    },
  })
  return queryClient
}
