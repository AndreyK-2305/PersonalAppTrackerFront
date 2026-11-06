import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

interface ErrorStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

/** Estado de error o de recurso inexistente, centrado y con una acción para salir de él. */
export function ErrorState({ icon: Icon, title, description, action }: ErrorStateProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}
