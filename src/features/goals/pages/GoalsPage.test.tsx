import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { jsonResponse, requestWithMethod, stubApi } from "@/test/http-stubs"
import { renderAt, testProfile } from "@/test/render"
import { bikeGoal, switchGoal } from "@/test/goal-fixtures"

const GOALS = "/api/v1/goals/savings"

describe("GoalsPage", () => {
  it("lista las metas con su avance y lo que hay que apartar", async () => {
    stubApi({
      "GET /api/v1/me": { body: testProfile },
      "GET /api/v1/goals/financed": { body: [] },
      [`GET ${GOALS}`]: { body: [switchGoal, bikeGoal] },
    })
    renderAt("/metas")

    const switchCard = await screen.findByRole("article", { name: "Nintendo Switch" })
    expect(within(switchCard).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "16.6")
    expect(switchCard).toHaveTextContent("16,6 %")
    expect(switchCard).toHaveTextContent(/Aparta \$\s?100\.000 al mes/)

    const bikeCard = screen.getByRole("article", { name: "Bicicleta" })
    expect(bikeCard).toHaveTextContent("Cumplida")
    expect(bikeCard).toHaveTextContent("¡Llegaste al objetivo!")
  })

  it("crea una meta por fecha y abre su detalle", async () => {
    const user = userEvent.setup()
    const fetchMock = stubApi({
      "GET /api/v1/me": { body: testProfile },
      "GET /api/v1/goals/financed": { body: [] },
      [`GET ${GOALS}`]: { body: [] },
      [`POST ${GOALS}`]: () => jsonResponse(switchGoal, { status: 201 }),
      [`GET ${GOALS}/goal-1`]: { body: switchGoal },
    })
    const router = renderAt("/metas")

    await user.click(await screen.findByRole("button", { name: "Nueva meta de ahorro" }))
    const dialog = await screen.findByRole("dialog", { name: "Nueva meta de ahorro" })
    await user.type(within(dialog).getByLabelText("Nombre"), "Nintendo Switch")
    await user.type(within(dialog).getByLabelText("Valor objetivo"), "1.200.000")
    await user.type(within(dialog).getByLabelText("Fecha objetivo"), "2027-11-15")
    await user.click(within(dialog).getByRole("button", { name: "Crear meta" }))

    expect(await screen.findByText("Meta creada.")).toBeInTheDocument()
    expect(JSON.parse(String(requestWithMethod(fetchMock, "POST").body))).toEqual({
      name: "Nintendo Switch",
      targetAmount: "1200000",
      plan: "TARGET_DATE",
      targetDate: "2027-11-15",
    })
    await waitFor(() => expect(router.state.location.pathname).toBe("/metas/ahorro/goal-1"))
  })

  it("con plan por aporte mensual pide el aporte en lugar de la fecha", async () => {
    const user = userEvent.setup()
    const fetchMock = stubApi({
      "GET /api/v1/me": { body: testProfile },
      "GET /api/v1/goals/financed": { body: [] },
      [`GET ${GOALS}`]: { body: [] },
      [`POST ${GOALS}`]: () => jsonResponse(bikeGoal, { status: 201 }),
      [`GET ${GOALS}/goal-2`]: { body: bikeGoal },
    })
    renderAt("/metas")

    await user.click(await screen.findByRole("button", { name: "Nueva meta de ahorro" }))
    const dialog = await screen.findByRole("dialog", { name: "Nueva meta de ahorro" })
    await user.type(within(dialog).getByLabelText("Nombre"), "Bicicleta")
    await user.type(within(dialog).getByLabelText("Valor objetivo"), "900.000")
    await user.selectOptions(within(dialog).getByLabelText("Plan"), "MONTHLY_AMOUNT")
    expect(within(dialog).queryByLabelText("Fecha objetivo")).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: "Crear meta" }))
    expect(await within(dialog).findByText(/mayor que cero/)).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText("Aporte mensual"), "300.000")
    await user.click(within(dialog).getByRole("button", { name: "Crear meta" }))

    expect(await screen.findByText("Meta creada.")).toBeInTheDocument()
    expect(JSON.parse(String(requestWithMethod(fetchMock, "POST").body))).toEqual({
      name: "Bicicleta",
      targetAmount: "900000",
      plan: "MONTHLY_AMOUNT",
      monthlyAmount: "300000",
    })
  })
})
