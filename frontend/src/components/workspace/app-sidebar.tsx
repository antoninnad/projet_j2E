import {
  Building2,
  ChevronsUpDown,
  FolderOpen,
  Home,
  MessageSquare,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react"
import {
  MVC_ROUTES,
  resolveAppPath,
  visibleWorkspaceTabs,
  type WorkspaceTabId,
} from "@/app/routes"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  useSidebar,
} from "@/components/ui/sidebar"

const TAB_ICONS: Record<WorkspaceTabId, typeof FolderOpen> = {
  files: FolderOpen,
  directory: Users,
  chat: MessageSquare,
  admin: ShieldCheck,
}

function initialsFromName(name?: string): string {
  if (!name) return "LG"
  const parts = name
    .replace(/[()]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return (parts[0]?.slice(0, 2) ?? "LG").toUpperCase()
}

export interface AppSidebarProps {
  activeTab: WorkspaceTabId
  onSelectTab: (tab: WorkspaceTabId) => void
  userName?: string
  isAdmin?: boolean
  baseUrl?: string
}

export function AppSidebar({
  activeTab,
  onSelectTab,
  userName,
  isAdmin = false,
  baseUrl = "/",
}: AppSidebarProps) {
  const { state, setOpenMobile } = useSidebar()
  const collapsed = state === "collapsed"
  const tabs = visibleWorkspaceTabs(isAdmin)

  function selectModule(tab: WorkspaceTabId) {
    onSelectTab(tab)
    setOpenMobile(false)
  }

  return (
    <Sidebar>
      <SidebarHeader className="h-14 shrink-0 justify-center gap-0 py-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton tooltip="Lagui — Espace d'entreprise">
              {/* Marque d'après le dashboard Watermelon UI « Capitalio » (MIT) */}
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary bg-linear-to-t from-[color-mix(in_oklab,var(--primary)_80%,black)] to-primary text-xs font-bold text-primary-foreground"
              >
                L
              </span>
              {!collapsed && (
                <>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
                    <span className="truncate text-base font-medium text-sidebar-accent-foreground">
                      Lagui
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      Espace collaboratif
                    </span>
                  </span>
                  <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/60" aria-hidden="true" />
                </>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-60">
            <DropdownMenuLabel>Navigation plateforme</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <a href={resolveAppPath(baseUrl, MVC_ROUTES.home)}>
                  <Home aria-hidden="true" />
                  Accueil public
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={resolveAppPath(baseUrl, MVC_ROUTES.dashboard)}>
                  <Building2 aria-hidden="true" />
                  Tableau de bord
                </a>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => selectModule("directory")}>
                <UserRound aria-hidden="true" />
                Mon profil &amp; annuaire
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => selectModule("admin")}>
                  <ShieldCheck aria-hidden="true" />
                  Administration entreprise
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Espace de travail</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu role="tablist" aria-label="Modules de l'espace de travail">
              {tabs.map((tab) => {
                const Icon = TAB_ICONS[tab.id]
                const selected = activeTab === tab.id
                return (
                  <SidebarMenuItem key={tab.id}>
                    <SidebarMenuButton
                      type="button"
                      role="tab"
                      id={`tab-${tab.id}`}
                      aria-selected={selected}
                      aria-controls={`panel-${tab.id}`}
                      isActive={selected}
                      tooltip={tab.label}
                      onClick={() => selectModule(tab.id)}
                    >
                      <Icon aria-hidden="true" />
                      <span className={collapsed ? "sr-only" : "truncate"}>{tab.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton tooltip={userName || "Compte connecté"}>
              <Avatar className="size-9 shrink-0 rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary-subtle text-xs font-semibold text-primary-subtle-foreground">
                  {initialsFromName(userName)}
                </AvatarFallback>
              </Avatar>
              <span className={collapsed ? "sr-only" : "flex min-w-0 flex-1 flex-col items-start gap-1 leading-none"}>
                <span className="w-full truncate text-sm font-medium text-sidebar-accent-foreground">
                  {userName ?? "Session active"}
                </span>
                {isAdmin ? (
                  <Badge variant="brand" className="h-4 px-1.5 text-[10px]">Admin</Badge>
                ) : (
                  <span className="text-xs text-sidebar-foreground/65">Membre</span>
                )}
              </span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-60">
            <DropdownMenuLabel>{userName ?? "Mon espace"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => selectModule("directory")}>
                <UserRound aria-hidden="true" />
                Modifier mon profil
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => selectModule("admin")}>
                  <ShieldCheck aria-hidden="true" />
                  Gérer les comptes &amp; accès
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <a href={resolveAppPath(baseUrl, MVC_ROUTES.home)}>
                  <Home aria-hidden="true" />
                  Accueil public
                </a>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
