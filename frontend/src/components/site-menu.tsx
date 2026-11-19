import {
  ChevronDown,
  FilePlus2,
  FolderOpen,
  FolderPlus,
  Home,
  LogIn,
  Plus,
  ShieldCheck,
  Upload,
  UserPlus,
  UserRound,
} from "lucide-react"
import { MVC_ROUTES, resolveAppPath } from "@/app/routes"
import { Button } from "@/components/ui/button"
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
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

export function DropdownMenuUser({ baseUrl = "/" }: { baseUrl?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="group">
          <UserRound className="size-4" aria-hidden="true" />
          Mon compte
          <ChevronDown
            className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 max-w-[calc(100vw-2rem)]" align="end">
        <DropdownMenuLabel>Accès rapides</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <a href={resolveAppPath(baseUrl, MVC_ROUTES.dashboard)}>
              <FolderOpen className="size-4" aria-hidden="true" />
              Tableau de bord
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`${resolveAppPath(baseUrl, MVC_ROUTES.dashboard)}?tab=admin`}>
              <ShieldCheck className="size-4" aria-hidden="true" />
              Administration
            </a>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <a href={resolveAppPath(baseUrl, MVC_ROUTES.login)}>
              <LogIn className="size-4" aria-hidden="true" />
              Connexion
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={resolveAppPath(baseUrl, MVC_ROUTES.register)}>
              <UserPlus className="size-4" aria-hidden="true" />
              Inscription
            </a>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function DropdownMenuFile() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label="Créer ou importer" title="Créer ou importer">
          <Plus className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-52" align="end">
        <DropdownMenuLabel>Actions documents</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem disabled>
            <FilePlus2 aria-hidden="true" />
            Nouveau fichier (T24)
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <FolderPlus aria-hidden="true" />
            Nouveau dossier (T24)
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <Upload aria-hidden="true" />
          Importer un fichier (T24)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SiteMenu({
  baseUrl = "/",
  activePage = "dashboard",
}: {
  baseUrl?: string
  activePage?: string
}) {
  return (
    <NavigationMenu aria-label="Menu principal" viewport={false}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink
            asChild
            active={activePage === "accueil"}
            className={navigationMenuTriggerStyle()}
          >
            <a href={resolveAppPath(baseUrl, MVC_ROUTES.home)} aria-label="Accueil" title="Accueil">
              <Home className="size-4" aria-hidden="true" />
            </a>
          </NavigationMenuLink>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <DropdownMenuUser baseUrl={baseUrl} />
        </NavigationMenuItem>

        <NavigationMenuItem>
          <DropdownMenuFile />
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}
