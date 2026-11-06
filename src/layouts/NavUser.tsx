import { ChevronsUpDownIcon, LogOutIcon, UserIcon } from "lucide-react"
import { Link, useNavigate } from "react-router"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useCurrentProfile, useLogout } from "@/features/auth/hooks/use-auth"

/** Iniciales del nombre: primera letra de la primera y la última palabra ("Kevin A. Jaimes" → "KJ"). */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0]?.[0] ?? ""
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : ""
  return (first + last).toUpperCase()
}

/** Menú de la cuenta al pie de la navegación lateral: perfil y cierre de sesión. */
export function NavUser() {
  const profile = useCurrentProfile()
  const logout = useLogout()
  const navigate = useNavigate()
  const { isMobile } = useSidebar()

  const signOut = () =>
    logout.mutate(undefined, { onSettled: () => navigate("/iniciar-sesion", { replace: true }) })

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" aria-label="Menú de la cuenta">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg">
                  {initials(profile.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{profile.displayName}</span>
                <span className="truncate text-xs text-muted-foreground">{profile.email}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" aria-hidden />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="font-normal">
              <div className="grid text-sm leading-tight">
                <span className="truncate font-medium">{profile.displayName}</span>
                <span className="truncate text-xs text-muted-foreground">{profile.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/perfil">
                <UserIcon aria-hidden />
                Mi perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut} disabled={logout.isPending}>
              <LogOutIcon aria-hidden />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
