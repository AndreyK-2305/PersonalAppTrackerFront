import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, type vi } from "vitest"
import { carDetail, carGoal, carSimulation } from "@/test/goal-fixtures"
import { jsonResponse, noContent, problem, requestWithMethod, stubApi } from "@/test/http-stubs"
import { renderAt, testProfile } from "@/test/render"
import type { FinancedGoalDetail } from "../api/goals"

const SAVINGS = "/api/v1/goals/savings"
const FINANCED = "/api/v1/goals/financed"
const GOAL = `${FINANCED}/fin-1`
const SIMULATIONS = `${FINANCED}/simulations`

/** Cuerpos JSON de las peticiones POST enviadas a una ruta. */
function postedTo(fetchMock: ReturnType<typeof vi.fn>, url: string): unknown[] {
  return fetchMock.mock.calls
    .filter(([input, init]) => String(input) === url && (init as RequestInit)?.method === "POST")
    .map(([, init]) => JSON.parse(String((init as RequestInit).body)))
}

async function fillTerms(dialog: HTMLElement, user: ReturnType<typeof userEvent.setup>) {
  await user.type(within(dialog).getByLabelText("Valor del bien"), "60.000.000")
  await user.type(within(dialog).getByLabelText("Tasa EA (%)"), "18")
  await user.type(within(dialog).getByLabelText("Número de cuotas"), "48")
  await user.type(within(dialog).getByLabelText("Fecha de la primera cuota"), "2027-02-15")
}

describe("Metas financiadas", () => {
  it("lista las metas financiadas en su sección con el resumen del plan", async () => {
    stubApi({
      "GET /api/v1/me": { body: testProfile },
      [`GET ${SAVINGS}`]: { body: [] },
      [`GET ${FINANCED}`]: { body: [carGoal] },
    })
    renderAt("/metas")

    const section = await screen.findByRole("region", { name: "Financiadas" })
    const card = await within(section).findByRole("article", { name: "Carro" })
    expect(card).toHaveTextContent(/\$\s?1\.720\.956 al mes durante 48 cuotas/)
    expect(card).toHaveTextContent(/pagas \$\s?22\.605\.857 de intereses/)
    expect(within(card).getByRole("link", { name: "Carro" })).toHaveAttribute(
      "href",
      "/metas/financiada/fin-1",
    )
    expect(
      await within(screen.getByRole("region", { name: "Ahorro" })).findByText(
        "Aún no tienes metas de ahorro",
      ),
    ).toBeInTheDocument()
  })

  it("muestra la vista previa calculada por el backend y crea la meta", async () => {
    const user = userEvent.setup()
    const fetchMock = stubApi({
      "GET /api/v1/me": { body: testProfile },
      [`GET ${SAVINGS}`]: { body: [] },
      [`GET ${FINANCED}`]: { body: [] },
      [`POST ${SIMULATIONS}`]: () => jsonResponse(carSimulation),
      [`POST ${FINANCED}`]: () => jsonResponse(carDetail, { status: 201 }),
      [`GET ${GOAL}`]: { body: carDetail },
    })
    const router = renderAt("/metas")

    await user.click(await screen.findByRole("button", { name: "Nueva meta financiada" }))
    const dialog = await screen.findByRole("dialog", { name: "Nueva meta financiada" })
    const preview = within(dialog).getByRole("region", { name: "Vista previa del plan" })
    expect(preview).toHaveTextContent("Completa el valor, la tasa, las cuotas y la fecha")

    await user.type(within(dialog).getByLabelText("Nombre"), "Carro")
    await fillTerms(dialog, user)

    expect(await within(preview).findByText("Cuota mensual")).toBeInTheDocument()
    expect(preview).toHaveTextContent(/\$\s?1\.720\.956/)
    expect(preview).toHaveTextContent(/\$\s?22\.605\.857/)
    expect(postedTo(fetchMock, SIMULATIONS).at(-1)).toEqual({
      assetValue: "60000000",
      ratePercent: "18",
      installments: 48,
      firstDueDate: "2027-02-15",
    })

    await user.click(within(dialog).getByRole("button", { name: "Crear meta" }))

    expect(await screen.findByText("Meta creada.")).toBeInTheDocument()
    expect(postedTo(fetchMock, FINANCED)).toEqual([
      {
        name: "Carro",
        assetValue: "60000000",
        ratePercent: "18",
        installments: 48,
        firstDueDate: "2027-02-15",
      },
    ])
    await waitFor(() => expect(router.state.location.pathname).toBe("/metas/financiada/fin-1"))
  })

  it("envía la cuota inicial y la cuota real cuando se escriben, con coma decimal en la tasa", async () => {
    const user = userEvent.setup()
    const fetchMock = stubApi({
      "GET /api/v1/me": { body: testProfile },
      [`GET ${SAVINGS}`]: { body: [] },
      [`GET ${FINANCED}`]: { body: [] },
      [`POST ${SIMULATIONS}`]: () => jsonResponse(carSimulation),
    })
    renderAt("/metas")

    await user.click(await screen.findByRole("button", { name: "Nueva meta financiada" }))
    const dialog = await screen.findByRole("dialog", { name: "Nueva meta financiada" })
    await user.type(within(dialog).getByLabelText("Valor del bien"), "70.000.000")
    await user.type(within(dialog).getByLabelText("Cuota inicial (opcional)"), "10.000.000")
    await user.type(within(dialog).getByLabelText("Tasa EA (%)"), "18,5")
    await user.type(within(dialog).getByLabelText("Número de cuotas"), "48")
    await user.type(within(dialog).getByLabelText("Fecha de la primera cuota"), "2027-02-15")
    await user.type(within(dialog).getByLabelText("Cuota real (opcional)"), "1.760.956")

    await waitFor(() =>
      expect(postedTo(fetchMock, SIMULATIONS).at(-1)).toEqual({
        assetValue: "70000000",
        downPayment: "10000000",
        ratePercent: "18.5",
        installments: 48,
        firstDueDate: "2027-02-15",
        actualInstallment: "1760956",
      }),
    )
  })

  it("muestra en la vista previa la regla que el backend rechaza", async () => {
    const user = userEvent.setup()
    stubApi({
      "GET /api/v1/me": { body: testProfile },
      [`GET ${SAVINGS}`]: { body: [] },
      [`GET ${FINANCED}`]: { body: [] },
      [`POST ${SIMULATIONS}`]: problem(
        422,
        "goals.financed_goal.actual_installment_invalid",
        "La cuota real no puede ser menor que la cuota calculada con esa tasa y ese plazo.",
      ),
    })
    renderAt("/metas")

    await user.click(await screen.findByRole("button", { name: "Nueva meta financiada" }))
    const dialog = await screen.findByRole("dialog", { name: "Nueva meta financiada" })
    await fillTerms(dialog, user)
    await user.type(within(dialog).getByLabelText("Cuota real (opcional)"), "1.000")

    const preview = within(dialog).getByRole("region", { name: "Vista previa del plan" })
    expect(await within(preview).findByRole("alert")).toHaveTextContent(
      "La cuota real no puede ser menor que la cuota calculada",
    )
  })

  it("valida el formulario sin llamar al servidor y lleva el error del backend a su campo", async () => {
    const user = userEvent.setup()
    const fetchMock = stubApi({
      "GET /api/v1/me": { body: testProfile },
      [`GET ${SAVINGS}`]: { body: [] },
      [`GET ${FINANCED}`]: { body: [] },
      [`POST ${SIMULATIONS}`]: () => jsonResponse(carSimulation),
      [`POST ${FINANCED}`]: problem(
        422,
        "goals.financed_goal.first_due_date_invalid",
        "La fecha de la primera cuota debe estar a menos de 100 años de hoy.",
      ),
    })
    renderAt("/metas")

    await user.click(await screen.findByRole("button", { name: "Nueva meta financiada" }))
    const dialog = await screen.findByRole("dialog", { name: "Nueva meta financiada" })
    await user.type(within(dialog).getByLabelText("Valor del bien"), "1.000")
    await user.type(within(dialog).getByLabelText("Cuota inicial (opcional)"), "1.000")
    await user.type(within(dialog).getByLabelText("Número de cuotas"), "601")
    await user.click(within(dialog).getByRole("button", { name: "Crear meta" }))

    expect(await within(dialog).findByText("Escribe un nombre.")).toBeInTheDocument()
    expect(within(dialog).getByText("Debe ser menor que el valor del bien.")).toBeInTheDocument()
    expect(within(dialog).getByText(/porcentaje con hasta 4 decimales/)).toBeInTheDocument()
    expect(
      within(dialog).getByText("Escribe un número de cuotas entre 1 y 600."),
    ).toBeInTheDocument()
    expect(within(dialog).getByText("Elige la fecha de la primera cuota.")).toBeInTheDocument()
    expect(postedTo(fetchMock, FINANCED)).toEqual([])

    await user.type(within(dialog).getByLabelText("Nombre"), "Carro")
    await user.clear(within(dialog).getByLabelText("Cuota inicial (opcional)"))
    await user.type(within(dialog).getByLabelText("Tasa EA (%)"), "18")
    await user.clear(within(dialog).getByLabelText("Número de cuotas"))
    await user.type(within(dialog).getByLabelText("Número de cuotas"), "48")
    await user.type(within(dialog).getByLabelText("Fecha de la primera cuota"), "2027-02-15")
    await user.click(within(dialog).getByRole("button", { name: "Crear meta" }))

    expect(
      await within(dialog).findByText(
        "La fecha de la primera cuota debe estar a menos de 100 años de hoy.",
      ),
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Fecha de la primera cuota")).toHaveAttribute(
      "aria-invalid",
      "true",
    )
  })

  it("muestra el resumen y la tabla de amortización con centavos", async () => {
    stubApi({
      "GET /api/v1/me": { body: testProfile },
      [`GET ${GOAL}`]: { body: carDetail },
    })
    renderAt("/metas/financiada/fin-1")

    expect(await screen.findByRole("heading", { name: "Carro" })).toBeInTheDocument()
    expect(screen.getByText(/60\.000\.000 al 18 % EA en 48 cuotas/)).toBeInTheDocument()
    const summary = screen.getByLabelText("Resumen del plan de pagos")
    expect(summary).toHaveTextContent(/Cuota mensual\$\s?1\.720\.956/)
    expect(summary).toHaveTextContent(/Costo total\$\s?82\.605\.857/)
    expect(summary).not.toHaveTextContent("Seguros y otros")

    const table = screen.getByRole("table", { name: "Tabla de amortización" })
    const rows = within(table).getAllByRole("row")
    expect(rows).toHaveLength(carDetail.schedule.length + 1)
    expect(rows[1]).toHaveTextContent(/\$\s?1\.720\.956,00/)
    expect(rows[1]).toHaveTextContent(/\$\s?833\.305,82/)
    expect(rows[1]).toHaveTextContent(/\$\s?887\.650,18/)
    expect(rows[1]).toHaveTextContent(/\$\s?59\.112\.349,82/)
    expect(rows.at(-1)).toHaveTextContent(/\$\s?1\.720\.925,34/)
    expect(rows.at(-1)).toHaveTextContent(/\$\s?0,00/)
    expect(within(table).queryByRole("columnheader", { name: "Seguros y otros" })).toBeNull()
  })

  it("con cuota real muestra los seguros y otros en el resumen y en la tabla", async () => {
    const withExtras: FinancedGoalDetail = {
      goal: {
        ...carGoal,
        actualInstallment: "1760956.00",
        summary: {
          ...carGoal.summary,
          installmentAmount: "1760956.00",
          extrasPerInstallment: "40000.00",
          totalExtras: "1920000.00",
          totalPaid: "84525857.34",
          totalCost: "84525857.34",
        },
      },
      schedule: carDetail.schedule.map((row) => ({ ...row, extras: "40000.00" })),
    }
    stubApi({
      "GET /api/v1/me": { body: testProfile },
      [`GET ${GOAL}`]: { body: withExtras },
    })
    renderAt("/metas/financiada/fin-1")

    const summary = await screen.findByLabelText("Resumen del plan de pagos")
    expect(summary).toHaveTextContent(/Cuota mensual\$\s?1\.760\.956/)
    expect(summary).toHaveTextContent(/Cuota calculada\$\s?1\.720\.956/)
    expect(summary).toHaveTextContent(/Seguros y otros\$\s?40\.000 por cuota/)
    const table = screen.getByRole("table", { name: "Tabla de amortización" })
    expect(within(table).getByRole("columnheader", { name: "Seguros y otros" })).toBeInTheDocument()
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent(/\$\s?40\.000,00/)
  })

  it("edita la meta con los datos actuales precargados", async () => {
    const user = userEvent.setup()
    const fetchMock = stubApi({
      "GET /api/v1/me": { body: testProfile },
      [`GET ${GOAL}`]: { body: carDetail },
      [`POST ${SIMULATIONS}`]: () => jsonResponse(carSimulation),
      [`PUT ${GOAL}`]: () => jsonResponse(carDetail),
    })
    renderAt("/metas/financiada/fin-1")

    await user.click(await screen.findByRole("button", { name: "Más acciones" }))
    await user.click(await screen.findByRole("menuitem", { name: "Editar meta" }))
    const dialog = await screen.findByRole("dialog", { name: "Editar meta financiada" })
    expect(within(dialog).getByLabelText("Valor del bien")).toHaveValue("60.000.000")
    expect(within(dialog).getByLabelText("Cuota inicial (opcional)")).toHaveValue("")
    expect(within(dialog).getByLabelText("Tasa EA (%)")).toHaveValue("18")
    expect(within(dialog).getByLabelText("Número de cuotas")).toHaveValue("48")
    expect(within(dialog).getByLabelText("Fecha de la primera cuota")).toHaveValue("2027-02-15")
    await user.clear(within(dialog).getByLabelText("Número de cuotas"))
    await user.type(within(dialog).getByLabelText("Número de cuotas"), "60")
    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }))

    expect(await screen.findByText("Meta actualizada.")).toBeInTheDocument()
    expect(JSON.parse(String(requestWithMethod(fetchMock, "PUT").body))).toEqual({
      name: "Carro",
      assetValue: "60000000",
      ratePercent: "18",
      installments: 60,
      firstDueDate: "2027-02-15",
    })
  })

  it("elimina la meta y vuelve al listado sin mostrar el error de carga", async () => {
    const user = userEvent.setup()
    let deleted = false
    let flashed = false
    const observer = new MutationObserver(() => {
      if (document.body.textContent?.includes("No fue posible cargar la meta")) {
        flashed = true
      }
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    stubApi({
      "GET /api/v1/me": { body: testProfile },
      [`GET ${GOAL}`]: () =>
        deleted
          ? jsonResponse(
              { status: 404, code: "goals.financed_goal.not_found", detail: "La meta no existe." },
              { status: 404, headers: { "Content-Type": "application/problem+json" } },
            )
          : jsonResponse(carDetail),
      [`DELETE ${GOAL}`]: () => {
        deleted = true
        return noContent()
      },
      [`GET ${SAVINGS}`]: { body: [] },
      [`GET ${FINANCED}`]: { body: [] },
    })
    const router = renderAt("/metas/financiada/fin-1")

    await user.click(await screen.findByRole("button", { name: "Más acciones" }))
    await user.click(await screen.findByRole("menuitem", { name: "Eliminar meta" }))
    const confirm = await screen.findByRole("alertdialog")
    await user.click(within(confirm).getByRole("button", { name: "Eliminar" }))

    expect(await screen.findByText("Meta eliminada.")).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe("/metas"))
    observer.disconnect()
    expect(flashed).toBe(false)
  })
})
