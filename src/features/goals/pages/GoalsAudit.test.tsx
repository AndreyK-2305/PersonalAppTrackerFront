import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { bikeGoal, switchGoal } from "@/test/goal-fixtures"
import { jsonResponse, noContent, problem, requestWithMethod, stubApi } from "@/test/http-stubs"
import { renderAt, testProfile } from "@/test/render"
import type { SavingsGoal } from "../api/goals"

const GOALS = "/api/v1/goals/savings"
const GOAL = `${GOALS}/goal-1`

/** Casos de la auditoría de la entrega 1 de Metas (docs/revisiones del backend). */
describe("Metas: estados y errores", () => {
  it("distingue una meta vencida de una que no alcanza", async () => {
    const overdue: SavingsGoal = {
      ...switchGoal,
      overdue: true,
      monthsRemaining: 0,
      recommendedMonthlyAmount: "1000000.00",
    }
    const unreachable: SavingsGoal = {
      ...bikeGoal,
      completed: false,
      savedAmount: "0.00",
      remainingAmount: "900000.00",
      progressPercent: "0.0",
      monthlyAmount: "1.00",
      estimatedDate: undefined,
      reachable: false,
    }
    stubApi({
      "GET /api/v1/me": { body: testProfile },
      [`GET ${GOALS}`]: { body: [overdue, unreachable] },
    })
    renderAt("/metas")

    const overdueCard = await screen.findByRole("article", { name: "Nintendo Switch" })
    expect(overdueCard).toHaveTextContent("Vencida")
    expect(overdueCard).toHaveTextContent(/La fecha ya pasó: faltan \$\s?1\.000\.000/)
    const unreachableCard = screen.getByRole("article", { name: "Bicicleta" })
    expect(unreachableCard).toHaveTextContent("No alcanza")
    expect(unreachableCard).toHaveTextContent("más de 100 años")
  })

  it("muestra el mensaje del servidor cuando rechaza la meta y deja el diálogo abierto", async () => {
    const user = userEvent.setup()
    stubApi({
      "GET /api/v1/me": { body: testProfile },
      [`GET ${GOALS}`]: { body: [] },
      [`POST ${GOALS}`]: problem(
        422,
        "goals.savings_goal.target_date_invalid",
        "La fecha objetivo debe ser posterior a hoy.",
      ),
    })
    renderAt("/metas")

    await user.click(await screen.findByRole("button", { name: "Nueva meta" }))
    const dialog = await screen.findByRole("dialog", { name: "Nueva meta de ahorro" })
    await user.type(within(dialog).getByLabelText("Nombre"), "Consola")
    await user.type(within(dialog).getByLabelText("Valor objetivo"), "1.000")
    await user.type(within(dialog).getByLabelText("Fecha objetivo"), "2020-01-01")
    await user.click(within(dialog).getByRole("button", { name: "Crear meta" }))

    expect(
      await within(dialog).findByText("La fecha objetivo debe ser posterior a hoy."),
    ).toBeInTheDocument()
    // El código de la regla lleva el error al campo de la fecha (H-10).
    expect(within(dialog).getByLabelText("Fecha objetivo")).toHaveAttribute("aria-invalid", "true")
    expect(within(dialog).getByLabelText("Nombre")).not.toHaveAttribute("aria-invalid", "true")
    expect(screen.getByRole("dialog", { name: "Nueva meta de ahorro" })).toBeInTheDocument()
  })

  it("no envía la meta si falta el nombre o el valor no es un monto", async () => {
    const user = userEvent.setup()
    const fetchMock = stubApi({
      "GET /api/v1/me": { body: testProfile },
      [`GET ${GOALS}`]: { body: [] },
    })
    renderAt("/metas")

    await user.click(await screen.findByRole("button", { name: "Nueva meta" }))
    const dialog = await screen.findByRole("dialog", { name: "Nueva meta de ahorro" })
    await user.type(within(dialog).getByLabelText("Valor objetivo"), "1.5")
    await user.click(within(dialog).getByRole("button", { name: "Crear meta" }))

    expect(await within(dialog).findByText("Escribe un nombre.")).toBeInTheDocument()
    expect(within(dialog).getByText(/monto mayor que cero/)).toBeInTheDocument()
    expect(within(dialog).getByText("Elige la fecha objetivo.")).toBeInTheDocument()
    expect(() => requestWithMethod(fetchMock, "POST")).toThrow()
  })

  it("edita la meta con los datos actuales precargados", async () => {
    const user = userEvent.setup()
    const fetchMock = stubApi({
      "GET /api/v1/me": { body: testProfile },
      [`GET ${GOAL}`]: { body: switchGoal },
      [`PUT ${GOAL}`]: () => jsonResponse({ ...switchGoal, name: "Switch 2" }),
    })
    renderAt("/metas/ahorro/goal-1")

    await user.click(await screen.findByRole("button", { name: "Más acciones" }))
    await user.click(await screen.findByRole("menuitem", { name: "Editar meta" }))
    const dialog = await screen.findByRole("dialog", { name: "Editar meta" })
    expect(within(dialog).getByLabelText("Valor objetivo")).toHaveValue("1.200.000")
    expect(within(dialog).getByLabelText("Fecha objetivo")).toHaveValue("2027-11-15")
    await user.clear(within(dialog).getByLabelText("Nombre"))
    await user.type(within(dialog).getByLabelText("Nombre"), "Switch 2")
    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }))

    expect(await screen.findByText("Meta actualizada.")).toBeInTheDocument()
    expect(JSON.parse(String(requestWithMethod(fetchMock, "PUT").body))).toEqual({
      name: "Switch 2",
      targetAmount: "1200000",
      plan: "TARGET_DATE",
      targetDate: "2027-11-15",
    })
  })

  it("rechaza una tasa que no es un porcentaje sin llamar al servidor", async () => {
    const user = userEvent.setup()
    const fetchMock = stubApi({
      "GET /api/v1/me": { body: testProfile },
      [`GET ${GOAL}`]: { body: switchGoal },
    })
    renderAt("/metas/ahorro/goal-1")

    await user.click(await screen.findByRole("button", { name: "Más acciones" }))
    await user.click(await screen.findByRole("menuitem", { name: "Rentabilidad" }))
    const dialog = await screen.findByRole("dialog", { name: "Rentabilidad" })
    await user.type(within(dialog).getByLabelText("Tasa EA (%)"), "10,12345")
    await user.click(within(dialog).getByRole("button", { name: "Guardar tasa" }))
    expect(await within(dialog).findByText(/hasta 4 decimales/)).toBeInTheDocument()

    await user.clear(within(dialog).getByLabelText("Tasa EA (%)"))
    await user.type(within(dialog).getByLabelText("Tasa EA (%)"), "1001")
    await user.click(within(dialog).getByRole("button", { name: "Guardar tasa" }))
    expect(await within(dialog).findByText("La tasa máxima es 1000 % EA.")).toBeInTheDocument()
    expect(() => requestWithMethod(fetchMock, "PUT")).toThrow()
  })

  it("muestra la meta que no existe como error con opción de volver", async () => {
    stubApi({
      "GET /api/v1/me": { body: testProfile },
      [`GET ${GOAL}`]: problem(404, "goals.savings_goal.not_found", "La meta no existe."),
    })
    renderAt("/metas/ahorro/goal-1")

    expect(await screen.findByText("No fue posible cargar la meta")).toBeInTheDocument()
    expect(screen.getByText("La meta no existe.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Metas" })).toHaveAttribute("href", "/metas")
  })

  /**
   * H-11: al eliminar, la mutación invalida la consulta de la meta recién borrada; su recarga
   * responde 404 y la pantalla de error aparece un instante antes de volver al listado.
   */
  it("al eliminar la meta no muestra el error de carga antes de volver al listado", async () => {
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
              { status: 404, code: "goals.savings_goal.not_found", detail: "La meta no existe." },
              { status: 404, headers: { "Content-Type": "application/problem+json" } },
            )
          : jsonResponse(switchGoal),
      [`DELETE ${GOAL}`]: () => {
        deleted = true
        return noContent()
      },
      [`GET ${GOALS}`]: { body: [] },
    })
    const router = renderAt("/metas/ahorro/goal-1")

    await user.click(await screen.findByRole("button", { name: "Más acciones" }))
    await user.click(await screen.findByRole("menuitem", { name: "Eliminar meta" }))
    const confirm = await screen.findByRole("alertdialog")
    await user.click(within(confirm).getByRole("button", { name: "Eliminar" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/metas"))
    observer.disconnect()
    expect(flashed).toBe(false)
  })
})
