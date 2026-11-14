import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { deviceToken } from "@/test/capture-fixtures"
import { jsonResponse, noContent, requestWithMethod, stubApi } from "@/test/http-stubs"
import { renderAt, testProfile } from "@/test/render"

const SECRET = "ptd_secreto-de-prueba-que-solo-se-ve-una-vez"

describe("ConnectionsPage", () => {
  it("crea un token y muestra el secreto una sola vez con las instrucciones del atajo", async () => {
    const fetchMock = stubApi({
      "GET /api/v1/me": { body: testProfile },
      "GET /api/v1/me/device-tokens": { body: [] },
      "POST /api/v1/me/device-tokens": () =>
        jsonResponse({ token: deviceToken, secret: SECRET }, { status: 201 }),
    })
    renderAt("/ajustes/conexiones")

    await userEvent.click(await screen.findByRole("button", { name: "Conectar el primero" }))
    const dialog = await screen.findByRole("dialog", { name: "Conectar un dispositivo" })
    await userEvent.clear(within(dialog).getByLabelText("Nombre del dispositivo"))
    await userEvent.type(within(dialog).getByLabelText("Nombre del dispositivo"), "iPhone de Ana")
    await userEvent.click(within(dialog).getByRole("button", { name: "Crear token" }))

    const secretDialog = await screen.findByRole("dialog", { name: "Copia el token ahora" })
    expect(within(secretDialog).getByLabelText("Token")).toHaveValue(SECRET)
    expect(secretDialog).toHaveTextContent("/api/v1/device/capture/notifications")
    expect(secretDialog).toHaveTextContent("Solo se muestra esta vez")
    expect(JSON.parse(String(requestWithMethod(fetchMock, "POST").body))).toEqual({
      name: "iPhone de Ana",
      scopes: ["FINANCE_CAPTURE"],
    })

    const toggle = within(secretDialog).getByRole("button", { name: "Ver paso a paso del atajo" })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "true")
    const guide = within(secretDialog).getByRole("region", { name: "Cómo configurar el atajo" })
    expect(guide).toHaveTextContent("Obtener contenido de URL")
    expect(guide).toHaveTextContent('app = "Mensajes"')
    expect(guide).not.toHaveTextContent(SECRET)

    await userEvent.click(within(secretDialog).getByRole("button", { name: "Listo" }))
    expect(screen.queryByText(SECRET)).not.toBeInTheDocument()
  })

  it("muestra la guía del atajo y copia las instrucciones para Siri sin el token", async () => {
    const user = userEvent.setup()
    stubApi({
      "GET /api/v1/me": { body: testProfile },
      "GET /api/v1/me/device-tokens": { body: [deviceToken] },
    })
    renderAt("/ajustes/conexiones")

    await user.click(await screen.findByRole("button", { name: "Guía del atajo" }))
    const dialog = await screen.findByRole("dialog", { name: "Guía del atajo" })
    expect(dialog).toHaveTextContent(
      `${window.location.origin}/api/v1/device/capture/notifications`,
    )

    await user.click(within(dialog).getByRole("button", { name: "Copiar instrucciones para Siri" }))
    expect(
      await within(dialog).findByRole("button", { name: "Instrucciones copiadas" }),
    ).toBeInTheDocument()
    const copied = await navigator.clipboard.readText()
    expect(copied).toContain("Authorization: Bearer <pega aquí tu token>")
    expect(copied).toContain('app = "Wallet"')
  })

  it("desconecta un dispositivo tras confirmarlo", async () => {
    stubApi({
      "GET /api/v1/me": { body: testProfile },
      "GET /api/v1/me/device-tokens": { body: [deviceToken] },
      "DELETE /api/v1/me/device-tokens/tok-1": noContent,
    })
    renderAt("/ajustes/conexiones")

    const card = await screen.findByRole("article", { name: "iPhone" })
    expect(card).toHaveTextContent("Finanzas: captura de notificaciones")
    await userEvent.click(within(card).getByRole("button", { name: "Desconectar" }))
    const dialog = await screen.findByRole("alertdialog")
    await userEvent.click(within(dialog).getByRole("button", { name: "Desconectar" }))

    expect(await screen.findByText("Dispositivo desconectado.")).toBeInTheDocument()
  })
})
