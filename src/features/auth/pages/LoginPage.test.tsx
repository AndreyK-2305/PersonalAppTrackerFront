import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { problem, stubApi } from "@/test/http-stubs"
import { renderAt, testProfile } from "@/test/render"

const loggedOut = {
  "GET /api/v1/me": problem(401, "unauthorized"),
  "GET /api/v1/auth/registration": { body: { enabled: false } },
}

async function fillAndSubmit(email: string, password: string) {
  await userEvent.type(await screen.findByLabelText("Correo electrónico"), email)
  await userEvent.type(screen.getByLabelText("Contraseña"), password)
  await userEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }))
}

describe("LoginPage", () => {
  it("valida los campos antes de enviar", async () => {
    stubApi(loggedOut)
    renderAt("/iniciar-sesion")

    await userEvent.click(await screen.findByRole("button", { name: "Iniciar sesión" }))

    expect(await screen.findByText("Ingresa tu correo electrónico.")).toBeInTheDocument()
    expect(screen.getByText("Ingresa tu contraseña.")).toBeInTheDocument()
  })

  it("muestra el mensaje del backend si las credenciales no son válidas", async () => {
    stubApi({
      ...loggedOut,
      "POST /api/v1/auth/login": problem(
        401,
        "identity.invalid_credentials",
        "El correo o la contraseña no son correctos.",
      ),
    })
    const router = renderAt("/iniciar-sesion")

    await fillAndSubmit("kevin@example.com", "incorrecta")

    expect(
      await screen.findByText("El correo o la contraseña no son correctos."),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/iniciar-sesion")
  })

  it("tras iniciar sesión lleva a la página que se había solicitado", async () => {
    stubApi({ ...loggedOut, "POST /api/v1/auth/login": { body: testProfile } })
    const router = renderAt("/iniciar-sesion?redirect=%2Fajustes%2Fperfil")

    await fillAndSubmit("kevin@example.com", "contraseña-segura-1")

    expect(await screen.findByRole("heading", { name: "Mi perfil" })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/ajustes/perfil")
  })

  it("ofrece crear una cuenta solo si el registro está habilitado", async () => {
    stubApi({ ...loggedOut, "GET /api/v1/auth/registration": { body: { enabled: true } } })
    renderAt("/iniciar-sesion")

    expect(await screen.findByRole("link", { name: "Crear una cuenta" })).toHaveAttribute(
      "href",
      "/registro",
    )
  })
})
