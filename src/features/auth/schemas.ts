import { z } from "zod"

// Las reglas definitivas las aplica el backend; aquí solo se adelantan para dar respuesta inmediata.
export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 64

const email = z
  .string()
  .trim()
  .min(1, "Ingresa tu correo electrónico.")
  .pipe(z.email("Ingresa un correo electrónico válido."))

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(PASSWORD_MAX_LENGTH, `La contraseña puede tener hasta ${PASSWORD_MAX_LENGTH} caracteres.`)

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Ingresa tu contraseña."),
})

export const registerSchema = z
  .object({
    displayName: z.string().trim().min(1, "Ingresa tu nombre.").max(100, "Máximo 100 caracteres."),
    email,
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  })

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
