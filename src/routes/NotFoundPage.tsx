import { CompassIcon } from "lucide-react"
import { Link } from "react-router"
import { ErrorState } from "@/components/common/ErrorState"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <ErrorState
      icon={CompassIcon}
      title="Página no encontrada"
      description="La dirección que buscas no existe o fue movida."
      action={
        <Button asChild variant="outline">
          <Link to="/">Ir al inicio</Link>
        </Button>
      }
    />
  )
}
