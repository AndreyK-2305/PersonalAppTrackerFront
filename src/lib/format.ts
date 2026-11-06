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
  return dateFormatter.format(new Date(`${isoDate}T00:00:00Z`))
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
