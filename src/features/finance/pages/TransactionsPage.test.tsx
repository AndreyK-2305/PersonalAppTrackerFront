import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { todayIn } from "@/lib/dates"
import {
  cardAccount,
  expense,
  financeApi,
  income,
  savingsAccount,
  transactionPage,
} from "@/test/finance-fixtures"
import { jsonResponse, problem, requestWithMethod, stubApi } from "@/test/http-stubs"
import { renderAt, testProfile } from "@/test/render"

const normalize = (text: string | null) => (text ?? "").normalize("NFKC")

function stubTransactions(extra: Parameters<typeof stubApi>[0] = {}) {
  return stubApi({ "GET /api/v1/me": { body: testProfile }, ...financeApi(), ...extra })
}

describe("TransactionsPage", () => {
  it("lista los movimientos con su signo, categoría y productos", async () => {
    stubTransactions()
    renderAt("/finanzas/movimientos")

    const rows = await screen.findAllByRole("row")
    // Encabezado más tres movimientos, del más reciente al más antiguo.
    expect(rows).toHaveLength(4)
    expect(normalize(rows[1].textContent)).toContain("Pago tarjeta")
    expect(normalize(rows[1].textContent)).toContain("Ahorros")
    expect(normalize(rows[1].textContent)).toContain("$ 300.000")
    expect(normalize(rows[2].textContent)).toContain("Alimentación / Mercado")
    expect(normalize(rows[2].textContent)).toContain("−$ 85.001")
    expect(normalize(rows[3].textContent)).toContain("+$ 4.000.000")
    expect(screen.getByText(/Página 1 de 1/)).toBeInTheDocument()
  })

  it("filtra por tipo y guarda el filtro en la URL", async () => {
    stubTransactions({
      "GET /api/v1/finance/transactions?type=EXPENSE&size=20": { body: transactionPage([expense]) },
    })
    const router = renderAt("/finanzas/movimientos")

    await userEvent.selectOptions(await screen.findByLabelText("Tipo"), "EXPENSE")

    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(2))
    expect(router.state.location.search).toBe("?tipo=EXPENSE")
    expect(screen.getByRole("button", { name: "Quitar filtros" })).toBeInTheDocument()
  })

  it("registra un gasto con el monto en formato colombiano y la fecha de hoy", async () => {
    const fetchMock = stubTransactions({
      "POST /api/v1/finance/transactions": () => jsonResponse(expense, { status: 201 }),
    })
    renderAt("/finanzas/movimientos")

    await userEvent.click(await screen.findByRole("button", { name: "Nuevo movimiento" }))
    const dialog = await screen.findByRole("dialog", { name: "Nuevo movimiento" })
    await userEvent.type(within(dialog).getByLabelText("Monto"), "85.000,50")
    await userEvent.selectOptions(within(dialog).getByLabelText("Producto"), cardAccount.id)
    await userEvent.selectOptions(within(dialog).getByLabelText("Categoría"), "cat-groceries")
    await userEvent.type(within(dialog).getByLabelText("Comercio (opcional)"), "Éxito")
    await userEvent.click(within(dialog).getByRole("button", { name: "Registrar" }))

    expect(await screen.findByText("Movimiento registrado.")).toBeInTheDocument()
    expect(JSON.parse(String(requestWithMethod(fetchMock, "POST").body))).toEqual({
      type: "EXPENSE",
      amount: "85000.50",
      date: todayIn(testProfile.timeZone),
      merchant: "Éxito",
      sourceAccountId: cardAccount.id,
      categoryId: "cat-groceries",
    })
  })

  it("pide productos distintos en una transferencia", async () => {
    stubTransactions()
    renderAt("/finanzas/movimientos")

    await userEvent.click(await screen.findByRole("button", { name: "Nuevo movimiento" }))
    const dialog = await screen.findByRole("dialog", { name: "Nuevo movimiento" })
    await userEvent.click(within(dialog).getByRole("tab", { name: "Transferencia" }))
    await userEvent.type(within(dialog).getByLabelText("Monto"), "100.000")
    await userEvent.selectOptions(within(dialog).getByLabelText("Desde"), savingsAccount.id)
    await userEvent.selectOptions(within(dialog).getByLabelText("Hacia"), savingsAccount.id)
    await userEvent.click(within(dialog).getByRole("button", { name: "Registrar" }))

    expect(
      await within(dialog).findByText("El destino debe ser distinto del origen."),
    ).toBeInTheDocument()
    // "Otro" no lleva saldo: no se ofrece en las transferencias.
    expect(
      within(within(dialog).getByLabelText("Desde")).queryByText("Otro"),
    ).not.toBeInTheDocument()
  })

  it("edita un movimiento sin cambiar su tipo y muestra los errores del backend", async () => {
    const fetchMock = stubTransactions({
      "PUT /api/v1/finance/transactions/tx-income": problem(
        422,
        "finance.transaction.amount_invalid",
        "El monto debe ser mayor que cero.",
      ),
    })
    renderAt("/finanzas/movimientos")

    const incomeRow = (await screen.findAllByRole("row"))[3]
    await userEvent.click(
      within(incomeRow).getByRole("button", { name: "Acciones del movimiento" }),
    )
    await userEvent.click(await screen.findByRole("menuitem", { name: "Editar" }))
    const dialog = await screen.findByRole("dialog", { name: "Editar movimiento" })
    expect(within(dialog).queryByRole("tab")).not.toBeInTheDocument()
    expect(within(dialog).getByLabelText("Monto")).toHaveValue("4.000.000")
    expect(within(dialog).getByLabelText("Producto")).toHaveValue(income.destinationAccountId)
    await userEvent.click(within(dialog).getByRole("button", { name: "Guardar cambios" }))

    expect(await within(dialog).findByText("El monto debe ser mayor que cero.")).toBeInTheDocument()
    expect(JSON.parse(String(requestWithMethod(fetchMock, "PUT").body))).toMatchObject({
      type: "INCOME",
      amount: "4000000",
      destinationAccountId: savingsAccount.id,
      categoryId: income.categoryId,
    })
  })

  it("muestra un estado vacío cuando no hay movimientos", async () => {
    stubTransactions({ "GET /api/v1/finance/transactions?size=20": { body: transactionPage([]) } })
    renderAt("/finanzas/movimientos")

    expect(await screen.findByText("Aún no has registrado movimientos.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Registrar el primero" })).toBeInTheDocument()
  })
})
