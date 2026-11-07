import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { sessionQueryKey } from "@/features/auth/api/auth"
import { stubJsonResponse, stubNetworkFailure } from "@/test/http-stubs"
import { testProfile } from "@/test/render"
import { SystemStatusPage } from "./SystemStatusPage"

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  // La página muestra la hora en la zona horaria del perfil de la sesión.
  queryClient.setQueryData(sessionQueryKey, testProfile)
  return render(
    <QueryClientProvider client={queryClient}>
      <SystemStatusPage />
    </QueryClientProvider>,
  )
}

describe("SystemStatusPage", () => {
  it("muestra el sistema operativo cuando la API responde UP", async () => {
    stubJsonResponse({ status: "UP" })

    renderPage()

    expect(await screen.findByRole("status")).toHaveTextContent("Operativo")
  })

  it("muestra fallas cuando Actuator responde 503", async () => {
    stubJsonResponse(
      { status: "DOWN" },
      { status: 503, headers: { "Content-Type": "application/vnd.spring-boot.actuator.v3+json" } },
    )

    renderPage()

    expect(await screen.findByRole("status")).toHaveTextContent("Con fallas")
  })

  it("muestra sin conexión cuando la API no responde", async () => {
    stubNetworkFailure()

    renderPage()

    expect(await screen.findByRole("status")).toHaveTextContent("Sin conexión")
  })

  it("vuelve a consultar el estado al pulsar «Verificar ahora»", async () => {
    const fetchMock = stubJsonResponse({ status: "UP" })
    renderPage()
    await screen.findByRole("status")

    await userEvent.click(screen.getByRole("button", { name: "Verificar ahora" }))

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
