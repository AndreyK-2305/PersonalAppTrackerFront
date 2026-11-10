import { queryOptions } from "@tanstack/react-query"
import { apiFetch } from "@/lib/http"
import type { components } from "@/types/api"

type Schemas = components["schemas"]

export type Review = Schemas["ReviewResponse"]
export type ReviewReason = Review["reason"]
export type OwnKey = Schemas["OwnKeyResponse"]

const BASE = "/api/v1/capture"

/**
 * Claves de TanStack Query de la captura. Las acciones de revisión cambian movimientos, así que
 * invalidan también las consultas de finanzas.
 */
export const captureKeys = {
  all: ["capture"] as const,
  reviews: () => [...captureKeys.all, "reviews"] as const,
  ownKeys: () => [...captureKeys.all, "own-keys"] as const,
}

export const reviewsQueryOptions = queryOptions({
  queryKey: captureKeys.reviews(),
  queryFn: () => apiFetch<Review[]>(`${BASE}/reviews`),
})

export const ownKeysQueryOptions = queryOptions({
  queryKey: captureKeys.ownKeys(),
  queryFn: () => apiFetch<OwnKey[]>(`${BASE}/own-keys`),
})

export function confirmReview(id: string): Promise<void> {
  return apiFetch(`${BASE}/reviews/${id}/confirm`, { method: "POST" })
}

export function markOwnTransfer({
  id,
  destinationProductId,
}: {
  id: string
  destinationProductId: string
}): Promise<void> {
  return apiFetch(`${BASE}/reviews/${id}/own-transfer`, {
    method: "POST",
    json: { destinationProductId },
  })
}

/** `amount` es la cadena decimal de la API (punto decimal), en COP. */
export function setReviewAmount({ id, amount }: { id: string; amount: string }): Promise<void> {
  return apiFetch(`${BASE}/reviews/${id}/amount`, { method: "POST", json: { amount } })
}

export function discardReview(id: string): Promise<void> {
  return apiFetch(`${BASE}/reviews/${id}/discard`, { method: "POST" })
}

/** "No es mía" sobre una transferencia captada por una llave propia. */
export function markNotOwn(transactionId: string): Promise<void> {
  return apiFetch(`${BASE}/transactions/${transactionId}/not-own`, { method: "POST" })
}

export function addOwnKey(request: { key: string; productId: string }): Promise<OwnKey> {
  return apiFetch(`${BASE}/own-keys`, { method: "POST", json: request })
}

export function removeOwnKey(id: string): Promise<void> {
  return apiFetch(`${BASE}/own-keys/${id}`, { method: "DELETE" })
}
