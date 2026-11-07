/**
 * Montos como texto (ADR-0006). La API usa cadenas decimales con punto ("150000.50") y la interfaz
 * usa el formato es-CO ("150.000,50"). Estas funciones convierten entre ambos sin pasar por
 * `number`, para no perder precisión ni confundir separadores (el clásico error de ×1000).
 */

const MAX_INTEGER_DIGITS = 17

// "150000" o "150.000.000": el punto solo separa grupos de miles completos.
const INTEGER_PART = /^(\d+|\d{1,3}(\.\d{3})+)$/
const FRACTION_PART = /^\d{1,2}$/

/**
 * Convierte lo que escribe el usuario (formato es-CO) en la cadena decimal de la API. Acepta
 * "150000", "150.000", "150.000,5" y "$ 150.000". Devuelve `null` si el texto no es un monto o si
 * es ambiguo: "150.5" no se acepta porque en es-CO el punto separa miles.
 */
export function parseMoneyInput(text: string, { allowNegative = false } = {}): string | null {
  let value = text.replace(/[\s$]/g, "")
  const negative = value.startsWith("-")
  if (negative) {
    if (!allowNegative) {
      return null
    }
    value = value.slice(1)
  }
  const [integerPart, fraction, ...rest] = value.split(",")
  if (rest.length > 0 || !INTEGER_PART.test(integerPart)) {
    return null
  }
  if (fraction !== undefined && !FRACTION_PART.test(fraction)) {
    return null
  }
  const digits = integerPart.replaceAll(".", "").replace(/^0+(?=\d)/, "")
  if (digits.length > MAX_INTEGER_DIGITS) {
    return null
  }
  const decimal = fraction === undefined ? digits : `${digits}.${fraction}`
  return negative && toCents(decimal) !== 0n ? `-${decimal}` : decimal
}

/** Cadena decimal de la API → texto es-CO para un campo editable: "150000.50" → "150.000,50". */
export function formatMoneyInput(decimal: string): string {
  const negative = decimal.startsWith("-")
  const [integerPart, fraction = ""] = decimal.replace("-", "").split(".")
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  const cents = /^0*$/.test(fraction) ? "" : `,${fraction.padEnd(2, "0")}`
  return `${negative ? "-" : ""}${grouped}${cents}`
}

/** Compara dos cadenas decimales de forma exacta: -1, 0 o 1. */
export function compareDecimal(a: string, b: string): number {
  const difference = toCents(a) - toCents(b)
  return difference < 0n ? -1 : difference > 0n ? 1 : 0
}

export function isNegativeDecimal(decimal: string): boolean {
  return toCents(decimal) < 0n
}

/**
 * Valor aproximado para dibujar gráficas. Solo sirve para eso: los montos que se muestran como
 * texto siempre salen de la cadena original.
 */
export function chartValue(decimal: string): number {
  return Number(decimal)
}

function toCents(decimal: string): bigint {
  const negative = decimal.startsWith("-")
  const [integerPart, fraction = ""] = decimal.replace("-", "").split(".")
  const cents = BigInt(integerPart || "0") * 100n + BigInt(fraction.padEnd(2, "0").slice(0, 2))
  return negative ? -cents : cents
}
