import { z } from "zod"
import { compareDecimal, parseMoneyInput } from "@/lib/money"

export const ownKeySchema = z.object({
  key: z.string().trim().min(1, "Escribe la llave.").max(100, "Máximo 100 caracteres."),
  productId: z.string().min(1, "Elige la cuenta a la que llega."),
})

/** Valor en pesos de una compra en dólares; se convierte a la cadena decimal de la API. */
export const manualAmountSchema = z.object({
  amount: z.string().transform((text, context) => {
    const decimal = parseMoneyInput(text)
    if (decimal === null || compareDecimal(decimal, "0") <= 0) {
      context.addIssue({ code: "custom", message: "Escribe un monto válido, por ejemplo 65.120." })
      return z.NEVER
    }
    return decimal
  }),
})

export type OwnKeyValues = z.infer<typeof ownKeySchema>
export type ManualAmountInput = z.input<typeof manualAmountSchema>
export type ManualAmountValues = z.output<typeof manualAmountSchema>
