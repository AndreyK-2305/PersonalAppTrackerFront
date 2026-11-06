import { describe, expect, it } from "vitest"
import { loginPathFor, safeRedirect } from "./redirect"

describe("safeRedirect", () => {
  it("acepta rutas internas", () => {
    expect(safeRedirect("/perfil")).toBe("/perfil")
    expect(safeRedirect("/sistema?x=1")).toBe("/sistema?x=1")
  })

  it("descarta destinos externos o vacíos", () => {
    for (const value of [
      null,
      "",
      "https://malicioso.com",
      "//malicioso.com",
      "/\\malicioso.com",
    ]) {
      expect(safeRedirect(value)).toBe("/")
    }
  })
})

describe("loginPathFor", () => {
  it("codifica la ruta solicitada", () => {
    expect(loginPathFor("/perfil?tab=1")).toBe("/iniciar-sesion?redirect=%2Fperfil%3Ftab%3D1")
  })
})
