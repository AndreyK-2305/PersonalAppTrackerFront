import { z } from "zod"
import { compareDecimal, formatMoneyInput, parseMoneyInput } from "@/lib/money"
import type {
  FinancedGoal,
  FinancedGoalRequest,
  FinancingTerms,
  SavingsGoal,
  SavingsGoalRequest,
} from "./api/goals"

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

// --- Metas financiadas ---

const MONEY_MESSAGE = "Escribe un monto válido, por ejemplo 150.000."
const PERCENT_MESSAGE = "Escribe un porcentaje con hasta 4 decimales, por ejemplo 18,5."
export const MAX_INSTALLMENTS = 600

export const financedGoalFormSchema = z
  .object({
    name: z.string().trim().min(1, "Escribe un nombre.").max(100, "Máximo 100 caracteres."),
    assetValue: z.string(),
    downPayment: z.string(),
    ratePercent: z.string(),
    installments: z.string(),
    firstDueDate: z.string(),
    actualInstallment: z.string(),
  })
  .superRefine((values, ctx) => {
    for (const issue of termsIssues(values)) {
      ctx.addIssue({ code: "custom", path: [issue.field], message: issue.message })
    }
  })

export type FinancedGoalFormValues = z.infer<typeof financedGoalFormSchema>

type TermsValues = Omit<FinancedGoalFormValues, "name">

/** Reglas de las condiciones de la financiación; las mismas para enviar y para la vista previa. */
function termsIssues(
  values: Partial<TermsValues>,
): { field: keyof TermsValues; message: string }[] {
  const issues: { field: keyof TermsValues; message: string }[] = []
  const assetValue = parseMoneyInput(values.assetValue ?? "")
  if (assetValue === null || compareDecimal(assetValue, "0") <= 0) {
    issues.push({ field: "assetValue", message: POSITIVE_MONEY_MESSAGE })
  }
  const downPaymentText = (values.downPayment ?? "").trim()
  if (downPaymentText !== "") {
    const downPayment = parseMoneyInput(downPaymentText)
    if (downPayment === null) {
      issues.push({ field: "downPayment", message: MONEY_MESSAGE })
    } else if (assetValue !== null && compareDecimal(downPayment, assetValue) >= 0) {
      issues.push({ field: "downPayment", message: "Debe ser menor que el valor del bien." })
    }
  }
  const rate = (values.ratePercent ?? "").trim()
  if (!PERCENT.test(rate)) {
    issues.push({ field: "ratePercent", message: PERCENT_MESSAGE })
  } else if (Number(rate.replace(",", ".")) > 1000) {
    issues.push({ field: "ratePercent", message: "La tasa máxima es 1000 % EA." })
  }
  const installments = (values.installments ?? "").trim()
  if (
    !/^\d{1,3}$/.test(installments) ||
    Number(installments) < 1 ||
    Number(installments) > MAX_INSTALLMENTS
  ) {
    issues.push({
      field: "installments",
      message: `Escribe un número de cuotas entre 1 y ${MAX_INSTALLMENTS}.`,
    })
  }
  if ((values.firstDueDate ?? "") === "") {
    issues.push({ field: "firstDueDate", message: "Elige la fecha de la primera cuota." })
  }
  const actualText = (values.actualInstallment ?? "").trim()
  if (actualText !== "" && !isPositiveMoney(actualText)) {
    issues.push({ field: "actualInstallment", message: POSITIVE_MONEY_MESSAGE })
  }
  return issues
}

export function financedGoalFormDefaults(goal?: FinancedGoal): FinancedGoalFormValues {
  return {
    name: goal?.name ?? "",
    assetValue: goal ? formatMoneyInput(goal.assetValue) : "",
    downPayment:
      goal && compareDecimal(goal.downPayment, "0") > 0 ? formatMoneyInput(goal.downPayment) : "",
    ratePercent: goal ? formatPercent(goal.ratePercent) : "",
    installments: goal ? String(goal.installments) : "",
    firstDueDate: goal?.firstDueDate ?? "",
    actualInstallment: goal?.actualInstallment ? formatMoneyInput(goal.actualInstallment) : "",
  }
}

/**
 * Condiciones listas para la API, o `null` si todavía no son válidas. Los campos opcionales vacíos
 * no se envían.
 */
export function toFinancingTerms(values: Partial<TermsValues>): FinancingTerms | null {
  if (termsIssues(values).length > 0) {
    return null
  }
  const downPayment = parseMoneyInput(values.downPayment ?? "")
  const actualInstallment = parseMoneyInput(values.actualInstallment ?? "")
  return {
    assetValue: parseMoneyInput(values.assetValue ?? "") ?? "",
    ...(downPayment !== null && { downPayment }),
    ratePercent: toRatePercent(values.ratePercent ?? ""),
    installments: Number(values.installments),
    firstDueDate: values.firstDueDate ?? "",
    ...(actualInstallment !== null && { actualInstallment }),
  }
}

/** Solo se llama con valores que ya pasaron el esquema. */
export function toFinancedGoalRequest(values: FinancedGoalFormValues): FinancedGoalRequest {
  const terms = toFinancingTerms(values)
  if (terms === null) {
    throw new Error("Las condiciones de la financiación no son válidas")
  }
  return { name: values.name, ...terms }
}
