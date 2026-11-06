import { useMutation, useQueryClient } from "@tanstack/react-query"
import { sessionQueryKey } from "@/features/auth/api/auth"
import { changePassword, updateProfile } from "../api/profile"

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (profile) => queryClient.setQueryData(sessionQueryKey, profile),
  })
}

export function useChangePassword() {
  return useMutation({ mutationFn: changePassword })
}
