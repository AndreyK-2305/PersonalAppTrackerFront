import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  login,
  logout,
  register,
  sessionQueryKey,
  sessionQueryOptions,
  type Profile,
} from "../api/auth"

export function useSession() {
  return useQuery(sessionQueryOptions)
}

/** Perfil de la sesión. Solo debe usarse dentro de rutas protegidas, donde siempre existe. */
export function useCurrentProfile(): Profile {
  const { data } = useSession()
  if (!data) {
    throw new Error("useCurrentProfile se usó fuera de una ruta protegida")
  }
  return data
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: login,
    onSuccess: (profile) => queryClient.setQueryData(sessionQueryKey, profile),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: register,
    onSuccess: (profile) => queryClient.setQueryData(sessionQueryKey, profile),
  })
}

/** Cierra la sesión y descarta todos los datos en caché del usuario. */
export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear()
      queryClient.setQueryData(sessionQueryKey, null)
    },
  })
}
