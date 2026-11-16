import { Badge } from "@/components/ui/badge"
import { formatDate, formatMoney, formatMonth } from "@/lib/format"
import type { SavingsGoal } from "../api/goals"
import { formatPercent } from "../schemas"

/** Barra de avance. El porcentaje lo calcula el backend; aquí solo se limita a 100 para dibujar. */
export function GoalProgress({ goal }: { goal: SavingsGoal }) {
  const percent = Math.min(100, Number(goal.progressPercent))
  return (
    <div className="space-y-1.5">
      <div
        role="progressbar"
        aria-label={`Avance de ${goal.name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={goal.completed ? "h-full bg-emerald-600" : "h-full bg-primary"}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="flex justify-between gap-2 text-sm text-muted-foreground">
        <span>
          <span className="font-medium text-foreground tabular-nums">
            {formatMoney(goal.savedAmount, goal.currency)}
          </span>{" "}
          de <span className="tabular-nums">{formatMoney(goal.targetAmount, goal.currency)}</span>
        </span>
        <span className="tabular-nums">{formatPercent(goal.progressPercent)} %</span>
      </p>
    </div>
  )
}

/** Estado de la meta en una etiqueta: cumplida, vencida o fuera de alcance. */
export function GoalStatusBadge({ goal }: { goal: SavingsGoal }) {
  if (goal.completed) {
    return <Badge className="bg-emerald-600 text-white">Cumplida</Badge>
  }
  if (goal.overdue) {
    return <Badge variant="destructive">Vencida</Badge>
  }
  if (!goal.reachable) {
    return <Badge variant="secondary">No alcanza</Badge>
  }
  return null
}

/** Una frase con lo que hay que hacer para cumplir la meta según su plan. */
export function GoalProjectionText({ goal }: { goal: SavingsGoal }) {
  if (goal.completed) {
    return <>¡Llegaste al objetivo!</>
  }
  if (goal.plan === "TARGET_DATE") {
    const monthly = formatMoney(goal.recommendedMonthlyAmount ?? "0", goal.currency)
    if (goal.overdue) {
      return <>La fecha ya pasó: faltan {formatMoney(goal.remainingAmount, goal.currency)}.</>
    }
    if (goal.recommendedMonthlyAmount === "0.00") {
      return <>Con la rentabilidad, lo ahorrado alcanza solo para {formatDate(goal.targetDate!)}.</>
    }
    return (
      <>
        Aparta <strong className="tabular-nums">{monthly}</strong> al mes para llegar el{" "}
        {formatDate(goal.targetDate!)}.
      </>
    )
  }
  const monthly = formatMoney(goal.monthlyAmount ?? "0", goal.currency)
  if (!goal.reachable || !goal.estimatedDate) {
    return <>Con {monthly} al mes tardarías más de 100 años: sube el aporte.</>
  }
  return (
    <>
      Apartando {monthly} al mes llegas en <strong>{formatMonth(goal.estimatedDate)}</strong>.
    </>
  )
}
