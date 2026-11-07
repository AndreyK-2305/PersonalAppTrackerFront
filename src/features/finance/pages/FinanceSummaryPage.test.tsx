import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { financeApi, summary } from "@/test/finance-fixtures"
import { jsonResponse, requestWithMethod, stubApi } from "@/test/http-stubs"
import { renderAt, testProfile } from "@/test/render"

// Intl usa espacios de no separación; NFKC los convierte en espacios normales para comparar.
const normalize = (text: string | null) => (text ?? "").normalize("NFKC")

describe("bienvenida de Finanzas", () => {
  it("prepara el espacio con las categorías sugeridas y muestra el resumen", async () => {
    let setUp = false
    const fetchMock = stubApi({
      "GET /api/v1/me": { body: testProfile },
      ...financeApi(),
      "GET /api/v1/finance/setup": () => jsonResponse({ setUp }),
      "POST /api/v1/finance/setup": () => {
        setUp = true
        return jsonResponse({ setUp: true })
      },
    })
    renderAt("/finanzas")

    const start = await screen.findByRole("button", { name: "Empezar" })
    expect(screen.getByRole("checkbox", { name: "Usar las categorías sugeridas" })).toBeChecked()
    await userEvent.click(start)

    expect(await screen.findByRole("heading", { name: "Resumen" })).toBeInTheDocument()
    expect(JSON.parse(String(requestWithMethod(fetchMock, "POST").body))).toEqual({
      withSuggestedCategories: true,
    })
  })
})

describe("FinanceSummaryPage", () => {
  it("muestra los totales del periodo comparados con el anterior", async () => {
    stubApi({ "GET /api/v1/me": { body: testProfile }, ...financeApi() })
    renderAt("/finanzas")

    const income = await screen.findByText("Ingresos", { selector: "[data-slot=card-description]" })
    const incomeCard = income.closest("[data-slot=card]") as HTMLElement
    expect(normalize(incomeCard.textContent)).toContain("$ 4.000.000")
    expect(normalize(incomeCard.textContent)).toContain(
      "Periodo anterior: $ 4.000.000, sin cambios",
    )
    expect(normalize(incomeCard.textContent)).toContain("1 a 6 de oct de 2026")

    const expenseCard = screen
      .getByText("Gastos", { selector: "[data-slot=card-description]" })
      .closest("[data-slot=card]") as HTMLElement
    expect(normalize(expenseCard.textContent)).toContain(
      "Periodo anterior: $ 420.000, ahora es menor",
    )
    expect(screen.getByText("noviembre de 2026")).toBeInTheDocument()
  })

  it("nombra las categorías, los productos y los últimos movimientos", async () => {
    stubApi({ "GET /api/v1/me": { body: testProfile }, ...financeApi() })
    renderAt("/finanzas")

    const byCategory = (await screen.findByText("Gastos por categoría")).closest(
      "[data-slot=card]",
    ) as HTMLElement
    expect(within(byCategory).getByText("Alimentación")).toBeInTheDocument()
    expect(within(byCategory).getByText("Sin categoría")).toBeInTheDocument()

    const byAccount = screen.getByText("Por producto").closest("[data-slot=card]") as HTMLElement
    expect(within(byAccount).getByRole("cell", { name: "Ahorros" })).toBeInTheDocument()

    const recent = screen
      .getByText("Últimos movimientos")
      .closest("[data-slot=card]") as HTMLElement
    expect(within(recent).getByText("Pago tarjeta")).toBeInTheDocument()
    expect(normalize(within(recent).getByText(/4\.000\.000/).textContent)).toBe("+$ 4.000.000")
  })

  it("cambia de periodo y navega al anterior", async () => {
    const fetchMock = stubApi({
      "GET /api/v1/me": { body: testProfile },
      ...financeApi(),
      "GET /api/v1/finance/summary?period=WEEK": {
        body: { ...summary, kind: "WEEK", start: "2026-11-02", end: "2026-11-08" },
      },
      "GET /api/v1/finance/summary?period=WEEK&date=2026-11-01": {
        body: { ...summary, kind: "WEEK", start: "2026-10-26", end: "2026-11-01" },
      },
    })
    const router = renderAt("/finanzas")

    await userEvent.click(await screen.findByRole("tab", { name: "Semana" }))
    expect(await screen.findByText("2 a 8 de nov de 2026")).toBeInTheDocument()
    expect(router.state.location.search).toBe("?periodo=semana")

    await userEvent.click(screen.getByRole("button", { name: "Periodo anterior" }))
    expect(await screen.findByText("26 de oct al 1 de nov de 2026")).toBeInTheDocument()
    await waitFor(() =>
      expect(router.state.location.search).toBe("?periodo=semana&fecha=2026-11-01"),
    )
    expect(screen.getByRole("button", { name: "Hoy" })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/finance/summary?period=WEEK&date=2026-11-01",
      expect.anything(),
    )
  })
})
