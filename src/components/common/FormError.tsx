import { CircleAlertIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

/** Error general de un formulario (el que no corresponde a un campo concreto). */
export function FormError({ message }: { message?: string | null }) {
  if (!message) {
    return null
  }
  return (
    <Alert variant="destructive">
      <CircleAlertIcon aria-hidden />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
