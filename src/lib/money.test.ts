import { describe, expect, it } from "vitest"
import { compareDecimal, formatMoneyInput, isNegativeDecimal, parseMoneyInput } from "./money"

describe("parseMoneyInput", () => {
  it.each([
    ["150000", "150000"],
    ["150.000", "150000"],
    ["1.234.567", "1234567"],
    ["150.000,5", "150000.5"],
    ["150000,50", "150000.50"],
    ["0,05", "0.05"],
    ["$ 150.000", "150000"],
    [" 1.500 ", "1500"],
    ["007", "7"],
  ])("convierte %s en %s", (text, expected) => {
    expect(parseMoneyInput(text)).toBe(expected)
  })

  it.each([
    ["150.5", "el punto solo separa miles en es-CO"],
    ["1.50", "grupo de miles incompleto"],
    ["1500.000", "primer grupo de más de tres dígitos"],
    ["150,555", "más de dos decimales"],
    ["1,5,0", "dos comas"],
    [",5", "sin parte entera"],
    ["", "vacío"],
    ["abc", "no es un número"],
    ["123456789012345678", "más de 17 dígitos enteros"],
  ])("rechaza %s (%s)", (text) => {
    expect(parseMoneyInput(text)).toBeNull()
  })

  it("acepta negativos solo si se permiten", () => {
    expect(parseMoneyInput("-20.000")).toBeNull()
    expect(parseMoneyInput("-20.000", { allowNegative: true })).toBe("-20000")
    expect(parseMoneyInput("-0", { allowNegative: true })).toBe("0")
  })
})

describe("formatMoneyInput", () => {
  it.each([
    ["150000.00", "150.000"],
    ["150000.50", "150.000,50"],
    ["150000.05", "150.000,05"],
    ["999", "999"],
    ["-20000.00", "-20.000"],
    ["12345678901234567.40", "12.345.678.901.234.567,40"],
  ])("muestra %s como %s", (decimal, expected) => {
    expect(formatMoneyInput(decimal)).toBe(expected)
  })

  it("lo que muestra se vuelve a leer igual", () => {
    expect(parseMoneyInput(formatMoneyInput("150000.50"))).toBe("150000.50")
  })
})

describe("compareDecimal", () => {
  it("compara de forma exacta, sin pasar por number", () => {
    expect(compareDecimal("12345678901234567.40", "12345678901234567.39")).toBe(1)
    expect(compareDecimal("100.5", "100.50")).toBe(0)
    expect(compareDecimal("-1", "0")).toBe(-1)
  })

  it("detecta montos negativos", () => {
    expect(isNegativeDecimal("-0.01")).toBe(true)
    expect(isNegativeDecimal("0.00")).toBe(false)
  })
})
