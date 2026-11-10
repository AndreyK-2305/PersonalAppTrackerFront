import { queryOptions } from "@tanstack/react-query"
import { apiFetch } from "@/lib/http"
import type { components } from "@/types/api"

type Schemas = components["schemas"]

export type DeviceToken = Schemas["DeviceTokenResponse"]
export type DeviceScope = DeviceToken["scopes"][number]
export type CreatedDeviceToken = Schemas["CreatedDeviceTokenResponse"]

const BASE = "/api/v1/me/device-tokens"

/** Ruta que llama el atajo del iPhone (ADR-0017). */
export const CAPTURE_ENDPOINT = "/api/v1/device/capture/notifications"

export const deviceTokenKeys = {
  all: ["device-tokens"] as const,
}

export const deviceTokensQueryOptions = queryOptions({
  queryKey: deviceTokenKeys.all,
  queryFn: () => apiFetch<DeviceToken[]>(BASE),
})

/** La respuesta trae el secreto, que no se puede volver a consultar. */
export function createDeviceToken(request: {
  name: string
  scopes: DeviceScope[]
}): Promise<CreatedDeviceToken> {
  return apiFetch(BASE, { method: "POST", json: request })
}

export function revokeDeviceToken(id: string): Promise<void> {
  return apiFetch(`${BASE}/${id}`, { method: "DELETE" })
}
