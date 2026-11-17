import { ChevronDown, FilePlus2, FolderPlus, Home, Plus, Upload, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


export function DropdownMenuUser() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="group">
          <UserRound className="size-4" aria-hidden="true" />
          Mon compte
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 max-w-[calc(100vw-2rem)]" align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-3 py-3">
            <UserRound className="size-5 shrink-0" aria-hidden="true" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="break-words">@antonin.nadaud</span>
              <span className="text-sm font-normal text-blue-700">[company name]</span>
            </span>
          </DropdownMenuLabel>
          <DropdownMenuItem>
            Profile
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Billing
            <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Settings
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>Team</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Invite users</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Email</DropdownMenuItem>
                <DropdownMenuItem>Message</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>More...</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuItem>
            New Team
            <DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>GitHub</DropdownMenuItem>
          <DropdownMenuItem>Support</DropdownMenuItem>
          <DropdownMenuItem disabled>API</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            Log out
            <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
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
        <Button type="button" variant="outline" size="icon" aria-label="Ajouter" title="Ajouter">
          <Plus className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48" align="end">
        <DropdownMenuLabel>Create</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <FilePlus2 aria-hidden="true" />
            New File
          </DropdownMenuItem>
          <DropdownMenuItem>
            <FolderPlus aria-hidden="true" />
            New Folder
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Upload aria-hidden="true" />
          Upload File
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SiteMenu({ baseUrl = "/", activePage = "accueil" }: {
  baseUrl?: string
  activePage?: string
}) {

  //menu

  return (
    <NavigationMenu aria-label="Menu principal" viewport={false}>

      <NavigationMenuList>


        <NavigationMenuItem>
          <NavigationMenuLink asChild active={activePage === "accueil"} className={navigationMenuTriggerStyle()}>
            <a href={baseUrl} aria-label="Accueil" title="Accueil">
              <Home className="size-4" aria-hidden="true" />
            </a>
          </NavigationMenuLink>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <DropdownMenuUser />
        </NavigationMenuItem>

        <NavigationMenuItem>
          <DropdownMenuFile />
        </NavigationMenuItem>



      </NavigationMenuList>
    </NavigationMenu>
  )
}
