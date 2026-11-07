import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { addDays } from "@/lib/dates"
import type { PeriodKind } from "../api/finance"
import { PERIOD_LABELS } from "../labels"
import { periodLabel } from "../periods"

interface PeriodSelectorProps {
  kind: PeriodKind
  start: string
  end: string
  today: string
  onKindChange: (kind: PeriodKind) => void
  /** Fecha dentro del periodo elegido; `undefined` vuelve al periodo de hoy. */
  onDateChange: (date: string | undefined) => void
}

/** Elige día, semana o mes y navega entre periodos. Las semanas van de lunes a domingo. */
export function PeriodSelector({
  kind,
  start,
  end,
  today,
  onKindChange,
  onDateChange,
}: PeriodSelectorProps) {
  const includesToday = start <= today && today <= end

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Tabs value={kind} onValueChange={(value) => onKindChange(value as PeriodKind)}>
        <TabsList>
          {(["DAY", "WEEK", "MONTH"] as const).map((option) => (
            <TabsTrigger key={option} value={option}>
              {PERIOD_LABELS[option]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Periodo anterior"
          onClick={() => onDateChange(addDays(start, -1))}
        >
          <ChevronLeftIcon aria-hidden />
        </Button>
        <p
          className="min-w-40 text-center text-sm font-medium first-letter:uppercase"
          aria-live="polite"
        >
          {periodLabel(kind, start, end)}
        </p>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Periodo siguiente"
          onClick={() => onDateChange(addDays(end, 1))}
          disabled={end >= today}
        >
          <ChevronRightIcon aria-hidden />
        </Button>
        {!includesToday && (
          <Button variant="ghost" size="sm" onClick={() => onDateChange(undefined)}>
            Hoy
          </Button>
        )}
      </div>
    </div>
  )
}
