import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { describe, expect, it } from "vitest"
import { AppProviders } from "@/app/providers"
import { stubJsonResponse } from "@/test/http-stubs"
import { routes } from "./routes"

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

describe("rutas", () => {
  it("redirige la raíz al estado del sistema dentro del layout con navegación", async () => {
    stubJsonResponse({ status: "UP" })

    const router = renderAt("/")

    expect(await screen.findByRole("heading", { name: "Estado del sistema" })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/sistema")
    expect(screen.getByRole("link", { name: "Estado del sistema" })).toHaveAttribute(
      "aria-current",
      "page",
    )
  })

  it("muestra la página no encontrada para rutas desconocidas", async () => {
    renderAt("/no-existe")

    expect(await screen.findByRole("heading", { name: "Página no encontrada" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toHaveAttribute("href", "/")
  })
})
