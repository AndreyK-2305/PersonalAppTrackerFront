import { queryOptions } from "@tanstack/react-query"
import { ApiError, apiFetch } from "@/lib/http"
import type { components } from "@/types/api"

export type Profile = components["schemas"]["ProfileResponse"]
export type LoginRequest = components["schemas"]["LoginRequest"]
export type RegisterRequest = components["schemas"]["RegisterRequest"]
type RegistrationStatus = components["schemas"]["RegistrationStatusResponse"]

export const sessionQueryKey = ["session"] as const

/** Sesión actual: el perfil del usuario o `null` si no hay sesión (GET /me responde 401). */
export const sessionQueryOptions = queryOptions({
  queryKey: sessionQueryKey,
  queryFn: async (): Promise<Profile | null> => {
    try {
      return await apiFetch<Profile>("/api/v1/me")
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return null
      }
      throw error
    }
  },
  staleTime: 5 * 60_000,
})

export const registrationStatusQueryOptions = queryOptions({
  queryKey: ["auth", "registration"],
  queryFn: () => apiFetch<RegistrationStatus>("/api/v1/auth/registration"),
  staleTime: Infinity,
})

export function login(credentials: LoginRequest): Promise<Profile> {
  return apiFetch<Profile>("/api/v1/auth/login", { method: "POST", json: credentials })
}

export function register(account: RegisterRequest): Promise<Profile> {
  return apiFetch<Profile>("/api/v1/auth/register", { method: "POST", json: account })
}

export function logout(): Promise<void> {
  return apiFetch<void>("/api/v1/auth/logout", { method: "POST" })
}
