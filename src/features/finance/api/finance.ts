import { queryOptions } from "@tanstack/react-query"
import { apiFetch } from "@/lib/http"
import type { components } from "@/types/api"

type Schemas = components["schemas"]

export type FinanceStatus = Schemas["FinanceStatusResponse"]
export type Account = Schemas["AccountResponse"]
export type AccountList = Schemas["AccountListResponse"]
export type AccountRequest = Schemas["AccountRequest"]
export type AccountKind = Account["kind"]
export type Category = Schemas["CategoryResponse"]
export type CategoryKind = Category["kind"]
export type CreateCategoryRequest = Schemas["CreateCategoryRequest"]
export type Transaction = Schemas["TransactionResponse"]
export type TransactionRequest = Schemas["TransactionRequest"]
export type TransactionType = Transaction["type"]
export type PaymentChannel = NonNullable<Transaction["channel"]>
export type TransactionPage = Schemas["PageResponseTransactionResponse"]
export type Summary = Schemas["SummaryResponse"]
export type PeriodKind = Summary["kind"]

export type TransactionSort = "date,desc" | "date,asc" | "amount,desc" | "amount,asc"

/** Filtros del listado de movimientos; los ausentes no se envían. */
export type TransactionFilters = {
  from?: string
  to?: string
  accountId?: string
  categoryId?: string
  type?: TransactionType
  q?: string
  /** Solo ingresos y gastos sin categoría ("Por clasificar"). */
  uncategorized?: boolean
  sort?: TransactionSort
  page?: number
  size?: number
}

const BASE = "/api/v1/finance"

/** Claves de TanStack Query. Toda mutación de finanzas invalida `financeKeys.all`. */
export const financeKeys = {
  all: ["finance"] as const,
  setup: () => [...financeKeys.all, "setup"] as const,
  accounts: () => [...financeKeys.all, "accounts"] as const,
  categories: () => [...financeKeys.all, "categories"] as const,
  transactions: (filters: TransactionFilters) =>
    [...financeKeys.all, "transactions", filters] as const,
  summary: (period: PeriodKind, date?: string) =>
    [...financeKeys.all, "summary", period, date ?? "today"] as const,
}

export const financeStatusQueryOptions = queryOptions({
  queryKey: financeKeys.setup(),
  queryFn: () => apiFetch<FinanceStatus>(`${BASE}/setup`),
  staleTime: Infinity,
})

export const accountsQueryOptions = queryOptions({
  queryKey: financeKeys.accounts(),
  queryFn: () => apiFetch<AccountList>(`${BASE}/accounts`),
})

export const categoriesQueryOptions = queryOptions({
  queryKey: financeKeys.categories(),
  queryFn: () => apiFetch<Category[]>(`${BASE}/categories`),
})

export function transactionsQueryOptions(filters: TransactionFilters) {
  return queryOptions({
    queryKey: financeKeys.transactions(filters),
    queryFn: () => apiFetch<TransactionPage>(`${BASE}/transactions${queryString(filters)}`),
  })
}

/** Sin `date`, el backend usa hoy en la zona horaria del perfil. */
export function summaryQueryOptions(period: PeriodKind, date?: string) {
  return queryOptions({
    queryKey: financeKeys.summary(period, date),
    queryFn: () => apiFetch<Summary>(`${BASE}/summary${queryString({ period, date })}`),
  })
}

export function setUpFinance(withSuggestedCategories: boolean): Promise<FinanceStatus> {
  return apiFetch(`${BASE}/setup`, { method: "POST", json: { withSuggestedCategories } })
}

export function createAccount(request: AccountRequest): Promise<Account> {
  return apiFetch(`${BASE}/accounts`, { method: "POST", json: request })
}

export function updateAccount({
  id,
  ...request
}: AccountRequest & { id: string }): Promise<Account> {
  return apiFetch(`${BASE}/accounts/${id}`, { method: "PUT", json: request })
}

export function archiveAccount(id: string): Promise<Account> {
  return apiFetch(`${BASE}/accounts/${id}/archive`, { method: "POST" })
}

export function reactivateAccount(id: string): Promise<Account> {
  return apiFetch(`${BASE}/accounts/${id}/reactivate`, { method: "POST" })
}

export function deleteAccount(id: string): Promise<void> {
  return apiFetch(`${BASE}/accounts/${id}`, { method: "DELETE" })
}

export function createCategory(request: CreateCategoryRequest): Promise<Category> {
  return apiFetch(`${BASE}/categories`, { method: "POST", json: request })
}

export function renameCategory({ id, name }: { id: string; name: string }): Promise<void> {
  return apiFetch(`${BASE}/categories/${id}`, { method: "PATCH", json: { name } })
}

export function archiveCategory(id: string): Promise<void> {
  return apiFetch(`${BASE}/categories/${id}/archive`, { method: "POST" })
}

export function reactivateCategory(id: string): Promise<void> {
  return apiFetch(`${BASE}/categories/${id}/reactivate`, { method: "POST" })
}

export function deleteCategory(id: string): Promise<void> {
  return apiFetch(`${BASE}/categories/${id}`, { method: "DELETE" })
}

export function recordTransaction(request: TransactionRequest): Promise<Transaction> {
  return apiFetch(`${BASE}/transactions`, { method: "POST", json: request })
}

export function updateTransaction({
  id,
  ...request
}: TransactionRequest & { id: string }): Promise<Transaction> {
  return apiFetch(`${BASE}/transactions/${id}`, { method: "PUT", json: request })
}

export function deleteTransaction(id: string): Promise<void> {
  return apiFetch(`${BASE}/transactions/${id}`, { method: "DELETE" })
}

/** Arma la cadena de consulta con los valores presentes, en un orden estable. */
function queryString(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== false) {
      search.set(key, String(value))
    }
  }
  const text = search.toString()
  return text ? `?${text}` : ""
}
