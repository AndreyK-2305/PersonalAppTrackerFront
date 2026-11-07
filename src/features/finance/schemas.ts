import { z } from "zod"
import { compareDecimal, formatMoneyInput, parseMoneyInput } from "@/lib/money"
import type {
  Account,
  AccountRequest,
  PaymentChannel,
  Transaction,
  TransactionRequest,
} from "./api/finance"
import { CREATABLE_ACCOUNT_KINDS, DEPOSIT_KINDS, type CreatableAccountKind } from "./labels"

/**
 * Esquemas de los formularios de finanzas. Los montos se escriben en formato es-CO y se envían como
 * cadenas decimales. Las reglas definitivas las aplica el backend; aquí solo se adelanta la
 * respuesta.
 */

const MONEY_MESSAGE = "Escribe un monto válido, por ejemplo 150.000,50."
const POSITIVE_MONEY_MESSAGE = "Escribe un monto mayor que cero, por ejemplo 150.000,50."
const REQUIRED_ACCOUNT = "Elige un producto."

export const accountFormSchema = z
  .object({
    kind: z.enum(CREATABLE_ACCOUNT_KINDS),
    name: z.string().trim().min(1, "Escribe un nombre.").max(60, "Máximo 60 caracteres."),
    institution: z.string().trim().max(60, "Máximo 60 caracteres."),
    lastFourDigits: z
      .string()
      .trim()
      .regex(/^(\d{4})?$/, "Deben ser exactamente 4 números."),
    openingBalance: z.string(),
    creditLimit: z.string(),
    initialDebt: z.string(),
  })
  .superRefine((values, ctx) => {
    const isCard = values.kind === "CREDIT_CARD"
    const isDeposit = DEPOSIT_KINDS.includes(values.kind)
    if ((isCard || isDeposit) && values.institution === "") {
      ctx.addIssue({
        code: "custom",
        path: ["institution"],
        message: "Escribe la entidad, por ejemplo Bancolombia.",
      })
    }
    if (isCard) {
      if (!isPositiveMoney(values.creditLimit)) {
        ctx.addIssue({ code: "custom", path: ["creditLimit"], message: POSITIVE_MONEY_MESSAGE })
      }
      if (!isOptionalMoney(values.initialDebt)) {
        ctx.addIssue({ code: "custom", path: ["initialDebt"], message: MONEY_MESSAGE })
      }
    } else if (!isOptionalMoney(values.openingBalance, isDeposit)) {
      ctx.addIssue({ code: "custom", path: ["openingBalance"], message: MONEY_MESSAGE })
    }
  })

export type AccountFormValues = z.infer<typeof accountFormSchema>

export function accountFormDefaults(account?: Account): AccountFormValues {
  if (!account) {
    return {
      kind: "CASH",
      name: "",
      institution: "",
      lastFourDigits: "",
      openingBalance: "",
      creditLimit: "",
      initialDebt: "",
    }
  }
  return {
    kind: account.kind as CreatableAccountKind,
    name: account.name,
    institution: account.institution ?? "",
    lastFourDigits: account.lastFourDigits ?? "",
    openingBalance: account.kind === "CREDIT_CARD" ? "" : formatMoneyInput(account.openingBalance),
    creditLimit: account.creditLimit ? formatMoneyInput(account.creditLimit) : "",
    initialDebt: account.initialDebt ? formatMoneyInput(account.initialDebt) : "",
  }
}

/** Arma la petición con solo los campos que aplican al tipo de producto. */
export function toAccountRequest(values: AccountFormValues): AccountRequest {
  const base = { kind: values.kind, name: values.name }
  if (values.kind === "CASH") {
    return { ...base, openingBalance: optionalMoney(values.openingBalance) }
  }
  const issuer = {
    institution: values.institution,
    lastFourDigits: values.lastFourDigits || undefined,
  }
  if (values.kind === "CREDIT_CARD") {
    return {
      ...base,
      ...issuer,
      creditLimit: optionalMoney(values.creditLimit),
      initialDebt: optionalMoney(values.initialDebt),
    }
  }
  return { ...base, ...issuer, openingBalance: optionalMoney(values.openingBalance, true) }
}

export const categoryFormSchema = z.object({
  kind: z.enum(["INCOME", "EXPENSE"]),
  name: z.string().trim().min(1, "Escribe un nombre.").max(50, "Máximo 50 caracteres."),
  /** Vacío para una categoría principal. */
  parentId: z.string(),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>

export const transactionFormSchema = z
  .object({
    type: z.enum(["EXPENSE", "INCOME", "TRANSFER", "ADJUSTMENT"]),
    amount: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha."),
    sourceAccountId: z.string(),
    destinationAccountId: z.string(),
    accountId: z.string(),
    direction: z.enum(["INCREASE", "DECREASE"]),
    categoryId: z.string(),
    description: z.string().trim().max(200, "Máximo 200 caracteres."),
    merchant: z.string().trim().max(100, "Máximo 100 caracteres."),
    /** Vacío si no se indica el medio de pago. */
    channel: z.string(),
  })
  .superRefine((values, ctx) => {
    const required = (field: "sourceAccountId" | "destinationAccountId" | "accountId") => {
      if (values[field] === "") {
        ctx.addIssue({ code: "custom", path: [field], message: REQUIRED_ACCOUNT })
      }
    }
    if (!isPositiveMoney(values.amount)) {
      ctx.addIssue({ code: "custom", path: ["amount"], message: POSITIVE_MONEY_MESSAGE })
    }
    switch (values.type) {
      case "EXPENSE":
        required("sourceAccountId")
        break
      case "INCOME":
        required("destinationAccountId")
        break
      case "TRANSFER":
        required("sourceAccountId")
        required("destinationAccountId")
        if (
          values.sourceAccountId !== "" &&
          values.sourceAccountId === values.destinationAccountId
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["destinationAccountId"],
            message: "El destino debe ser distinto del origen.",
          })
        }
        break
      case "ADJUSTMENT":
        required("accountId")
        break
    }
  })

export type TransactionFormValues = z.infer<typeof transactionFormSchema>

export function transactionFormDefaults(
  today: string,
  transaction?: Transaction,
): TransactionFormValues {
  if (!transaction) {
    return {
      type: "EXPENSE",
      amount: "",
      date: today,
      sourceAccountId: "",
      destinationAccountId: "",
      accountId: "",
      direction: "INCREASE",
      categoryId: "",
      description: "",
      merchant: "",
      channel: "",
    }
  }
  const isAdjustment = transaction.type === "ADJUSTMENT"
  return {
    type: transaction.type,
    amount: formatMoneyInput(transaction.amount),
    date: transaction.date,
    sourceAccountId: isAdjustment ? "" : (transaction.sourceAccountId ?? ""),
    destinationAccountId: isAdjustment ? "" : (transaction.destinationAccountId ?? ""),
    accountId: isAdjustment
      ? (transaction.destinationAccountId ?? transaction.sourceAccountId ?? "")
      : "",
    direction: transaction.direction ?? "INCREASE",
    categoryId: transaction.categoryId ?? "",
    description: transaction.description ?? "",
    merchant: transaction.merchant ?? "",
    channel: transaction.channel ?? "",
  }
}

/** Arma la petición con solo los campos que aplican al tipo de movimiento. */
export function toTransactionRequest(values: TransactionFormValues): TransactionRequest {
  const common = {
    type: values.type,
    amount: parseMoneyInput(values.amount) ?? "",
    date: values.date,
    description: values.description || undefined,
    merchant: values.merchant || undefined,
    channel: (values.channel || undefined) as PaymentChannel | undefined,
  }
  const category = values.categoryId || undefined
  switch (values.type) {
    case "EXPENSE":
      return { ...common, sourceAccountId: values.sourceAccountId, categoryId: category }
    case "INCOME":
      return { ...common, destinationAccountId: values.destinationAccountId, categoryId: category }
    case "TRANSFER":
      return {
        ...common,
        sourceAccountId: values.sourceAccountId,
        destinationAccountId: values.destinationAccountId,
      }
    case "ADJUSTMENT":
      return { ...common, accountId: values.accountId, direction: values.direction }
  }
}

function isPositiveMoney(text: string): boolean {
  const decimal = parseMoneyInput(text)
  return decimal !== null && compareDecimal(decimal, "0") > 0
}

function isOptionalMoney(text: string, allowNegative = false): boolean {
  return text.trim() === "" || parseMoneyInput(text, { allowNegative }) !== null
}

function optionalMoney(text: string, allowNegative = false): string | undefined {
  return text.trim() === "" ? undefined : (parseMoneyInput(text, { allowNegative }) ?? undefined)
}
