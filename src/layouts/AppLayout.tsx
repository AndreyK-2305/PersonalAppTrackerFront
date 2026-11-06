import { Outlet } from "react-router"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"

// El componente Sidebar guarda en esta cookie si la barra quedó abierta o colapsada.
function sidebarWasOpen(): boolean {
  return !document.cookie.split("; ").includes("sidebar_state=false")
}

/** Estructura de la aplicación: navegación lateral, barra superior y contenido de la ruta. */
export function AppLayout() {
  return (
    <SidebarProvider defaultOpen={sidebarWasOpen()}>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" aria-label="Mostrar u ocultar la navegación" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-center"
          />
          <span className="text-sm font-medium text-muted-foreground">Personal Tracker</span>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
