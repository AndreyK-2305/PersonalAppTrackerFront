import { formatDate, formatMoney } from "@/lib/format"
import { compareDecimal } from "@/lib/money"
import type { PlanSummary as PlanSummaryData } from "../api/goals"

/**
 * Resumen de un plan de pagos: cuánto se financia, la cuota de cada mes y lo que cuesta en total.
 * Los valores vienen calculados del backend (ADR-0018).
 */
export function PlanSummary({ summary, currency }: { summary: PlanSummaryData; currency: string }) {
  const hasExtras = compareDecimal(summary.extrasPerInstallment, "0") > 0
  const money = (amount: string) => formatMoney(amount, currency)

  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-3" aria-label="Resumen del plan de pagos">
      <Stat label="Cuota mensual" value={money(summary.installmentAmount)} emphasis />
      <Stat label="Monto financiado" value={money(summary.financedAmount)} />
      <Stat label="Total de intereses" value={money(summary.totalInterest)} />
      {hasExtras && (
        <>
          <Stat label="Cuota calculada" value={money(summary.recommendedInstallment)} />
          <Stat
            label="Seguros y otros"
            value={`${money(summary.extrasPerInstallment)} por cuota`}
            detail={`${money(summary.totalExtras)} en total`}
          />
        </>
      )}
      <Stat label="Costo total" value={money(summary.totalCost)} />
      <Stat
        label="Última cuota"
        value={formatDate(summary.lastDueDate)}
        detail={`${summary.scheduledInstallments} cuotas`}
      />
    </dl>
  )
}

function Stat({
  label,
  value,
  detail,
  emphasis = false,
}: {
  label: string
  value: string
  detail?: string
  emphasis?: boolean
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={emphasis ? "text-lg font-semibold tabular-nums" : "font-medium tabular-nums"}>
        {value}
      </dd>
      {detail && <dd className="text-xs text-muted-foreground">{detail}</dd>}
    </div>
  )
}
