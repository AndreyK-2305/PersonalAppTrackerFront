import { TriangleAlertIcon } from "lucide-react"
import { useRouteError } from "react-router"
import { ErrorState } from "@/components/common/ErrorState"
import { Button } from "@/components/ui/button"

/** Último recurso ante un error de renderizado: nunca muestra detalles técnicos al usuario. */
export function RouteErrorPage() {
  const error = useRouteError()
  if (import.meta.env.DEV) {
    console.error(error)
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <ErrorState
        icon={TriangleAlertIcon}
        title="Algo salió mal"
        description="Ocurrió un error inesperado al mostrar esta página. Recarga para intentarlo de nuevo."
        action={<Button onClick={() => window.location.reload()}>Recargar</Button>}
      />
    </div>
  )
}
