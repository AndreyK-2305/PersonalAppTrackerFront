import { z } from "zod"
import { compareDecimal, formatMoneyInput, parseMoneyInput } from "@/lib/money"
import type { SavingsGoal, SavingsGoalRequest } from "./api/goals"

/**
 * Esquemas de los formularios de metas. Los montos se escriben en formato es-CO y las tasas, como
 * porcentaje con coma o punto ("10,5"). Las reglas definitivas las aplica el backend (ADR-0018).
 */

const POSITIVE_MONEY_MESSAGE = "Escribe un monto mayor que cero, por ejemplo 150.000."
const PERCENT = /^\d{1,4}([.,]\d{1,4})?$/

export const SAVINGS_PLANS = ["TARGET_DATE", "MONTHLY_AMOUNT"] as const

export const savingsGoalFormSchema = z
  .object({
    name: z.string().trim().min(1, "Escribe un nombre.").max(100, "Máximo 100 caracteres."),
    targetAmount: z.string(),
    plan: z.enum(SAVINGS_PLANS),
    targetDate: z.string(),
    monthlyAmount: z.string(),
  })
  .superRefine((values, ctx) => {
    if (!isPositiveMoney(values.targetAmount)) {
      ctx.addIssue({ code: "custom", path: ["targetAmount"], message: POSITIVE_MONEY_MESSAGE })
    }
    if (values.plan === "TARGET_DATE" && values.targetDate === "") {
      ctx.addIssue({ code: "custom", path: ["targetDate"], message: "Elige la fecha objetivo." })
    }
    if (values.plan === "MONTHLY_AMOUNT" && !isPositiveMoney(values.monthlyAmount)) {
      ctx.addIssue({ code: "custom", path: ["monthlyAmount"], message: POSITIVE_MONEY_MESSAGE })
    }
  })

export type SavingsGoalFormValues = z.infer<typeof savingsGoalFormSchema>

export function savingsGoalFormDefaults(goal?: SavingsGoal): SavingsGoalFormValues {
  return {
    name: goal?.name ?? "",
    targetAmount: goal ? formatMoneyInput(goal.targetAmount) : "",
    plan: goal?.plan ?? "TARGET_DATE",
    targetDate: goal?.targetDate ?? "",
    monthlyAmount: goal?.monthlyAmount ? formatMoneyInput(goal.monthlyAmount) : "",
  }
}

/** Solo se envía el campo del plan elegido. */
export function toSavingsGoalRequest(values: SavingsGoalFormValues): SavingsGoalRequest {
  const base = {
    name: values.name,
    targetAmount: parseMoneyInput(values.targetAmount) ?? "",
    plan: values.plan,
  }
  return values.plan === "TARGET_DATE"
    ? { ...base, targetDate: values.targetDate }
    : { ...base, monthlyAmount: parseMoneyInput(values.monthlyAmount) ?? "" }
}

export const contributionFormSchema = z.object({
  date: z.string().min(1, "Elige la fecha del abono."),
  amount: z.string().refine(isPositiveMoney, POSITIVE_MONEY_MESSAGE),
})

export type ContributionFormValues = z.infer<typeof contributionFormSchema>

export const rateFormSchema = z.object({
  ratePercent: z
    .string()
    .trim()
    .regex(PERCENT, "Escribe un porcentaje con hasta 4 decimales, por ejemplo 10,5.")
    .refine((text) => Number(text.replace(",", ".")) <= 1000, "La tasa máxima es 1000 % EA."),
})

export type RateFormValues = z.infer<typeof rateFormSchema>

/** "10,5" → "10.5", la forma que espera la API. */
export function toRatePercent(text: string): string {
  return text.trim().replace(",", ".")
}

/** "10.5" → "10,5", para mostrar o editar. */
export function formatPercent(percent: string): string {
  return percent.replace(".", ",")
}

function isPositiveMoney(text: string): boolean {
  const decimal = parseMoneyInput(text)
  return decimal !== null && compareDecimal(decimal, "0") > 0
}
