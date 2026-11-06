import { Navigate, type RouteObject } from "react-router"
import { LoginPage } from "@/features/auth/pages/LoginPage"
import { RegisterPage } from "@/features/auth/pages/RegisterPage"
import { ProfilePage } from "@/features/profile/pages/ProfilePage"
import { SystemStatusPage } from "@/features/system-status/pages/SystemStatusPage"
import { AppLayout } from "@/layouts/AppLayout"
import { AuthLayout } from "@/layouts/AuthLayout"
import { PublicOnlyRoute, RequireSession } from "./guards"
import { NotFoundPage } from "./NotFoundPage"
import { RouteErrorPage } from "./RouteErrorPage"

/**
 * Rutas de la aplicación. Todo requiere sesión salvo el inicio de sesión y el registro; una ruta
 * desconocida también pasa por la sesión antes de mostrar la página no encontrada.
 */
export const routes: RouteObject[] = [
  {
    path: "/",
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: "iniciar-sesion", element: <LoginPage /> },
              { path: "registro", element: <RegisterPage /> },
            ],
          },
        ],
      },
      {
        element: <RequireSession />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <Navigate to="/sistema" replace /> },
              { path: "sistema", element: <SystemStatusPage /> },
              { path: "perfil", element: <ProfilePage /> },
              { path: "*", element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]
