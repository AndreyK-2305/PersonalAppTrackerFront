import { describe, expect, it } from "vitest"
import { cardAccount, income } from "@/test/finance-fixtures"
import {
  accountFormDefaults,
  accountFormSchema,
  toAccountRequest,
  toTransactionRequest,
  transactionFormDefaults,
} from "./schemas"

describe("formulario de productos", () => {
  it("envía solo los campos que aplican al tipo", () => {
    const values = accountFormSchema.parse({
      ...accountFormDefaults(),
      kind: "CREDIT_CARD",
      name: " Visa ",
      institution: "Bancolombia",
      lastFourDigits: "",
      openingBalance: "999",
      creditLimit: "3.000.000",
      initialDebt: "",
    })

    expect(toAccountRequest(values)).toEqual({
      kind: "CREDIT_CARD",
      name: "Visa",
      institution: "Bancolombia",
      creditLimit: "3000000",
    })
  })

  it("acepta saldos negativos solo en cuentas de depósito", () => {
    const base = { ...accountFormDefaults(), name: "Cuenta", institution: "Davivienda" }

    expect(
      accountFormSchema.safeParse({ ...base, kind: "CHECKING", openingBalance: "-20.000" }).success,
    ).toBe(true)
    expect(
      accountFormSchema.safeParse({
        ...base,
        kind: "CASH",
        institution: "",
        openingBalance: "-20.000",
      }).success,
    ).toBe(false)
  })

  it("al editar una tarjeta muestra el cupo y la deuda en formato colombiano", () => {
    expect(accountFormDefaults(cardAccount)).toMatchObject({
      kind: "CREDIT_CARD",
      creditLimit: "3.000.000",
      initialDebt: "0",
      lastFourDigits: "5403",
    })
  })
})

describe("formulario de movimientos", () => {
  it("convierte un ajuste en accountId y direction", () => {
    const values = {
      ...transactionFormDefaults("2026-11-06"),
      type: "ADJUSTMENT" as const,
      amount: "1.500",
      accountId: "acc-cash",
      direction: "DECREASE" as const,
      sourceAccountId: "acc-ignorado",
      categoryId: "cat-ignorada",
    }

    expect(toTransactionRequest(values)).toEqual({
      type: "ADJUSTMENT",
      amount: "1500",
      date: "2026-11-06",
      accountId: "acc-cash",
      direction: "DECREASE",
    })
  })

  it("carga un movimiento existente para editarlo", () => {
    expect(transactionFormDefaults("2026-11-06", income)).toMatchObject({
      type: "INCOME",
      amount: "4.000.000",
      date: "2026-11-01",
      destinationAccountId: income.destinationAccountId,
      description: "Nómina",
    })
  })
})
