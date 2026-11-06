import { WalletIcon } from "lucide-react"
import { Outlet } from "react-router"

/** Estructura de las páginas públicas (inicio de sesión y registro). */
export function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-6">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <WalletIcon className="size-5" aria-hidden />
        </span>
        Personal Tracker
      </div>
      <main className="w-full max-w-sm">
        <Outlet />
      </main>
    </div>
  )
}
