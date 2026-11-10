import { z } from "zod"

export const deviceTokenSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Ponle un nombre, por ejemplo «iPhone».")
    .max(60, "Máximo 60 caracteres."),
})

export type DeviceTokenValues = z.infer<typeof deviceTokenSchema>
