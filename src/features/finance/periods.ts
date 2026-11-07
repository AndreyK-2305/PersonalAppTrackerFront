import { formatDate, formatDateRange, formatMonth } from "@/lib/format"
import type { PeriodKind } from "./api/finance"

/** Nombre del periodo: "noviembre de 2026", "2 a 8 de nov de 2026" o "6 de nov de 2026". */
export function periodLabel(kind: PeriodKind, start: string, end: string): string {
  switch (kind) {
    case "MONTH":
      return formatMonth(start)
    case "WEEK":
      return formatDateRange(start, end)
    case "DAY":
      return formatDate(start)
  }
}

/** Valores del parámetro `periodo` de la URL, en español. */
export const PERIOD_PARAMS: Record<PeriodKind, string> = {
  DAY: "dia",
  WEEK: "semana",
  MONTH: "mes",
}

export function periodFromParam(value: string | null): PeriodKind {
  const entry = Object.entries(PERIOD_PARAMS).find(([, param]) => param === value)
  return (entry?.[0] as PeriodKind | undefined) ?? "MONTH"
}
