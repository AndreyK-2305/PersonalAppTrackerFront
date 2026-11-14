import { describe, expect, it } from "vitest"
import { shortcutInstructions, TOKEN_PLACEHOLDER } from "./shortcut-guide"

describe("shortcutInstructions", () => {
  const text = shortcutInstructions(
    "https://track.cuadre.click/api/v1/device/capture/notifications",
  )

  it("lleva la dirección, el método y las cabeceras de la captura", () => {
    expect(text).toContain("URL: https://track.cuadre.click/api/v1/device/capture/notifications")
    expect(text).toContain("Método: POST")
    expect(text).toContain(`Authorization: Bearer ${TOKEN_PLACEHOLDER}`)
    expect(text).toContain("Content-Type: application/json")
  })

  it("pide los cuatro campos del cuerpo y la fecha en ISO 8601 con hora", () => {
    for (const field of ["app:", "title:", "body:", "receivedAt:"]) {
      expect(text).toContain(field)
    }
    expect(text).toContain("ISO 8601 e incluyendo la hora")
  })

  it("usa los nombres de app que reconocen los analizadores", () => {
    expect(text).toContain('app = "Mensajes"')
    expect(text).toContain("remitente 85540")
    expect(text).toContain('app = "Rappi"')
    expect(text).toContain('app = "Wallet"')
  })
})
