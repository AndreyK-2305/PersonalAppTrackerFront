import { LoaderCircleIcon } from "lucide-react"

/** Pantalla completa mientras se verifica la sesión al cargar la aplicación. */
export function LoadingScreen() {
  return (
    <div className="flex min-h-svh items-center justify-center" role="status">
      <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" aria-hidden />
      <span className="sr-only">Cargando…</span>
    </div>
  )
}
