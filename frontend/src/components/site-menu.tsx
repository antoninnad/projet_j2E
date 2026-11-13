import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

export function SiteMenu({ baseUrl = "/", activePage = "accueil" }: {
  baseUrl?: string
  activePage?: string
}) {
  return (
    <NavigationMenu aria-label="Menu principal" viewport={false}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink asChild active={activePage === "accueil"} className={navigationMenuTriggerStyle()}>
            <a href={baseUrl}>Accueil</a>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}
