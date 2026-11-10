import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import {
  accountsWithWallet,
  dollarReview,
  ownTransferReview,
  rappiWallet,
  unrecognizedReview,
} from "@/test/capture-fixtures"
import { expense, financeApi, transactionPage, transfer } from "@/test/finance-fixtures"
import { jsonResponse, noContent, requestWithMethod, stubApi } from "@/test/http-stubs"
import { renderAt, testProfile } from "@/test/render"

function stubReviews(extra: Parameters<typeof stubApi>[0] = {}) {
  return stubApi({
    "GET /api/v1/me": { body: testProfile },
    ...financeApi(),
    "GET /api/v1/finance/accounts": { body: accountsWithWallet },
    "GET /api/v1/capture/reviews": { body: [ownTransferReview, dollarReview, unrecognizedReview] },
    ...extra,
  })
}

function body(fetchMock: ReturnType<typeof stubApi>, method: string, path: string) {
  const call = fetchMock.mock.calls.find(
    ([input, init]) =>
      String(input) === path && (init as RequestInit | undefined)?.method === method,
  )
  if (!call) {
    throw new Error(`No se envió ${method} ${path}`)
  }
  const raw = (call[1] as RequestInit).body
  return raw ? JSON.parse(String(raw)) : undefined
}

describe("Movimientos › Por revisar", () => {
  it("muestra cuántas hay y explica cada motivo con el texto de la notificación", async () => {
    stubReviews()
    renderAt("/finanzas/movimientos?vista=revisar")

    expect(
      await screen.findByRole("article", { name: "¿Transferencia a ti mismo?" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /Por revisar/ })).toHaveTextContent("3")
    expect(screen.getByRole("article", { name: "Compra en dólares sin TRM" })).toHaveTextContent(
      "ANTHROPIC",
    )
    expect(screen.getByRole("article", { name: "Notificación no reconocida" })).toHaveTextContent(
      "El texto ya se borró",
    )
  })

  it("«Es mía» la convierte en transferencia hacia la cuenta elegida", async () => {
    const fetchMock = stubReviews({
      "POST /api/v1/capture/reviews/rev-own/own-transfer": noContent,
    })
    renderAt("/finanzas/movimientos?vista=revisar")

    const card = await screen.findByRole("article", { name: "¿Transferencia a ti mismo?" })
    await userEvent.selectOptions(within(card).getByLabelText("Fue a"), rappiWallet.id)
    await userEvent.click(within(card).getByRole("button", { name: "Es mía" }))

    expect(
      await screen.findByText("Registrada como transferencia entre tus cuentas."),
    ).toBeInTheDocument()
    expect(body(fetchMock, "POST", "/api/v1/capture/reviews/rev-own/own-transfer")).toEqual({
      destinationProductId: rappiWallet.id,
    })
  })

  it("«Es mía» usa la primera cuenta disponible aunque las cuentas lleguen después", async () => {
    // Regresión: la cuenta por defecto se fijaba en el primer render, antes de que llegaran las
    // cuentas, y el botón quedaba deshabilitado.
    const fetchMock = stubReviews({
      "GET /api/v1/finance/accounts": async () => {
        await new Promise((resolve) => setTimeout(resolve, 300))
        return jsonResponse(accountsWithWallet)
      },
      "POST /api/v1/capture/reviews/rev-own/own-transfer": noContent,
    })
    renderAt("/finanzas/movimientos?vista=revisar")

    const card = await screen.findByRole("article", { name: "¿Transferencia a ti mismo?" })
    const ownButton = await within(card).findByRole("button", { name: "Es mía" })
    expect(ownButton).toBeEnabled()
    await userEvent.click(ownButton)

    expect(
      await screen.findByText("Registrada como transferencia entre tus cuentas."),
    ).toBeInTheDocument()
    expect(body(fetchMock, "POST", "/api/v1/capture/reviews/rev-own/own-transfer")).toEqual({
      destinationProductId: rappiWallet.id,
    })
  })

  it("registra una compra en dólares con el valor en pesos escrito en formato colombiano", async () => {
    const fetchMock = stubReviews({
      "POST /api/v1/capture/reviews/rev-usd/amount": noContent,
    })
    renderAt("/finanzas/movimientos?vista=revisar")

    const card = await screen.findByRole("article", { name: "Compra en dólares sin TRM" })
    await userEvent.type(within(card).getByLabelText("Valor en pesos"), "65.120,50")
    await userEvent.click(within(card).getByRole("button", { name: "Registrar" }))

    expect(await screen.findByText("Compra registrada.")).toBeInTheDocument()
    expect(body(fetchMock, "POST", "/api/v1/capture/reviews/rev-usd/amount")).toEqual({
      amount: "65120.50",
    })
  })

  it("rechaza un valor en pesos ambiguo sin llamar a la API", async () => {
    const fetchMock = stubReviews()
    renderAt("/finanzas/movimientos?vista=revisar")

    const card = await screen.findByRole("article", { name: "Compra en dólares sin TRM" })
    await userEvent.type(within(card).getByLabelText("Valor en pesos"), "65.5")
    await userEvent.click(within(card).getByRole("button", { name: "Registrar" }))

    expect(await within(card).findByText(/Escribe un monto válido/)).toBeInTheDocument()
    expect(() => requestWithMethod(fetchMock, "POST")).toThrow()
  })

  it("descarta una notificación tras confirmarlo", async () => {
    const fetchMock = stubReviews({
      "POST /api/v1/capture/reviews/rev-text/discard": noContent,
    })
    renderAt("/finanzas/movimientos?vista=revisar")

    const card = await screen.findByRole("article", { name: "Notificación no reconocida" })
    await userEvent.click(within(card).getByRole("button", { name: "Descartar" }))
    const dialog = await screen.findByRole("alertdialog")
    await userEvent.click(within(dialog).getByRole("button", { name: "Descartar" }))

    expect(await screen.findByText("Notificación descartada.")).toBeInTheDocument()
    expect(body(fetchMock, "POST", "/api/v1/capture/reviews/rev-text/discard")).toBeUndefined()
  })
})

describe("Movimientos › captura", () => {
  it("«Por clasificar» pide solo los movimientos sin categoría", async () => {
    stubReviews({
      "GET /api/v1/finance/transactions?uncategorized=true&size=20": {
        body: transactionPage([{ ...expense, categoryId: undefined }]),
      },
    })
    const router = renderAt("/finanzas/movimientos")

    await userEvent.click(await screen.findByRole("tab", { name: "Por clasificar" }))

    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(2))
    expect(router.state.location.search).toBe("?vista=clasificar")
    expect(screen.getByText("Sin categoría")).toBeInTheDocument()
  })

  it("marca los movimientos captados y los montos estimados, y ofrece «No es mía» en transferencias captadas", async () => {
    const capturedTransfer = { ...transfer, origin: "CAPTURE" as const }
    const estimatedExpense = { ...expense, origin: "CAPTURE" as const, amountEstimated: true }
    const fetchMock = stubReviews({
      "GET /api/v1/finance/transactions?size=20": {
        body: transactionPage([capturedTransfer, estimatedExpense]),
      },
      "POST /api/v1/capture/transactions/tx-transfer/not-own": noContent,
    })
    renderAt("/finanzas/movimientos")

    const rows = await screen.findAllByRole("row")
    expect(rows[1]).toHaveTextContent("Captado")
    expect(rows[2]).toHaveTextContent("Monto estimado")

    await userEvent.click(within(rows[1]).getByRole("button", { name: "Acciones del movimiento" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: /No es mía/ }))

    expect(await screen.findByText("Registrada como gasto.")).toBeInTheDocument()
    expect(
      body(fetchMock, "POST", "/api/v1/capture/transactions/tx-transfer/not-own"),
    ).toBeUndefined()
  })
})
