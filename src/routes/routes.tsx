import { Navigate, type RouteObject } from "react-router"
import { SystemStatusPage } from "@/features/system-status/pages/SystemStatusPage"
import { AppLayout } from "@/layouts/AppLayout"
import { NotFoundPage } from "./NotFoundPage"
import { RouteErrorPage } from "./RouteErrorPage"

/** Rutas de la aplicación. Las rutas protegidas por sesión se agregan en la Etapa 2. */
export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to="/sistema" replace /> },
      { path: "sistema", element: <SystemStatusPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]
