import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { cashAccount, financeApi } from "@/test/finance-fixtures"
import { jsonResponse, problem, requestWithMethod, stubApi } from "@/test/http-stubs"
import { renderAt, testProfile } from "@/test/render"

const normalize = (text: string | null) => (text ?? "").normalize("NFKC")

function stubAccounts(extra: Parameters<typeof stubApi>[0] = {}) {
  return stubApi({ "GET /api/v1/me": { body: testProfile }, ...financeApi(), ...extra })
}

describe("AccountsPage", () => {
  it("muestra el patrimonio, los saldos y la deuda de las tarjetas", async () => {
    stubAccounts()
    renderAt("/finanzas/productos")

    const savings = await screen.findByRole("article", { name: "Ahorros" })
    expect(normalize(savings.textContent)).toContain("Bancolombia")
    expect(normalize(savings.textContent)).toContain("•••• 1234")
    expect(normalize(savings.textContent)).toContain("$ 4.630.000")

    const card = screen.getByRole("article", { name: "Visa" })
    expect(normalize(card.textContent)).toContain("Deuda$ 350.001")
    expect(normalize(card.textContent)).toContain("Disponible $ 2.650.000 de $ 3.000.000")

    expect(normalize(screen.getByText("Patrimonio").parentElement?.textContent ?? "")).toContain(
      "$ 4.317.999",
    )
    expect(screen.getByText("Producto de sistema")).toBeInTheDocument()
  })

  it("crea un producto con el monto en formato colombiano", async () => {
    const fetchMock = stubAccounts({
      "POST /api/v1/finance/accounts": () => jsonResponse(cashAccount, { status: 201 }),
    })
    renderAt("/finanzas/productos")

    await userEvent.click(await screen.findByRole("button", { name: "Nuevo producto" }))
    const dialog = await screen.findByRole("dialog", { name: "Nuevo producto" })
    await userEvent.type(within(dialog).getByLabelText("Nombre"), "Alcancía")
    await userEvent.type(within(dialog).getByLabelText("Saldo inicial"), "1.500.000,50")
    await userEvent.click(within(dialog).getByRole("button", { name: "Crear producto" }))

    expect(await screen.findByText("Producto creado.")).toBeInTheDocument()
    expect(JSON.parse(String(requestWithMethod(fetchMock, "POST").body))).toEqual({
      kind: "CASH",
      name: "Alcancía",
      openingBalance: "1500000.50",
    })
  })

  it("pide los datos de la tarjeta y valida en el navegador", async () => {
    stubAccounts()
    renderAt("/finanzas/productos")

    await userEvent.click(await screen.findByRole("button", { name: "Nuevo producto" }))
    const dialog = await screen.findByRole("dialog", { name: "Nuevo producto" })
    await userEvent.selectOptions(within(dialog).getByLabelText("Tipo"), "CREDIT_CARD")
    await userEvent.type(within(dialog).getByLabelText("Nombre"), "Mastercard")
    await userEvent.type(within(dialog).getByLabelText("Cupo"), "150.5")
    await userEvent.click(within(dialog).getByRole("button", { name: "Crear producto" }))

    expect(
      await within(dialog).findByText("Escribe la entidad, por ejemplo Bancolombia."),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText("Escribe un monto mayor que cero, por ejemplo 150.000,50."),
    ).toBeInTheDocument()
    expect(within(dialog).queryByLabelText("Saldo inicial")).not.toBeInTheDocument()
  })

  it("muestra en su campo que el nombre ya existe", async () => {
    stubAccounts({
      "POST /api/v1/finance/accounts": problem(
        409,
        "finance.account.name_taken",
        "Ya tienes un producto con ese nombre.",
      ),
    })
    renderAt("/finanzas/productos")

    await userEvent.click(await screen.findByRole("button", { name: "Nuevo producto" }))
    const dialog = await screen.findByRole("dialog", { name: "Nuevo producto" })
    await userEvent.type(within(dialog).getByLabelText("Nombre"), "Billetera")
    await userEvent.click(within(dialog).getByRole("button", { name: "Crear producto" }))

    expect(
      await within(dialog).findByText("Ya tienes un producto con ese nombre."),
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Nombre")).toHaveAttribute("aria-invalid", "true")
  })

  it("confirma antes de eliminar y explica por qué no se pudo", async () => {
    const fetchMock = stubAccounts({
      "DELETE /api/v1/finance/accounts/acc-cash": problem(
        409,
        "finance.account.has_transactions",
        "El producto tiene movimientos. Archívalo en lugar de borrarlo.",
      ),
    })
    renderAt("/finanzas/productos")

    await userEvent.click(await screen.findByRole("button", { name: "Acciones de Billetera" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Eliminar" }))
    const confirm = await screen.findByRole("alertdialog", { name: "¿Eliminar Billetera?" })
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false)
    await userEvent.click(within(confirm).getByRole("button", { name: "Eliminar" }))

    expect(
      await screen.findByText("El producto tiene movimientos. Archívalo en lugar de borrarlo."),
    ).toBeInTheDocument()
  })
})
