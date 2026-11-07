import type { ComponentType } from "react"
import { Navigate, type RouteObject } from "react-router"
import { LoadingScreen } from "@/components/common/LoadingScreen"
import { FinanceGate } from "@/features/finance/components/FinanceGate"
import { AppLayout } from "@/layouts/AppLayout"
import { AuthLayout } from "@/layouts/AuthLayout"
import { PublicOnlyRoute, RequireSession } from "./guards"
import { NotFoundPage } from "./NotFoundPage"
import { RouteErrorPage } from "./RouteErrorPage"

/**
 * Carga diferida de una página: cada una queda en su propio archivo JS y se descarga al visitarla
 * por primera vez. Así la carga inicial no incluye, por ejemplo, las gráficas del resumen.
 */
function page<T>(load: () => Promise<T>, pick: (module: T) => ComponentType) {
  return async () => ({ Component: pick(await load()) })
}

/**
 * Rutas de la aplicación. Todo requiere sesión salvo el inicio de sesión y el registro; una ruta
 * desconocida también pasa por la sesión antes de mostrar la página no encontrada. Las rutas de
 * finanzas pasan por la bienvenida (FinanceGate) hasta que el usuario la completa.
 */
export const routes: RouteObject[] = [
  {
    path: "/",
    errorElement: <RouteErrorPage />,
    HydrateFallback: LoadingScreen,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              {
                path: "iniciar-sesion",
                lazy: page(
                  () => import("@/features/auth/pages/LoginPage"),
                  (m) => m.LoginPage,
                ),
              },
              {
                path: "registro",
                lazy: page(
                  () => import("@/features/auth/pages/RegisterPage"),
                  (m) => m.RegisterPage,
                ),
              },
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
              { index: true, element: <Navigate to="/finanzas" replace /> },
              {
                path: "finanzas",
                element: <FinanceGate />,
                children: [
                  {
                    index: true,
                    lazy: page(
                      () => import("@/features/finance/pages/FinanceSummaryPage"),
                      (m) => m.FinanceSummaryPage,
                    ),
                  },
                  {
                    path: "movimientos",
                    lazy: page(
                      () => import("@/features/finance/pages/TransactionsPage"),
                      (m) => m.TransactionsPage,
                    ),
                  },
                  {
                    path: "productos",
                    lazy: page(
                      () => import("@/features/finance/pages/AccountsPage"),
                      (m) => m.AccountsPage,
                    ),
                  },
                  {
                    path: "categorias",
                    lazy: page(
                      () => import("@/features/finance/pages/CategoriesPage"),
                      (m) => m.CategoriesPage,
                    ),
                  },
                ],
              },
              {
                path: "sistema",
                lazy: page(
                  () => import("@/features/system-status/pages/SystemStatusPage"),
                  (m) => m.SystemStatusPage,
                ),
              },
              {
                path: "perfil",
                lazy: page(
                  () => import("@/features/profile/pages/ProfilePage"),
                  (m) => m.ProfilePage,
                ),
              },
              { path: "*", element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]
