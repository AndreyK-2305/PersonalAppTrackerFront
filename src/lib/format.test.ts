import { describe, expect, it } from "vitest"
import { formatDate, formatDateTime, formatMoney } from "./format"

// Intl usa espacios de no separación entre el símbolo y el número, y en "a. m.";
// NFKC los convierte en espacios normales para comparar.
const normalize = (text: string) => text.normalize("NFKC")

describe("formatMoney", () => {
  it("formatea COP sin decimales y con punto como separador de miles", () => {
    expect(normalize(formatMoney("150000.00"))).toBe("$ 150.000")
  })

  it("formatea montos negativos y cero", () => {
    expect(normalize(formatMoney("-2500"))).toBe("-$ 2.500")
    expect(normalize(formatMoney("0"))).toBe("$ 0")
  })

  it("no pierde precisión con montos que un double no puede representar", () => {
    // Como number, 12345678901234567 se redondea a 12345678901234568.
    expect(normalize(formatMoney("12345678901234567.40"))).toBe("$ 12.345.678.901.234.567")
  })

  it("conserva los decimales de otras monedas", () => {
    expect(normalize(formatMoney("1234.5", "USD"))).toBe("US$ 1.234,50")
  })
})

describe("formatDate", () => {
  it("muestra la fecha de negocio sin correrla de día por la zona horaria", () => {
    expect(formatDate("2026-11-06")).toBe("6 de nov de 2026")
    expect(formatDate("2026-01-01")).toBe("1 de ene de 2026")
  })
})

describe("formatDateTime", () => {
  it("muestra el instante en la zona horaria indicada", () => {
    expect(normalize(formatDateTime("2026-11-06T14:30:00Z", "America/Bogota"))).toBe(
      "6 de nov de 2026, 9:30 a. m.",
    )
  })
})
