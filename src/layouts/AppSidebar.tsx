import {
  ActivityIcon,
  ChartColumnIcon,
  FolderTreeIcon,
  ReceiptTextIcon,
  WalletCardsIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react"
import { Link, NavLink, useMatch } from "react-router"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { NavUser } from "./NavUser"

interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Activa solo en la ruta exacta (por ejemplo, el resumen no se marca en sus subrutas). */
  end?: boolean
}

// Solo rutas que existen. Cada módulo agrega aquí su entrada cuando se implementa.
const navigation: { label: string; items: NavItem[] }[] = [
  {
    label: "Finanzas",
    items: [
      { label: "Resumen", to: "/finanzas", icon: ChartColumnIcon, end: true },
      { label: "Movimientos", to: "/finanzas/movimientos", icon: ReceiptTextIcon },
      { label: "Productos", to: "/finanzas/productos", icon: WalletCardsIcon },
      { label: "Categorías", to: "/finanzas/categorias", icon: FolderTreeIcon },
    ],
  },
  {
    label: "Sistema",
    items: [{ label: "Estado del sistema", to: "/sistema", icon: ActivityIcon }],
  },
]

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <WalletIcon className="size-4" aria-hidden />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">Personal Tracker</span>
                  <span className="truncate text-xs text-muted-foreground">Gestión personal</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navigation.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <NavItemLink item={item} />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function NavItemLink({ item }: { item: NavItem }) {
  const isActive = useMatch({ path: item.to, end: item.end ?? false }) !== null
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
      <NavLink to={item.to} end={item.end} onClick={() => isMobile && setOpenMobile(false)}>
        <item.icon aria-hidden />
        <span>{item.label}</span>
      </NavLink>
    </SidebarMenuButton>
  )
}
