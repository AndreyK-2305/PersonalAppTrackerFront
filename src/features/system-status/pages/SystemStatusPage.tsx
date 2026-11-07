import { useQuery } from "@tanstack/react-query"
import {
  CircleCheckIcon,
  CircleXIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentProfile } from "@/features/auth/hooks/use-auth"
import { formatDateTime } from "@/lib/format"
import { ApiError } from "@/lib/http"
import { cn } from "@/lib/utils"
import { HEALTH_REFRESH_INTERVAL_MS, healthQueryOptions, type HealthResponse } from "../api/health"

type SystemState = "operational" | "degraded" | "unreachable"

const STATES: Record<
  SystemState,
  { label: string; description: string; icon: LucideIcon; tone: string }
> = {
  operational: {
    label: "Operativo",
    description: "La API y la base de datos responden correctamente.",
    icon: CircleCheckIcon,
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  degraded: {
    label: "Con fallas",
    description:
      "La API responde, pero alguno de sus componentes (por ejemplo, la base de datos) no está disponible.",
    icon: TriangleAlertIcon,
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  unreachable: {
    label: "Sin conexión",
    description: "No fue posible contactar la API. Verifica que el backend esté en ejecución.",
    icon: CircleXIcon,
    tone: "bg-destructive/10 text-destructive",
  },
}

function toSystemState(data: HealthResponse | undefined, error: Error | null): SystemState {
  if (data) {
    return data.status === "UP" ? "operational" : "degraded"
  }
  // Actuator responde 503 cuando la API está activa pero un componente falla.
  return error instanceof ApiError && error.status === 503 ? "degraded" : "unreachable"
}

export function SystemStatusPage() {
  const health = useQuery(healthQueryOptions)
  const { timeZone } = useCurrentProfile()
  const lastCheck = Math.max(health.dataUpdatedAt, health.errorUpdatedAt)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estado del sistema"
        description="Verifica que la aplicación pueda comunicarse con la API y la base de datos."
        actions={
          <Button variant="outline" onClick={() => health.refetch()} disabled={health.isFetching}>
            <RefreshCwIcon className={cn(health.isFetching && "animate-spin")} aria-hidden />
            Verificar ahora
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>API de Personal Tracker</CardTitle>
          <CardDescription>Servicio backend y conexión con PostgreSQL</CardDescription>
        </CardHeader>
        <CardContent>
          {health.isPending ? (
            <div className="space-y-3" aria-label="Verificando el estado">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          ) : (
            <StatusSummary state={toSystemState(health.data, health.error)} />
          )}

          <dl className="mt-6 grid gap-4 border-t pt-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Última verificación</dt>
              <dd className="font-medium">
                {lastCheck > 0 ? formatDateTime(lastCheck, timeZone) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Actualización automática</dt>
              <dd className="font-medium">Cada {HEALTH_REFRESH_INTERVAL_MS / 1000} segundos</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Endpoint</dt>
              <dd className="font-mono text-xs">/actuator/health</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusSummary({ state }: { state: SystemState }) {
  const { label, description, icon: Icon, tone } = STATES[state]

  return (
    <div className="flex items-start gap-3" role="status">
      <Badge className={cn("gap-1.5", tone)}>
        <Icon aria-hidden />
        {label}
      </Badge>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
