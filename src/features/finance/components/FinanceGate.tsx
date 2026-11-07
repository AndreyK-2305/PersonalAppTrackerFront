import { useQuery } from "@tanstack/react-query"
import { WalletIcon } from "lucide-react"
import { Outlet } from "react-router"
import { ErrorState } from "@/components/common/ErrorState"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { financeStatusQueryOptions } from "../api/finance"
import { FinanceWelcome } from "./FinanceWelcome"

/**
 * Entrada a las rutas de finanzas: mientras el usuario no complete la bienvenida (ADR-0014), muestra
 * esa pantalla en lugar de la página pedida.
 */
export function FinanceGate() {
  const status = useQuery(financeStatusQueryOptions)

  if (status.isPending) {
    return (
      <div className="space-y-4" aria-label="Cargando finanzas">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }
  if (status.isError) {
    return (
      <ErrorState
        icon={WalletIcon}
        title="No fue posible cargar tus finanzas"
        description={status.error.message}
        action={<Button onClick={() => status.refetch()}>Reintentar</Button>}
      />
    )
  }
  return status.data.setUp ? <Outlet /> : <FinanceWelcome />
}
