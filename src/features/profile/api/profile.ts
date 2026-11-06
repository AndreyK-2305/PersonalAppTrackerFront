import type { Profile } from "@/features/auth/api/auth"
import { apiFetch } from "@/lib/http"
import type { components } from "@/types/api"

export type UpdateProfileRequest = components["schemas"]["UpdateProfileRequest"]
export type ChangePasswordRequest = components["schemas"]["ChangePasswordRequest"]

export function updateProfile(changes: UpdateProfileRequest): Promise<Profile> {
  return apiFetch<Profile>("/api/v1/me", { method: "PATCH", json: changes })
}

/** El backend cierra las demás sesiones del usuario; la actual sigue activa. */
export function changePassword(request: ChangePasswordRequest): Promise<void> {
  return apiFetch<void>("/api/v1/me/password", { method: "PUT", json: request })
}
