import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { useWatch, type Control } from "react-hook-form"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { simulationQueryOptions, type FinancingTerms } from "../api/goals"
import { toFinancingTerms, type FinancedGoalFormValues } from "../schemas"
import { PlanSummary } from "./PlanSummary"

const DEBOUNCE_MS = 400

/**
 * Vista previa del plan de pagos mientras se llena el formulario. El cálculo lo hace el backend
 * (ADR-0018): aquí solo se espera a que el usuario deje de escribir y se le pregunta.
 */
export function FinancingPreview({ control }: { control: Control<FinancedGoalFormValues> }) {
  const values = useWatch({ control })
  const terms = toFinancingTerms(values)
  // La clave de texto es estable aunque `terms` sea un objeto nuevo en cada render.
  const termsKey = useDebouncedValue(terms ? JSON.stringify(terms) : "", DEBOUNCE_MS)
  const debouncedTerms = useMemo<FinancingTerms | null>(
    () => (termsKey ? JSON.parse(termsKey) : null),
    [termsKey],
  )
  const simulation = useQuery({
    ...simulationQueryOptions(termsKey, debouncedTerms),
    placeholderData: keepPreviousData,
  })

  return (
    <section
      aria-label="Vista previa del plan"
      className="rounded-lg border bg-muted/40 p-3 text-sm"
    >
      {terms === null ? (
        <p className="text-muted-foreground">
          Completa el valor, la tasa, las cuotas y la fecha para ver la cuota.
        </p>
      ) : simulation.isError ? (
        <p role="alert" className="text-destructive">
          {simulation.error.message}
        </p>
      ) : simulation.data ? (
        <PlanSummary summary={simulation.data.summary} currency={simulation.data.currency} />
      ) : (
        <p className="text-muted-foreground">Calculando la cuota…</p>
      )}
    </section>
  )
}
