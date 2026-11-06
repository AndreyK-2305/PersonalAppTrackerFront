import { ShieldAlertIcon } from "lucide-react"
import { Navigate, Outlet, useLocation, useSearchParams } from "react-router"
import { ErrorState } from "@/components/common/ErrorState"
import { LoadingScreen } from "@/components/common/LoadingScreen"
import { Button } from "@/components/ui/button"
import { useSession } from "@/features/auth/hooks/use-auth"
import { loginPathFor, safeRedirect } from "@/features/auth/redirect"

/**
 * Rutas que requieren sesión. Si no la hay (o expira mientras se usa la aplicación), redirige al
 * inicio de sesión recordando la página solicitada. La protección real está en el backend.
 */
export function RequireSession() {
  const session = useSession()
  const location = useLocation()

  if (session.isPending) {
    return <LoadingScreen />
  }
  if (session.isError) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <ErrorState
          icon={ShieldAlertIcon}
          title="No fue posible verificar tu sesión"
          description={session.error.message}
          action={<Button onClick={() => session.refetch()}>Reintentar</Button>}
        />
      </div>
    )
  }
  if (!session.data) {
    return <Navigate to={loginPathFor(location.pathname + location.search)} replace />
  }
  return <Outlet />
}

/** Inicio de sesión y registro: con una sesión activa no tiene sentido mostrarlos. */
export function PublicOnlyRoute() {
  const session = useSession()
  const [searchParams] = useSearchParams()

  if (session.isPending) {
    return <LoadingScreen />
  }
  if (session.data) {
    return <Navigate to={safeRedirect(searchParams.get("redirect"))} replace />
  }
  return <Outlet />
}
