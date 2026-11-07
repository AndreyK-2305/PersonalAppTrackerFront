import type {
  Account,
  AccountList,
  Category,
  Summary,
  Transaction,
  TransactionPage,
} from "@/features/finance/api/finance"

/** Datos de ejemplo de la API de finanzas para las pruebas de pantallas. */

const CREATED_AT = "2026-11-01T14:00:00Z"

export const cashAccount: Account = {
  id: "acc-cash",
  kind: "CASH",
  name: "Billetera",
  currency: "COP",
  openingBalance: "50000.00",
  balance: "38000.00",
  archived: false,
  systemManaged: false,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
}

export const savingsAccount: Account = {
  id: "acc-savings",
  kind: "SAVINGS",
  name: "Ahorros",
  currency: "COP",
  institution: "Bancolombia",
  lastFourDigits: "1234",
  openingBalance: "1000000.00",
  balance: "4629999.50",
  archived: false,
  systemManaged: false,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
}

export const cardAccount: Account = {
  id: "acc-card",
  kind: "CREDIT_CARD",
  name: "Visa",
  currency: "COP",
  institution: "Bancolombia",
  lastFourDigits: "5403",
  openingBalance: "0.00",
  balance: "-350000.50",
  creditLimit: "3000000.00",
  initialDebt: "0.00",
  debt: "350000.50",
  availableCredit: "2649999.50",
  archived: false,
  systemManaged: false,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
}

export const otherAccount: Account = {
  id: "acc-other",
  kind: "OTHER",
  name: "Otro",
  currency: "COP",
  openingBalance: "0.00",
  archived: false,
  systemManaged: true,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
}

export const accountList: AccountList = {
  accounts: [savingsAccount, cashAccount, cardAccount, otherAccount],
  netWorth: "4317999.00",
  currency: "COP",
}

export const foodCategory: Category = {
  id: "cat-food",
  kind: "EXPENSE",
  name: "Alimentación",
  archived: false,
  subcategories: [
    { id: "cat-groceries", kind: "EXPENSE", name: "Mercado", archived: false, subcategories: [] },
  ],
}

export const salaryCategory: Category = {
  id: "cat-salary",
  kind: "INCOME",
  name: "Salario",
  archived: false,
  subcategories: [],
}

export const categories: Category[] = [salaryCategory, foodCategory]

export const expense: Transaction = {
  id: "tx-expense",
  type: "EXPENSE",
  amount: "85000.50",
  currency: "COP",
  date: "2026-11-03",
  merchant: "Éxito",
  channel: "CARD",
  sourceAccountId: cardAccount.id,
  categoryId: "cat-groceries",
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
}

export const income: Transaction = {
  id: "tx-income",
  type: "INCOME",
  amount: "4000000.00",
  currency: "COP",
  date: "2026-11-01",
  description: "Nómina",
  destinationAccountId: savingsAccount.id,
  categoryId: salaryCategory.id,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
}

export const transfer: Transaction = {
  id: "tx-transfer",
  type: "TRANSFER",
  amount: "300000.00",
  currency: "COP",
  date: "2026-11-04",
  description: "Pago tarjeta",
  sourceAccountId: savingsAccount.id,
  destinationAccountId: cardAccount.id,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
}

export function transactionPage(
  items: Transaction[],
  page = 0,
  totalItems = items.length,
): TransactionPage {
  return { items, page, size: 20, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / 20)) }
}

export const summary: Summary = {
  kind: "MONTH",
  start: "2026-11-01",
  end: "2026-11-30",
  currency: "COP",
  current: {
    start: "2026-11-01",
    end: "2026-11-06",
    income: "4000000.00",
    expense: "350000.50",
    net: "3649999.50",
  },
  previous: {
    start: "2026-10-01",
    end: "2026-10-06",
    income: "4000000.00",
    expense: "420000.00",
    net: "3580000.00",
  },
  byAccount: [
    { accountId: savingsAccount.id, income: "4000000.00", expense: "0.00" },
    { accountId: cardAccount.id, income: "0.00", expense: "350000.50" },
  ],
  expensesByCategory: [{ categoryId: foodCategory.id, total: "300000.50" }, { total: "50000.00" }],
  trend: ["06", "07", "08", "09", "10", "11"].map((month) => ({
    start: `2026-${month}-01`,
    end: month === "11" ? "2026-11-06" : `2026-${month}-28`,
    income: "4000000.00",
    expense: month === "11" ? "350000.50" : "1200000.00",
  })),
}

/** Respuestas de una cuenta con Finanzas configurada, para combinar con `stubApi`. */
export function financeApi() {
  return {
    "GET /api/v1/finance/setup": { body: { setUp: true } },
    "GET /api/v1/finance/accounts": { body: accountList },
    "GET /api/v1/finance/categories": { body: categories },
    "GET /api/v1/finance/summary?period=MONTH": { body: summary },
    "GET /api/v1/finance/transactions?size=5": {
      body: transactionPage([transfer, expense, income]),
    },
    "GET /api/v1/finance/transactions?size=20": {
      body: transactionPage([transfer, expense, income]),
    },
  }
}
