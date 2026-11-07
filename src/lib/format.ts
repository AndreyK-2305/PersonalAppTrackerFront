/**
 * Formato de montos y fechas para la interfaz (es-CO). Los montos llegan de la API como cadenas
 * decimales y nunca se convierten a `number` para calcular (ADR-0006).
 */
const LOCALE = "es-CO"
const DEFAULT_CURRENCY = "COP"

const currencyFormatters = new Map<string, Intl.NumberFormat>()

function currencyFormatter(currency: string): Intl.NumberFormat {
  let formatter = currencyFormatters.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      // En COP no se usan centavos en la práctica, aunque ISO 4217 defina dos decimales.
      ...(currency === "COP" && { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    })
    currencyFormatters.set(currency, formatter)
  }
  return formatter
}

/** "150000.00" → "$ 150.000". Intl formatea la cadena sin pasar por un `double`. */
export function formatMoney(amount: string, currency: string = DEFAULT_CURRENCY): string {
  return currencyFormatter(currency).format(amount as Intl.StringNumericLiteral)
}

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  // Una fecha de negocio no tiene zona horaria: se interpreta en UTC para que no cambie de día.
  timeZone: "UTC",
})

/** Fecha de negocio "2026-11-06" → "6 de nov de 2026". */
export function formatDate(isoDate: string): string {
  return dateFormatter.format(businessDate(isoDate))
}

/** Rango de fechas de negocio → "2 a 8 de nov de 2026"; si es un solo día, la fecha. */
export function formatDateRange(start: string, end: string): string {
  return dateFormatter.formatRange(businessDate(start), businessDate(end))
}

const monthFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

/** Mes de una fecha de negocio → "noviembre de 2026". */
export function formatMonth(isoDate: string): string {
  return monthFormatter.format(businessDate(isoDate))
}

const shortMonthFormatter = new Intl.DateTimeFormat(LOCALE, { month: "short", timeZone: "UTC" })

/** Mes abreviado sin punto, para ejes de gráficas → "nov". */
export function formatShortMonth(isoDate: string): string {
  return shortMonthFormatter.format(businessDate(isoDate)).replace(".", "")
}

const shortDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
})

/** Día y mes abreviado, para ejes de gráficas → "2 de nov". */
export function formatShortDate(isoDate: string): string {
  return shortDateFormatter.format(businessDate(isoDate))
}

function businessDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`)
}

/** Instante → "6 de nov de 2026, 9:30 a. m." en la zona indicada (por defecto, la del navegador). */
export function formatDateTime(instant: string | number | Date, timeZone?: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(instant))
}
