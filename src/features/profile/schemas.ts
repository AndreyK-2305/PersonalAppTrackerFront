import { z } from "zod"
import { newPasswordSchema } from "@/features/auth/schemas"

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Ingresa tu nombre.").max(100, "Máximo 100 caracteres."),
  timeZone: z.string().min(1, "Selecciona una zona horaria."),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contraseña actual."),
    newPassword: newPasswordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmNewPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmNewPassword"],
  })

export type ProfileValues = z.infer<typeof profileSchema>
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
