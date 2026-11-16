import type { SavingsGoal } from "@/features/goals/api/goals"

/** Metas de ahorro de ejemplo para las pruebas de Metas. */
export const switchGoal: SavingsGoal = {
  id: "goal-1",
  name: "Nintendo Switch",
  targetAmount: "1200000.00",
  currency: "COP",
  plan: "TARGET_DATE",
  targetDate: "2027-11-15",
  savedAmount: "200000.00",
  remainingAmount: "1000000.00",
  progressPercent: "16.6",
  completed: false,
  overdue: false,
  monthsRemaining: 10,
  recommendedMonthlyAmount: "100000.00",
  reachable: true,
  contributions: [
    { id: "c-1", date: "2026-11-10", amount: "200000.00", createdAt: "2026-11-10T15:00:00Z" },
  ],
  rateChanges: [],
  createdAt: "2026-11-01T15:00:00Z",
  updatedAt: "2026-11-10T15:00:00Z",
}

export const bikeGoal: SavingsGoal = {
  ...switchGoal,
  id: "goal-2",
  name: "Bicicleta",
  plan: "MONTHLY_AMOUNT",
  targetDate: undefined,
  monthlyAmount: "300000.00",
  recommendedMonthlyAmount: undefined,
  estimatedDate: "2027-03-15",
  savedAmount: "900000.00",
  targetAmount: "900000.00",
  remainingAmount: "0.00",
  progressPercent: "100.0",
  completed: true,
}
