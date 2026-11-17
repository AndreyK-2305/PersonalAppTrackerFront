import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, type vi } from "vitest"
import { carDetail, carInProgress } from "@/test/goal-fixtures"
import { jsonResponse, problem, requestWithMethod, stubApi } from "@/test/http-stubs"
import { renderAt, testProfile } from "@/test/render"
import type { FinancedGoalDetail } from "../api/goals"

const GOAL = "/api/v1/goals/financed/fin-1"

type User = ReturnType<typeof userEvent.setup>

function stubGoal(detail: FinancedGoalDetail, routes: Parameters<typeof stubApi>[0] = {}) {
  return stubApi({
    "GET /api/v1/me": { body: testProfile },
    [`GET ${GOAL}`]: { body: detail },
    ...routes,
  })
}

/** Cuerpo JSON de la única petición POST enviada a una ruta. */
function posted(fetchMock: ReturnType<typeof vi.fn>, url: string): unknown {
  const calls = fetchMock.mock.calls.filter(
    ([input, init]) => String(input) === url && (init as RequestInit)?.method === "POST",
  )
  expect(calls).toHaveLength(1)
  return JSON.parse(String((calls[0][1] as RequestInit).body))
}

async function openMenuItem(user: User, name: string) {
  await user.click(await screen.findByRole("button", { name: "Más acciones" }))
  await user.click(await screen.findByRole("menuitem", { name }))
}

describe("Metas financiadas: pagos, abonos y ajustes", () => {
  it("muestra cómo va el crédito, el ahorro en intereses y el estado de cada cuota", async () => {
    stubGoal(carInProgress)
    renderAt("/metas/financiada/fin-1")

    expect(await screen.findByRole("heading", { name: "Carro" })).toBeInTheDocument()
    expect(screen.getByText("Al día")).toBeInTheDocument()
    expect(screen.getByRole("progressbar", { name: "Cuotas pagadas" })).toHaveAttribute(
      "aria-valuenow",
      "12",
    )
    expect(screen.getByText(/de 44 cuotas pagadas/)).toHaveTextContent("12 de 44 cuotas pagadas")
    expect(screen.getByText(/Cuota 13, vence el/)).toBeInTheDocument()
    expect(screen.getByText(/en intereses frente al plan original/)).toHaveTextContent(
      /Ahorras \$\s?3\.006\.725 en intereses frente al plan original \(\$\s?22\.605\.857\)/,
    )

    const rows = within(screen.getByRole("table", { name: "Tabla de amortización" })).getAllByRole(
      "row",
    )
    expect(rows[1]).toHaveTextContent(/Pagada el 15 de ene de 2028/)
    expect(rows[2]).toHaveTextContent("Pendiente")
    expect(rows.at(-1)).toHaveTextContent(/\$\s?598\.024,71/)

    const records = screen.getByRole("list", { name: "Movimientos del crédito" })
    expect(within(records).getByText("Abono a capital")).toBeInTheDocument()
    expect(within(records).getByText(/reduce el plazo/)).toBeInTheDocument()
    expect(within(records).getByText("Cuota 12 pagada")).toBeInTheDocument()
    expect(within(records).getAllByRole("button", { name: "Deshacer" })).toHaveLength(1)
  })

  it("si la tasa subió, dice cuánto más se paga y cuál es la tasa vigente", async () => {
    const afterRateIncrease: FinancedGoalDetail = {
      ...carInProgress,
      goal: {
        ...carInProgress.goal,
        progress: {
          ...carInProgress.goal.progress,
          status: "OVERDUE",
          currentRatePercent: "20.5",
          interestSavings: "-1487778.71",
        },
      },
    }
    stubGoal(afterRateIncrease)
    renderAt("/metas/financiada/fin-1")

    expect(await screen.findByText("Cuota vencida")).toBeInTheDocument()
    expect(screen.getByText(/más en intereses que en el plan/)).toHaveTextContent(
      /Pagas \$\s?1\.487\.779 más en intereses que en el plan original/,
    )
    expect(screen.getByText(/Tasa vigente/)).toHaveTextContent(
      "Tasa vigente: 20,5 % EA (empezó en 18 %).",
    )
  })

  it("paga la siguiente cuota con su valor y la fecha de hoy por defecto", async () => {
    const user = userEvent.setup()
    const fetchMock = stubGoal(carDetail, {
      [`POST ${GOAL}/payments`]: () => jsonResponse(carInProgress, { status: 201 }),
    })
    renderAt("/metas/financiada/fin-1")

    await user.click(await screen.findByRole("button", { name: "Pagar cuota" }))
    const dialog = await screen.findByRole("dialog", { name: "Pagar cuota" })
    expect(dialog).toHaveTextContent(/Cuota 1, de \$\s?1\.720\.956/)
    expect(within(dialog).getByLabelText("Valor pagado")).toHaveValue("1.720.956")
    expect(within(dialog).queryByLabelText("Con lo pagado de más")).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: "Registrar pago" }))

    expect(await screen.findByText("Pago registrado.")).toBeInTheDocument()
    const body = posted(fetchMock, `${GOAL}/payments`) as Record<string, unknown>
    expect(body.amount).toBe("1720956")
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(body).not.toHaveProperty("excessMode")
  })

  it("al pagar de más pregunta qué hacer con el resto", async () => {
    const user = userEvent.setup()
    const fetchMock = stubGoal(carDetail, {
      [`POST ${GOAL}/payments`]: () => jsonResponse(carInProgress, { status: 201 }),
    })
    renderAt("/metas/financiada/fin-1")

    await user.click(await screen.findByRole("button", { name: "Pagar cuota" }))
    const dialog = await screen.findByRole("dialog", { name: "Pagar cuota" })
    await user.clear(within(dialog).getByLabelText("Valor pagado"))
    await user.type(within(dialog).getByLabelText("Valor pagado"), "6.720.956")
    await user.selectOptions(
      await within(dialog).findByLabelText("Con lo pagado de más"),
      "REDUCE_INSTALLMENT",
    )
    await user.click(within(dialog).getByRole("button", { name: "Registrar pago" }))

    expect(await screen.findByText("Pago registrado.")).toBeInTheDocument()
    expect(posted(fetchMock, `${GOAL}/payments`)).toMatchObject({
      amount: "6720956",
      excessMode: "REDUCE_INSTALLMENT",
    })
  })

  it("lleva al campo el error del backend cuando el pago es menor que la cuota", async () => {
    const user = userEvent.setup()
    stubGoal(carDetail, {
      [`POST ${GOAL}/payments`]: problem(
        422,
        "goals.financed_record.payment_amount_invalid",
        "El pago no puede ser menor que el valor de la cuota.",
      ),
    })
    renderAt("/metas/financiada/fin-1")

    await user.click(await screen.findByRole("button", { name: "Pagar cuota" }))
    const dialog = await screen.findByRole("dialog", { name: "Pagar cuota" })
    await user.clear(within(dialog).getByLabelText("Valor pagado"))
    await user.type(within(dialog).getByLabelText("Valor pagado"), "1.000.000")
    await user.click(within(dialog).getByRole("button", { name: "Registrar pago" }))

    expect(
      await within(dialog).findByText("El pago no puede ser menor que el valor de la cuota."),
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Valor pagado")).toHaveAttribute("aria-invalid", "true")
  })

  it("registra un abono a capital que por defecto reduce el plazo", async () => {
    const user = userEvent.setup()
    const fetchMock = stubGoal(carDetail, {
      [`POST ${GOAL}/prepayments`]: () => jsonResponse(carInProgress, { status: 201 }),
    })
    renderAt("/metas/financiada/fin-1")

    await openMenuItem(user, "Abonar a capital")
    const dialog = await screen.findByRole("dialog", { name: "Abonar a capital" })
    expect(within(dialog).getByLabelText("Qué hacer con el abono")).toHaveValue("REDUCE_TERM")
    await user.click(within(dialog).getByRole("button", { name: "Registrar abono" }))
    expect(await within(dialog).findByText(/monto mayor que cero/)).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText("Valor del abono"), "5.000.000")
    await user.click(within(dialog).getByRole("button", { name: "Registrar abono" }))

    expect(await screen.findByText("Abono registrado.")).toBeInTheDocument()
    expect(posted(fetchMock, `${GOAL}/prepayments`)).toMatchObject({
      amount: "5000000",
      mode: "REDUCE_TERM",
    })
  })

  it("marca varias cuotas pagadas de una vez, solo entre las pendientes", async () => {
    const user = userEvent.setup()
    const fetchMock = stubGoal(carInProgress, {
      [`POST ${GOAL}/payments/through`]: () => jsonResponse(carInProgress, { status: 201 }),
    })
    renderAt("/metas/financiada/fin-1")

    await openMenuItem(user, "Marcar cuotas pagadas")
    const dialog = await screen.findByRole("dialog", { name: "Marcar cuotas pagadas" })
    expect(dialog).toHaveTextContent("Entre la 13 y la 44.")
    await user.type(within(dialog).getByLabelText("Pagadas hasta la cuota"), "12")
    await user.click(within(dialog).getByRole("button", { name: "Marcar pagadas" }))
    expect(
      await within(dialog).findByText("Elige una cuota pendiente, entre la 13 y la 44."),
    ).toBeInTheDocument()

    await user.clear(within(dialog).getByLabelText("Pagadas hasta la cuota"))
    await user.type(within(dialog).getByLabelText("Pagadas hasta la cuota"), "20")
    await user.click(within(dialog).getByRole("button", { name: "Marcar pagadas" }))

    expect(await screen.findByText("Cuotas pagadas: 12.")).toBeInTheDocument()
    expect(posted(fetchMock, `${GOAL}/payments/through`)).toEqual({ installmentNumber: 20 })
  })

  it("ajusta la tasa con coma decimal y, si se escribe, con la nueva cuota real", async () => {
    const user = userEvent.setup()
    const fetchMock = stubGoal(carInProgress, {
      [`POST ${GOAL}/rate-adjustments`]: () => jsonResponse(carInProgress, { status: 201 }),
    })
    renderAt("/metas/financiada/fin-1")

    await openMenuItem(user, "Ajustar tasa")
    const dialog = await screen.findByRole("dialog", { name: "Ajustar tasa" })
    expect(dialog).toHaveTextContent("La tasa vigente es 18 % EA")
    await user.type(within(dialog).getByLabelText("Nueva tasa EA (%)"), "20,5")
    await user.type(within(dialog).getByLabelText("Nueva cuota real (opcional)"), "1.812.283")
    await user.click(within(dialog).getByRole("button", { name: "Ajustar tasa" }))

    expect(await screen.findByText("Tasa ajustada.")).toBeInTheDocument()
    expect(posted(fetchMock, `${GOAL}/rate-adjustments`)).toEqual({
      ratePercent: "20.5",
      actualInstallment: "1812283",
    })
  })

  it("deshace el último registro tras confirmarlo", async () => {
    const user = userEvent.setup()
    const fetchMock = stubGoal(carInProgress, {
      [`DELETE ${GOAL}/records/rec-13`]: () => jsonResponse(carDetail),
    })
    renderAt("/metas/financiada/fin-1")

    await user.click(await screen.findByRole("button", { name: "Deshacer" }))
    const confirm = await screen.findByRole("alertdialog")
    expect(confirm).toHaveTextContent('Se borra "Abono a capital"')
    await user.click(within(confirm).getByRole("button", { name: "Deshacer" }))

    expect(await screen.findByText("Registro deshecho.")).toBeInTheDocument()
    expect(requestWithMethod(fetchMock, "DELETE")).toBeDefined()
  })

  it("un crédito pagado no ofrece pagar, abonar ni ajustar la tasa", async () => {
    const user = userEvent.setup()
    const paidOff: FinancedGoalDetail = {
      ...carInProgress,
      goal: {
        ...carInProgress.goal,
        progress: {
          ...carInProgress.goal.progress,
          status: "PAID_OFF",
          paidInstallments: 44,
          pendingInstallments: 0,
          balance: "0.00",
          nextInstallment: undefined,
        },
      },
    }
    stubGoal(paidOff)
    renderAt("/metas/financiada/fin-1")

    expect(await screen.findByText("Pagado")).toBeInTheDocument()
    expect(screen.getByText("No quedan cuotas")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Pagar cuota" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Más acciones" }))
    expect(await screen.findByRole("menuitem", { name: "Editar meta" })).toBeInTheDocument()
    expect(screen.queryByRole("menuitem", { name: "Abonar a capital" })).not.toBeInTheDocument()
    expect(screen.queryByRole("menuitem", { name: "Ajustar tasa" })).not.toBeInTheDocument()
  })

  it("con registros solo deja cambiar el nombre y envía las mismas condiciones", async () => {
    const user = userEvent.setup()
    const fetchMock = stubGoal(carInProgress, {
      [`PUT ${GOAL}`]: () => jsonResponse(carInProgress),
    })
    renderAt("/metas/financiada/fin-1")

    await openMenuItem(user, "Editar meta")
    const dialog = await screen.findByRole("dialog", { name: "Editar meta financiada" })
    expect(dialog).toHaveTextContent("solo puedes cambiar el nombre")
    expect(within(dialog).queryByLabelText("Valor del bien")).not.toBeInTheDocument()
    expect(within(dialog).queryByRole("region", { name: "Vista previa del plan" })).toBeNull()
    await user.clear(within(dialog).getByLabelText("Nombre"))
    await user.type(within(dialog).getByLabelText("Nombre"), "Carro rojo")
    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }))

    expect(await screen.findByText("Meta actualizada.")).toBeInTheDocument()
    expect(JSON.parse(String(requestWithMethod(fetchMock, "PUT").body))).toEqual({
      name: "Carro rojo",
      assetValue: "60000000",
      ratePercent: "18",
      installments: 48,
      firstDueDate: "2027-02-15",
    })
  })
})
