import { queryOptions } from "@tanstack/react-query"
import { apiFetch } from "@/lib/http"
import type { components } from "@/types/api"

type Schemas = components["schemas"]

export type SavingsGoal = Schemas["SavingsGoalResponse"]
export type SavingsGoalRequest = Schemas["SavingsGoalRequest"]
export type SavingsPlanKind = SavingsGoal["plan"]
export type Contribution = Schemas["ContributionResponse"]
export type RateChange = Schemas["RateChangeResponse"]

const BASE = "/api/v1/goals/savings"

/** Claves de TanStack Query. Toda mutación de metas invalida `goalKeys.all`. */
export const goalKeys = {
  all: ["goals"] as const,
  savings: () => [...goalKeys.all, "savings"] as const,
  savingsGoal: (id: string) => [...goalKeys.savings(), id] as const,
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
