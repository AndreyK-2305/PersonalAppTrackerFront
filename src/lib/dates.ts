/**
 * Fechas de negocio ("AAAA-MM-DD"), que no tienen zona horaria (ADR-0006). "Hoy" depende de la
 * zona horaria del perfil, no de la del navegador.
 */

/** Fecha de hoy en la zona horaria indicada, por ejemplo la del perfil. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value
  return `${part("year")}-${part("month")}-${part("day")}`
}

/** Suma (o resta) días a una fecha de negocio sin pasar por la zona horaria local. */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
