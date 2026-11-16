import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { jsonResponse, noContent, requestWithMethod, stubApi } from "@/test/http-stubs"
import { renderAt, testProfile } from "@/test/render"
import type { SavingsGoal } from "../api/goals"
import { switchGoal } from "@/test/goal-fixtures"

const GOAL = "/api/v1/goals/savings/goal-1"

describe("SavingsGoalPage", () => {
  it("muestra el avance, la proyección y los abonos", async () => {
    stubApi({
      "GET /api/v1/me": { body: testProfile },
      [`GET ${GOAL}`]: { body: switchGoal },
    })
    renderAt("/metas/ahorro/goal-1")

    expect(await screen.findByRole("heading", { name: "Nintendo Switch" })).toBeInTheDocument()
    expect(screen.getByText("Proyección sin rentabilidad.")).toBeInTheDocument()
    const contributions = screen.getByRole("list", { name: "Abonos" })
    expect(contributions).toHaveTextContent(/200\.000/)
  })

  it("registra un abono con la fecha de hoy por defecto", async () => {
    const user = userEvent.setup()
    const updated: SavingsGoal = { ...switchGoal, savedAmount: "350000.00" }
    const fetchMock = stubApi({
      "GET /api/v1/me": { body: testProfile },
      [`GET ${GOAL}`]: { body: switchGoal },
      [`POST ${GOAL}/contributions`]: () => jsonResponse(updated, { status: 201 }),
    })
    renderAt("/metas/ahorro/goal-1")

    await user.click(await screen.findByRole("button", { name: "Registrar abono" }))
    const dialog = await screen.findByRole("dialog", { name: "Registrar abono" })
    expect(within(dialog).getByLabelText("Fecha")).not.toHaveValue("")
    await user.type(within(dialog).getByLabelText("Valor"), "150.000")
    await user.click(within(dialog).getByRole("button", { name: "Registrar abono" }))

    expect(await screen.findByText("Abono registrado.")).toBeInTheDocument()
    const body = JSON.parse(String(requestWithMethod(fetchMock, "POST").body))
    expect(body.amount).toBe("150000")
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("cambia la rentabilidad aceptando coma decimal", async () => {
    const user = userEvent.setup()
    const withRate: SavingsGoal = {
      ...switchGoal,
      ratePercent: "10.5",
      rateChanges: [{ effectiveFrom: "2026-11-17", ratePercent: "10.5" }],
    }
    const fetchMock = stubApi({
      "GET /api/v1/me": { body: testProfile },
      [`GET ${GOAL}`]: { body: switchGoal },
      [`PUT ${GOAL}/rate`]: () => jsonResponse(withRate),
    })
    renderAt("/metas/ahorro/goal-1")

    await user.click(await screen.findByRole("button", { name: "Más acciones" }))
    await user.click(await screen.findByRole("menuitem", { name: "Rentabilidad" }))
    const dialog = await screen.findByRole("dialog", { name: "Rentabilidad" })
    await user.type(within(dialog).getByLabelText("Tasa EA (%)"), "10,5")
    await user.click(within(dialog).getByRole("button", { name: "Guardar tasa" }))

    expect(await screen.findByText("Rentabilidad actualizada desde mañana.")).toBeInTheDocument()
    expect(JSON.parse(String(requestWithMethod(fetchMock, "PUT").body))).toEqual({
      ratePercent: "10.5",
    })
  })

  it("elimina un abono tras confirmarlo", async () => {
    const user = userEvent.setup()
    const fetchMock = stubApi({
      "GET /api/v1/me": { body: testProfile },
      [`GET ${GOAL}`]: { body: switchGoal },
      [`DELETE ${GOAL}/contributions/c-1`]: () =>
        jsonResponse({ ...switchGoal, contributions: [], savedAmount: "0.00" }),
    })
    renderAt("/metas/ahorro/goal-1")

    await user.click(await screen.findByRole("button", { name: /Eliminar abono del/ }))
    const confirm = await screen.findByRole("alertdialog")
    await user.click(within(confirm).getByRole("button", { name: "Eliminar" }))

    expect(await screen.findByText("Abono eliminado.")).toBeInTheDocument()
    expect(requestWithMethod(fetchMock, "DELETE")).toBeDefined()
  })

  it("elimina la meta y vuelve al listado", async () => {
    const user = userEvent.setup()
    stubApi({
      "GET /api/v1/me": { body: testProfile },
      [`GET ${GOAL}`]: { body: switchGoal },
      [`DELETE ${GOAL}`]: noContent,
      "GET /api/v1/goals/savings": { body: [] },
    })
    const router = renderAt("/metas/ahorro/goal-1")

    await user.click(await screen.findByRole("button", { name: "Más acciones" }))
    await user.click(await screen.findByRole("menuitem", { name: "Eliminar meta" }))
    const confirm = await screen.findByRole("alertdialog")
    await user.click(within(confirm).getByRole("button", { name: "Eliminar" }))

    expect(await screen.findByText("Meta eliminada.")).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/metas")
  })
})
