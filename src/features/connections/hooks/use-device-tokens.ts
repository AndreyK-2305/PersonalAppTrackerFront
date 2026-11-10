import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createDeviceToken, deviceTokenKeys, revokeDeviceToken } from "../api/device-tokens"

export function useCreateDeviceToken() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createDeviceToken,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deviceTokenKeys.all }),
  })
}

export function useRevokeDeviceToken() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: revokeDeviceToken,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deviceTokenKeys.all }),
  })
}
