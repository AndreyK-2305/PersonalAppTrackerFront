import { zodResolver } from "@hookform/resolvers/zod"
import { CheckIcon, CopyIcon, LoaderCircleIcon } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { FormError } from "@/components/common/FormError"
import { FormTextField } from "@/components/common/FormTextField"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CAPTURE_ENDPOINT } from "../api/device-tokens"
import { useCreateDeviceToken } from "../hooks/use-device-tokens"
import { deviceTokenSchema, type DeviceTokenValues } from "../schemas"

/**
 * Crea un token para el atajo del iPhone. El secreto solo se muestra aquí, una vez: al cerrar el
 * diálogo ya no se puede consultar (se guarda solo su huella).
 */
export function CreateDeviceTokenDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createToken = useCreateDeviceToken()
  const [secret, setSecret] = useState<string | null>(null)
  const form = useForm<DeviceTokenValues>({
    resolver: zodResolver(deviceTokenSchema),
    defaultValues: { name: "iPhone" },
  })

  const onSubmit = form.handleSubmit((values) =>
    createToken.mutate(
      { name: values.name, scopes: ["FINANCE_CAPTURE"] },
      { onSuccess: (created) => setSecret(created.secret) },
    ),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {secret ? (
          <SecretView secret={secret} onDone={() => onOpenChange(false)} />
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-6">
            <DialogHeader>
              <DialogTitle>Conectar un dispositivo</DialogTitle>
              <DialogDescription>
                El token permite que el atajo del iPhone envíe tus notificaciones bancarias. Solo
                sirve para eso: no abre tu sesión ni el resto de la app.
              </DialogDescription>
            </DialogHeader>
            <FormError message={createToken.error?.message} />
            <FormTextField control={form.control} name="name" label="Nombre del dispositivo" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createToken.isPending}>
                {createToken.isPending && <LoaderCircleIcon className="animate-spin" aria-hidden />}
                Crear token
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SecretView({ secret, onDone }: { secret: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false)
  const endpoint = `${window.location.origin}${CAPTURE_ENDPOINT}`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle>Copia el token ahora</DialogTitle>
        <DialogDescription>
          Pégalo en el atajo del iPhone, en la cabecera de la petición.
        </DialogDescription>
      </DialogHeader>
      <Alert>
        <AlertTitle>Solo se muestra esta vez</AlertTitle>
        <AlertDescription>
          No se guarda en ningún lado y no se puede volver a ver. Si lo pierdes, revócalo y crea
          otro.
        </AlertDescription>
      </Alert>
      <div className="space-y-1.5">
        <Label htmlFor="device-token-secret">Token</Label>
        <div className="flex gap-2">
          <Input id="device-token-secret" value={secret} readOnly className="font-mono text-xs" />
          <Button type="button" variant="outline" onClick={copy} aria-label="Copiar token">
            {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
          </Button>
        </div>
      </div>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Cabecera</dt>
          <dd className="font-mono text-xs break-all">Authorization: Bearer {"<token>"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Dirección (POST, JSON)</dt>
          <dd className="font-mono text-xs break-all">{endpoint}</dd>
        </div>
      </dl>
      <DialogFooter>
        <Button type="button" onClick={onDone}>
          Listo
        </Button>
      </DialogFooter>
    </div>
  )
}
