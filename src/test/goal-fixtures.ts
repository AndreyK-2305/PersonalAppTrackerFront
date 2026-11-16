import type {
  FinancedGoal,
  FinancedGoalDetail,
  FinancingSimulation,
  SavingsGoal,
} from "@/features/goals/api/goals"

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

/** $60.000.000 al 18 % EA en 48 cuotas: el ejemplo del ADR-0018. */
export const carGoal: FinancedGoal = {
  id: "fin-1",
  name: "Carro",
  assetValue: "60000000.00",
  downPayment: "0.00",
  currency: "COP",
  ratePercent: "18",
  installments: 48,
  firstDueDate: "2027-02-15",
  summary: {
    financedAmount: "60000000.00",
    recommendedInstallment: "1720956.00",
    installmentAmount: "1720956.00",
    extrasPerInstallment: "0.00",
    totalInterest: "22605857.34",
    totalExtras: "0.00",
    totalPaid: "82605857.34",
    totalCost: "82605857.34",
    lastDueDate: "2031-01-15",
    scheduledInstallments: 48,
  },
  createdAt: "2026-11-16T15:00:00Z",
  updatedAt: "2026-11-16T15:00:00Z",
}

/** La tabla trae solo tres filas (la primera, la segunda y la última) para que las pruebas sean cortas. */
export const carDetail: FinancedGoalDetail = {
  goal: carGoal,
  schedule: [
    {
      number: 1,
      dueDate: "2027-02-15",
      payment: "1720956.00",
      interest: "833305.82",
      principal: "887650.18",
      extras: "0.00",
      balance: "59112349.82",
    },
    {
      number: 2,
      dueDate: "2027-03-15",
      payment: "1720956.00",
      interest: "820977.75",
      principal: "899978.25",
      extras: "0.00",
      balance: "58212371.57",
    },
    {
      number: 48,
      dueDate: "2031-01-15",
      payment: "1720925.34",
      interest: "23573.55",
      principal: "1697351.79",
      extras: "0.00",
      balance: "0.00",
    },
  ],
}

export const carSimulation: FinancingSimulation = {
  currency: "COP",
  summary: carGoal.summary,
  schedule: carDetail.schedule,
}
