import {
  Building2,
  ChevronsUpDown,
  FilePlus2,
  FolderOpen,
  Home,
  LogIn,
  MessageSquare,
  Plus,
  ShieldCheck,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react"
import {
  MVC_ROUTES,
  WORKSPACE_TABS,
  resolveAppPath,
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
import { IconTile } from "@/components/ui/layout"
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
  SidebarSeparator,
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

  function selectModule(tab: WorkspaceTabId) {
    onSelectTab(tab)
    setOpenMobile(false)
  }

  return (
    <Sidebar>
      {/* En-tête : Sélecteur d'espace entreprise type Microsoft Teams */}
      <SidebarHeader>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton tooltip="Lagui — Espace d'entreprise">
              <IconTile tone="logo" size="sm" aria-hidden="true">
                L
              </IconTile>
              {!collapsed && (
                <>
                  <span className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="truncate text-sm font-semibold text-sidebar-accent-foreground">
                      Lagui
                    </span>
                    <span className="truncate text-[11px] text-sidebar-foreground/65">
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
              <DropdownMenuItem onClick={() => selectModule("admin")}>
                <ShieldCheck aria-hidden="true" />
                Administration entreprise
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      {/* Navigation principale verticale façon rail Teams */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Applications</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu role="tablist" aria-label="Modules de l'espace de travail">
              {WORKSPACE_TABS.map((tab) => {
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

        <SidebarSeparator />

        {/* Raccourcis & menu de création rapide */}
        <SidebarGroup>
          <SidebarGroupLabel>Accès rapides</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton type="button" tooltip="Nouveau / Raccourcis">
                      <Plus aria-hidden="true" />
                      {!collapsed && <span className="truncate">Nouveau &amp; raccourcis</span>}
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start" className="w-56">
                    <DropdownMenuLabel>Actions rapides</DropdownMenuLabel>
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => selectModule("files")}>
                        <FilePlus2 aria-hidden="true" />
                        Ouvrir l&apos;explorateur
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => selectModule("directory")}>
                        <Users aria-hidden="true" />
                        Rechercher un collègue
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => selectModule("chat")}>
                        <MessageSquare aria-hidden="true" />
                        Conversations privées
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Pied de barre latérale : Statut de présence & menu utilisateur */}
      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton tooltip={userName || "Compte connecté"}>
              <span className="relative inline-flex shrink-0">
                <Avatar className="size-8 border border-sidebar-border">
                  <AvatarFallback className="bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                    {initialsFromName(userName)}
                  </AvatarFallback>
                </Avatar>
                <span
                  aria-hidden="true"
                  className="absolute right-0 bottom-0 size-2.5 rounded-full bg-success ring-2 ring-sidebar"
                />
              </span>
              <span className={collapsed ? "sr-only" : "flex min-w-0 flex-1 items-center justify-between gap-2"}>
                <span className="truncate text-xs font-medium text-sidebar-accent-foreground">
                  {userName ?? "Session active"}
                </span>
                {isAdmin && <Badge variant="brand">Admin</Badge>}
              </span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-60">
            <DropdownMenuLabel>
              {userName ?? "Mon espace"} {isAdmin ? "(Admin)" : ""}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => selectModule("directory")}>
                <UserRound aria-hidden="true" />
                Modifier mon profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => selectModule("admin")}>
                <ShieldCheck aria-hidden="true" />
                Gérer les comptes &amp; accès
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <a href={resolveAppPath(baseUrl, MVC_ROUTES.login)}>
                  <LogIn aria-hidden="true" />
                  Connexion
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={resolveAppPath(baseUrl, MVC_ROUTES.register)}>
                  <UserPlus aria-hidden="true" />
                  Inscription
                </a>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
