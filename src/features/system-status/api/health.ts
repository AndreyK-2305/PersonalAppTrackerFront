import { queryOptions } from "@tanstack/react-query"
import { apiFetch } from "@/lib/http"

/** Estado agregado que reporta Spring Boot Actuator. */
export interface HealthResponse {
  status: "UP" | "DOWN" | "OUT_OF_SERVICE" | "UNKNOWN"
}

export const HEALTH_REFRESH_INTERVAL_MS = 30_000

export const healthQueryOptions = queryOptions({
  queryKey: ["system", "health"],
  queryFn: () => apiFetch<HealthResponse>("/actuator/health"),
  refetchInterval: HEALTH_REFRESH_INTERVAL_MS,
  // El estado se muestra tal como responde: un reintento ocultaría una caída real.
  retry: false,
})
