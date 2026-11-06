import { render } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { AppProviders } from "@/app/providers"
import type { Profile } from "@/features/auth/api/auth"
import { routes } from "@/routes/routes"

/** Renderiza la aplicación completa (providers y rutas reales) en la ruta indicada. */
export function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

export const testProfile: Profile = {
  id: "8f6f2c1e-4a43-4c7b-9a51-1f0d1d6b2a10",
  email: "kevin@example.com",
  displayName: "Kevin Jaimes",
  timeZone: "America/Bogota",
  createdAt: "2026-11-01T14:00:00Z",
  lastLoginAt: "2026-11-06T14:30:00Z",
}
