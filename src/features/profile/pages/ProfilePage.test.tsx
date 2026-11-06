import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { jsonResponse, problem, requestWithMethod, stubApi } from "@/test/http-stubs"
import { renderAt, testProfile } from "@/test/render"

describe("ProfilePage", () => {
  it("guarda el nombre y la zona horaria", async () => {
    const fetchMock = stubApi({
      "GET /api/v1/me": { body: testProfile },
      "PATCH /api/v1/me": (init) =>
        jsonResponse({ ...testProfile, ...JSON.parse(String(init?.body)) }),
    })
    renderAt("/perfil")

    const name = await screen.findByLabelText("Nombre")
    await userEvent.clear(name)
    await userEvent.type(name, "Kevin A. Jaimes")
    await userEvent.selectOptions(screen.getByLabelText("Zona horaria"), "Europe/Madrid")
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }))

    expect(await screen.findByText("Perfil actualizado.")).toBeInTheDocument()
    expect(JSON.parse(String(requestWithMethod(fetchMock, "PATCH").body))).toEqual({
      displayName: "Kevin A. Jaimes",
      timeZone: "Europe/Madrid",
    })
  })

  it("exige que la confirmación de la contraseña nueva coincida", async () => {
    stubApi({ "GET /api/v1/me": { body: testProfile } })
    renderAt("/perfil")

    await userEvent.type(await screen.findByLabelText("Contraseña actual"), "contraseña-actual-1")
    await userEvent.type(screen.getByLabelText("Contraseña nueva"), "contraseña-nueva-22")
    await userEvent.type(screen.getByLabelText("Confirmar contraseña nueva"), "otra-distinta-333")
    await userEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }))

    expect(await screen.findByText("Las contraseñas no coinciden.")).toBeInTheDocument()
  })

  it("muestra en su campo que la contraseña actual es incorrecta", async () => {
    stubApi({
      "GET /api/v1/me": { body: testProfile },
      "PUT /api/v1/me/password": problem(
        422,
        "identity.current_password_incorrect",
        "La contraseña actual no es correcta.",
      ),
    })
    renderAt("/perfil")

    await userEvent.type(await screen.findByLabelText("Contraseña actual"), "no-es-la-actual")
    await userEvent.type(screen.getByLabelText("Contraseña nueva"), "contraseña-nueva-22")
    await userEvent.type(screen.getByLabelText("Confirmar contraseña nueva"), "contraseña-nueva-22")
    await userEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }))

    expect(await screen.findByText("La contraseña actual no es correcta.")).toBeInTheDocument()
    expect(screen.getByLabelText("Contraseña actual")).toHaveAttribute("aria-invalid", "true")
  })
})
