import { useQuery } from "@tanstack/react-query"
import { BookOpenIcon, PlusIcon, SmartphoneIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/common/ConfirmDialog"
import { ErrorState } from "@/components/common/ErrorState"
import { PageHeader } from "@/components/common/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentProfile } from "@/features/auth/hooks/use-auth"
import { formatDateTime } from "@/lib/format"
import {
  CAPTURE_ENDPOINT,
  deviceTokensQueryOptions,
  type DeviceScope,
  type DeviceToken,
} from "../api/device-tokens"
import { CreateDeviceTokenDialog } from "../components/CreateDeviceTokenDialog"
import { ShortcutGuide } from "../components/ShortcutGuide"
import { useRevokeDeviceToken } from "../hooks/use-device-tokens"

const SCOPE_LABELS: Record<DeviceScope, string> = {
  FINANCE_CAPTURE: "Finanzas: captura de notificaciones",
}

/**
 * Ajustes → Conexiones (D9): dispositivos que envían datos a la app. Hoy, el atajo del iPhone que
 * envía las notificaciones bancarias a la captura de Finanzas (ADR-0017).
 */
export function ConnectionsPage() {
  const tokens = useQuery(deviceTokensQueryOptions)
  const revokeToken = useRevokeDeviceToken()
  const profile = useCurrentProfile()
  const [creating, setCreating] = useState(false)
  // Cambia en cada apertura para que el diálogo empiece en el formulario, sin el secreto anterior.
  const [dialogKey, setDialogKey] = useState(0)
  const [revoking, setRevoking] = useState<DeviceToken | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)

  const openCreate = () => {
    setDialogKey((key) => key + 1)
    setCreating(true)
  }
  const confirmRevoke = () => {
    if (!revoking) {
      return
    }
    revokeToken.mutate(revoking.id, {
      onSuccess: () => toast.success("Dispositivo desconectado."),
      onError: (error) => toast.error(error.message),
      onSettled: () => setRevoking(null),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conexiones"
        description="Dispositivos que envían tus notificaciones bancarias para registrarlas solas."
        actions={
          <>
            <Button variant="outline" onClick={() => setGuideOpen(true)}>
              <BookOpenIcon aria-hidden />
              Guía del atajo
            </Button>
            <Button onClick={openCreate}>
              <PlusIcon aria-hidden />
              Conectar dispositivo
            </Button>
          </>
        }
      />

      {tokens.isPending ? (
        <Skeleton className="h-40 w-full" aria-label="Cargando dispositivos" />
      ) : tokens.isError ? (
        <ErrorState
          icon={SmartphoneIcon}
          title="No fue posible cargar tus dispositivos"
          description={tokens.error.message}
          action={<Button onClick={() => tokens.refetch()}>Reintentar</Button>}
        />
      ) : tokens.data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <SmartphoneIcon className="size-8 text-muted-foreground" aria-hidden />
            <div className="space-y-1">
              <p className="font-medium">Aún no has conectado dispositivos</p>
              <p className="text-sm text-muted-foreground">
                Crea un token y úsalo en el atajo del iPhone que lee tus SMS y notificaciones.
              </p>
            </div>
            <Button onClick={openCreate}>
              <PlusIcon aria-hidden />
              Conectar el primero
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tokens.data.map((token) => (
            <Card key={token.id} role="article" aria-label={token.name}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="truncate">{token.name}</span>
                    {!token.active && <Badge variant="secondary">Desconectado</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {token.scopes.map((scope) => SCOPE_LABELS[scope]).join(" · ")}
                  </CardDescription>
                </div>
                {token.active && (
                  <Button variant="outline" size="sm" onClick={() => setRevoking(token)}>
                    Desconectar
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Creado</dt>
                    <dd>{formatDateTime(token.createdAt, profile.timeZone)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {token.active ? "Último uso" : "Desconectado"}
                    </dt>
                    <dd>
                      {token.active
                        ? token.lastUsedAt
                          ? formatDateTime(token.lastUsedAt, profile.timeZone)
                          : "Nunca"
                        : token.revokedAt
                          ? formatDateTime(token.revokedAt, profile.timeZone)
                          : "—"}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateDeviceTokenDialog key={dialogKey} open={creating} onOpenChange={setCreating} />
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Guía del atajo</DialogTitle>
            <DialogDescription>
              Cómo configurar el atajo del iPhone que envía tus notificaciones bancarias. Usa el
              token que creaste al conectar el dispositivo.
            </DialogDescription>
          </DialogHeader>
          <ShortcutGuide endpoint={`${window.location.origin}${CAPTURE_ENDPOINT}`} />
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(open) => !open && setRevoking(null)}
        title={`¿Desconectar ${revoking?.name ?? "el dispositivo"}?`}
        description="Su token deja de funcionar de inmediato y no se puede reactivar. Para volver a conectarlo, crea un token nuevo."
        confirmLabel="Desconectar"
        onConfirm={confirmRevoke}
        pending={revokeToken.isPending}
      />
    </div>
  )
}
