import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { financeApi, foodCategory } from "@/test/finance-fixtures"
import { jsonResponse, requestWithMethod, stubApi } from "@/test/http-stubs"
import { renderAt, testProfile } from "@/test/render"

describe("CategoriesPage", () => {
  it("muestra los gastos con sus subcategorías y los ingresos en otra pestaña", async () => {
    stubApi({ "GET /api/v1/me": { body: testProfile }, ...financeApi() })
    renderAt("/finanzas/categorias")

    expect(await screen.findByText("Alimentación")).toBeInTheDocument()
    expect(screen.getByText("Mercado")).toBeInTheDocument()
    expect(screen.queryByText("Salario")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("tab", { name: "Ingresos" }))

    expect(await screen.findByText("Salario")).toBeInTheDocument()
  })

  it("agrega una subcategoría desde su categoría principal", async () => {
    const fetchMock = stubApi({
      "GET /api/v1/me": { body: testProfile },
      ...financeApi(),
      "POST /api/v1/finance/categories": (init) =>
        jsonResponse(
          { id: "cat-new", archived: false, subcategories: [], ...JSON.parse(String(init?.body)) },
          { status: 201 },
        ),
    })
    renderAt("/finanzas/categorias")

    await userEvent.click(await screen.findByRole("button", { name: "Acciones de Alimentación" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Agregar subcategoría" }))
    const dialog = await screen.findByRole("dialog", { name: "Nueva categoría" })
    expect(within(dialog).getByLabelText("Categoría principal")).toHaveValue(foodCategory.id)
    await userEvent.type(within(dialog).getByLabelText("Nombre"), "Domicilios")
    await userEvent.click(within(dialog).getByRole("button", { name: "Crear categoría" }))

    expect(await screen.findByText("Categoría creada.")).toBeInTheDocument()
    expect(JSON.parse(String(requestWithMethod(fetchMock, "POST").body))).toEqual({
      kind: "EXPENSE",
      name: "Domicilios",
      parentId: foodCategory.id,
    })
  })

  it("renombra una categoría", async () => {
    const fetchMock = stubApi({
      "GET /api/v1/me": { body: testProfile },
      ...financeApi(),
      "PATCH /api/v1/finance/categories/cat-food": () => new Response(null, { status: 204 }),
    })
    renderAt("/finanzas/categorias")

    await userEvent.click(await screen.findByRole("button", { name: "Acciones de Alimentación" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Renombrar" }))
    const dialog = await screen.findByRole("dialog", { name: "Renombrar categoría" })
    const name = within(dialog).getByLabelText("Nombre")
    await userEvent.clear(name)
    await userEvent.type(name, "Comida")
    await userEvent.click(within(dialog).getByRole("button", { name: "Guardar" }))

    expect(await screen.findByText("Categoría renombrada.")).toBeInTheDocument()
    expect(JSON.parse(String(requestWithMethod(fetchMock, "PATCH").body))).toEqual({
      name: "Comida",
    })
  })
})
