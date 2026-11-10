import { screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { financeApi } from "@/test/finance-fixtures"
import { problem, stubApi } from "@/test/http-stubs"
import { renderAt, testProfile } from "@/test/render"

describe("rutas", () => {
  it("con sesión, redirige la raíz al resumen de finanzas dentro del layout", async () => {
    stubApi({ "GET /api/v1/me": { body: testProfile }, ...financeApi() })

    const router = renderAt("/")

    expect(await screen.findByRole("heading", { name: "Resumen" })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/finanzas")
    expect(screen.getByRole("link", { name: "Resumen" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Movimientos" })).not.toHaveAttribute("aria-current")
    expect(screen.getByRole("button", { name: "Menú de la cuenta" })).toHaveTextContent(
      testProfile.displayName,
    )
  })

  it("sin sesión, lleva al inicio de sesión recordando la página pedida", async () => {
    stubApi({
      "GET /api/v1/me": problem(401, "unauthorized"),
      "GET /api/v1/auth/registration": { body: { enabled: false } },
    })

    const router = renderAt("/ajustes/perfil")

    await waitFor(() => expect(router.state.location.pathname).toBe("/iniciar-sesion"))
    expect(router.state.location.search).toBe("?redirect=%2Fajustes%2Fperfil")
    expect(await screen.findByLabelText("Correo electrónico")).toBeInTheDocument()
  })

  it("con sesión, no muestra el inicio de sesión", async () => {
    stubApi({ "GET /api/v1/me": { body: testProfile }, ...financeApi() })

    const router = renderAt("/iniciar-sesion")

    await waitFor(() => expect(router.state.location.pathname).toBe("/finanzas"))
  })

  it("muestra la página no encontrada para rutas desconocidas", async () => {
    stubApi({ "GET /api/v1/me": { body: testProfile } })

    renderAt("/no-existe")

    expect(await screen.findByRole("heading", { name: "Página no encontrada" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/")
  })

  it("las rutas anteriores de perfil y sistema llevan a Ajustes", async () => {
    stubApi({ "GET /api/v1/me": { body: testProfile } })

    const router = renderAt("/perfil")

    await waitFor(() => expect(router.state.location.pathname).toBe("/ajustes/perfil"))
  })
})
