import { Badge } from "@/components/ui/badge"
import { formatDate, formatMoney } from "@/lib/format"
import { compareDecimal, isNegativeDecimal } from "@/lib/money"
import type { CreditProgress as CreditProgressData, CreditStatus } from "../api/goals"
import { formatPercent } from "../schemas"

/** Estado del crédito en una etiqueta. Es informativo: el simulador no cobra mora. */
export function CreditStatusBadge({ status }: { status: CreditStatus }) {
  switch (status) {
    case "PAID_OFF":
      return <Badge className="bg-emerald-600 text-white">Pagado</Badge>
    case "OVERDUE":
      return <Badge variant="destructive">Cuota vencida</Badge>
    default:
      return <Badge variant="secondary">Al día</Badge>
  }
}

/**
 * Cómo va el crédito: cuotas pagadas, saldo, próxima cuota y la diferencia de intereses frente al
 * plan original. Todo viene calculado del backend (ADR-0018).
 */
export function CreditProgress({
  progress,
  currency,
  originalRatePercent,
}: {
  progress: CreditProgressData
  currency: string
  originalRatePercent: string
}) {
  const total = progress.paidInstallments + progress.pendingInstallments
  // Solo para dibujar la barra; los números que se leen vienen del backend.
  const percent = total === 0 ? 100 : Math.round((progress.paidInstallments / total) * 100)
  const next = progress.nextInstallment
  const rateChanged = progress.currentRatePercent !== originalRatePercent

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div
          role="progressbar"
          aria-label="Cuotas pagadas"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={progress.paidInstallments}
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className={
              progress.status === "PAID_OFF" ? "h-full bg-emerald-600" : "h-full bg-primary"
            }
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{progress.paidInstallments}</span> de{" "}
          {total} cuotas pagadas
        </p>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Saldo</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {formatMoney(progress.balance, currency)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Próxima cuota</dt>
          {next ? (
            <>
              <dd className="font-medium tabular-nums">{formatMoney(next.payment, currency)}</dd>
              <dd className="text-xs text-muted-foreground">
                Cuota {next.number}, vence el {formatDate(next.dueDate)}
              </dd>
            </>
          ) : (
            <dd className="font-medium">No quedan cuotas</dd>
          )}
        </div>
        <div>
          <dt className="text-muted-foreground">Pagado hasta ahora</dt>
          <dd className="font-medium tabular-nums">{formatMoney(progress.paidSoFar, currency)}</dd>
          <dd className="text-xs text-muted-foreground">
            {formatMoney(progress.paidInterest, currency)} en intereses
          </dd>
        </div>
      </dl>

      <InterestDifference progress={progress} currency={currency} />
      {rateChanged && (
        <p className="text-sm text-muted-foreground">
          Tasa vigente: {formatPercent(progress.currentRatePercent)} % EA (empezó en{" "}
          {formatPercent(originalRatePercent)} %).
        </p>
      )}
    </div>
  )
}

/** Ahorro (o costo adicional) en intereses frente al plan original; nada si no hay diferencia. */
function InterestDifference({
  progress,
  currency,
}: {
  progress: CreditProgressData
  currency: string
}) {
  const difference = compareDecimal(progress.interestSavings, "0")
  if (difference === 0) {
    return null
  }
  const original = formatMoney(progress.originalTotalInterest, currency)
  if (isNegativeDecimal(progress.interestSavings)) {
    const extra = formatMoney(progress.interestSavings.replace("-", ""), currency)
    return (
      <p className="text-sm">
        Pagas <strong className="tabular-nums">{extra}</strong> más en intereses que en el plan
        original ({original}).
      </p>
    )
  }
  return (
    <p className="text-sm">
      Ahorras{" "}
      <strong className="text-emerald-700 tabular-nums dark:text-emerald-400">
        {formatMoney(progress.interestSavings, currency)}
      </strong>{" "}
      en intereses frente al plan original ({original}).
    </p>
  )
}
