import type {
  AccountKind,
  CategoryKind,
  PaymentChannel,
  PeriodKind,
  TransactionType,
} from "./api/finance"

/** Textos de la interfaz para los valores de la API de finanzas. */

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  CASH: "Efectivo",
  SAVINGS: "Cuenta de ahorros",
  CHECKING: "Cuenta corriente",
  DIGITAL_WALLET: "Billetera digital",
  CREDIT_CARD: "Tarjeta de crédito",
  OTHER: "Otro",
}

/** Tipos que el usuario puede crear; "Otro" lo crea la bienvenida. */
export const CREATABLE_ACCOUNT_KINDS = [
  "CASH",
  "SAVINGS",
  "CHECKING",
  "DIGITAL_WALLET",
  "CREDIT_CARD",
] as const satisfies readonly AccountKind[]

export type CreatableAccountKind = (typeof CREATABLE_ACCOUNT_KINDS)[number]

export const DEPOSIT_KINDS: readonly AccountKind[] = ["SAVINGS", "CHECKING", "DIGITAL_WALLET"]

/** Sugerencias para el campo de entidad; se puede escribir cualquier otra. */
export const INSTITUTION_SUGGESTIONS = [
  "Bancolombia",
  "Davivienda",
  "Banco de Bogotá",
  "BBVA",
  "Banco de Occidente",
  "Banco Popular",
  "AV Villas",
  "Scotiabank Colpatria",
  "Itaú",
  "Banco Falabella",
  "Nequi",
  "Daviplata",
  "Nu",
  "Lulo Bank",
  "RappiPay",
]

export const CATEGORY_KIND_LABELS: Record<CategoryKind, string> = {
  INCOME: "Ingresos",
  EXPENSE: "Gastos",
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  EXPENSE: "Gasto",
  INCOME: "Ingreso",
  TRANSFER: "Transferencia",
  ADJUSTMENT: "Ajuste",
}

export const PAYMENT_CHANNEL_LABELS: Record<PaymentChannel, string> = {
  CARD: "Tarjeta",
  BANK_TRANSFER: "Transferencia",
  PSE: "PSE",
  CASH: "Efectivo",
  DEPOSIT: "Consignación",
  WITHDRAWAL: "Retiro",
  DIRECT_DEBIT: "Débito automático",
  OTHER: "Otro",
}

export const PERIOD_LABELS: Record<PeriodKind, string> = {
  DAY: "Día",
  WEEK: "Semana",
  MONTH: "Mes",
}
