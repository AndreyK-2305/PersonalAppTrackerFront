import { queryOptions, skipToken } from "@tanstack/react-query"
import { apiFetch } from "@/lib/http"
import type { components } from "@/types/api"

type Schemas = components["schemas"]

export type SavingsGoal = Schemas["SavingsGoalResponse"]
export type SavingsGoalRequest = Schemas["SavingsGoalRequest"]
export type SavingsPlanKind = SavingsGoal["plan"]
export type Contribution = Schemas["ContributionResponse"]
export type RateChange = Schemas["RateChangeResponse"]

export type FinancedGoal = Schemas["FinancedGoalResponse"]
export type FinancedGoalDetail = Schemas["FinancedGoalDetailResponse"]
export type FinancedGoalRequest = Schemas["FinancedGoalRequest"]
export type FinancingTerms = Schemas["TermsRequest"]
export type FinancingSimulation = Schemas["SimulationResponse"]
export type PlanSummary = Schemas["PlanSummaryResponse"]
export type Installment = Schemas["InstallmentResponse"]
export type CreditProgress = Schemas["CreditProgressResponse"]
export type CreditStatus = CreditProgress["status"]
export type CreditRecord = Schemas["CreditRecordResponse"]
export type PrepaymentMode = NonNullable<CreditRecord["mode"]>

const BASE = "/api/v1/goals/savings"
const FINANCED = "/api/v1/goals/financed"

/** Claves de TanStack Query. Toda mutación de metas invalida `goalKeys.all`. */
export const goalKeys = {
  all: ["goals"] as const,
  savings: () => [...goalKeys.all, "savings"] as const,
  savingsGoal: (id: string) => [...goalKeys.savings(), id] as const,
  financed: () => [...goalKeys.all, "financed"] as const,
  financedGoal: (id: string) => [...goalKeys.financed(), id] as const,
  simulation: (termsKey: string) => [...goalKeys.all, "simulation", termsKey] as const,
}

export const savingsGoalsQueryOptions = queryOptions({
  queryKey: goalKeys.savings(),
  queryFn: () => apiFetch<SavingsGoal[]>(BASE),
})

export function savingsGoalQueryOptions(id: string) {
  return queryOptions({
    queryKey: goalKeys.savingsGoal(id),
    queryFn: () => apiFetch<SavingsGoal>(`${BASE}/${id}`),
  })
}

export function createSavingsGoal(request: SavingsGoalRequest): Promise<SavingsGoal> {
  return apiFetch(BASE, { method: "POST", json: request })
}

export function updateSavingsGoal({
  id,
  ...request
}: SavingsGoalRequest & { id: string }): Promise<SavingsGoal> {
  return apiFetch(`${BASE}/${id}`, { method: "PUT", json: request })
}

export function deleteSavingsGoal(id: string): Promise<void> {
  return apiFetch(`${BASE}/${id}`, { method: "DELETE" })
}

export function addContribution({
  goalId,
  date,
  amount,
}: {
  goalId: string
  date: string
  amount: string
}): Promise<SavingsGoal> {
  return apiFetch(`${BASE}/${goalId}/contributions`, { method: "POST", json: { date, amount } })
}

export function removeContribution({
  goalId,
  contributionId,
}: {
  goalId: string
  contributionId: string
}): Promise<SavingsGoal> {
  return apiFetch(`${BASE}/${goalId}/contributions/${contributionId}`, { method: "DELETE" })
}

/** La tasa EA rige desde mañana; "0" apaga la rentabilidad (ADR-0018). */
export function adjustSavingsRate({
  goalId,
  ratePercent,
}: {
  goalId: string
  ratePercent: string
}): Promise<SavingsGoal> {
  return apiFetch(`${BASE}/${goalId}/rate`, { method: "PUT", json: { ratePercent } })
}

export const financedGoalsQueryOptions = queryOptions({
  queryKey: goalKeys.financed(),
  queryFn: () => apiFetch<FinancedGoal[]>(FINANCED),
})

export function financedGoalQueryOptions(id: string) {
  return queryOptions({
    queryKey: goalKeys.financedGoal(id),
    queryFn: () => apiFetch<FinancedGoalDetail>(`${FINANCED}/${id}`),
  })
}

/**
 * Vista previa del plan de pagos: el backend lo calcula sin guardar nada (ADR-0018). Con `terms`
 * nulo la consulta no se ejecuta. `termsKey` es el texto estable de esas condiciones.
 */
export function simulationQueryOptions(termsKey: string, terms: FinancingTerms | null) {
  return queryOptions({
    queryKey: goalKeys.simulation(termsKey),
    queryFn: terms
      ? () =>
          apiFetch<FinancingSimulation>(`${FINANCED}/simulations`, { method: "POST", json: terms })
      : skipToken,
    staleTime: Infinity,
    retry: false,
  })
}

export function createFinancedGoal(request: FinancedGoalRequest): Promise<FinancedGoalDetail> {
  return apiFetch(FINANCED, { method: "POST", json: request })
}

export function updateFinancedGoal({
  id,
  ...request
}: FinancedGoalRequest & { id: string }): Promise<FinancedGoalDetail> {
  return apiFetch(`${FINANCED}/${id}`, { method: "PUT", json: request })
}

export function deleteFinancedGoal(id: string): Promise<void> {
  return apiFetch(`${FINANCED}/${id}`, { method: "DELETE" })
}

// --- Pagos, abonos y ajustes de tasa de una meta financiada (ADR-0018) ---
// Cada operación responde con la meta completa y su plan recalculado.

/** Paga la siguiente cuota pendiente; lo que supere su valor es un abono que se aplica con `excessMode`. */
export function payInstallment({
  goalId,
  ...request
}: {
  goalId: string
  date: string
  amount: string
  excessMode?: PrepaymentMode
}): Promise<FinancedGoalDetail> {
  return apiFetch(`${FINANCED}/${goalId}/payments`, { method: "POST", json: request })
}

/** Marca como pagadas todas las cuotas pendientes hasta `installmentNumber`, por su valor programado. */
export function payThroughInstallment({
  goalId,
  installmentNumber,
}: {
  goalId: string
  installmentNumber: number
}): Promise<FinancedGoalDetail> {
  return apiFetch(`${FINANCED}/${goalId}/payments/through`, {
    method: "POST",
    json: { installmentNumber },
  })
}

/** Abono extraordinario a capital. */
export function prepayCredit({
  goalId,
  ...request
}: {
  goalId: string
  date: string
  amount: string
  mode: PrepaymentMode
}): Promise<FinancedGoalDetail> {
  return apiFetch(`${FINANCED}/${goalId}/prepayments`, { method: "POST", json: request })
}

/** Ajuste de tasa: rige desde la siguiente cuota. Sin `actualInstallment` se conservan los seguros y otros. */
export function adjustCreditRate({
  goalId,
  ...request
}: {
  goalId: string
  ratePercent: string
  actualInstallment?: string
}): Promise<FinancedGoalDetail> {
  return apiFetch(`${FINANCED}/${goalId}/rate-adjustments`, { method: "POST", json: request })
}

/** Deshace un registro; el backend solo admite el último. */
export function undoCreditRecord({
  goalId,
  recordId,
}: {
  goalId: string
  recordId: string
}): Promise<FinancedGoalDetail> {
  return apiFetch(`${FINANCED}/${goalId}/records/${recordId}`, { method: "DELETE" })
}
