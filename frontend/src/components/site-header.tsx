import { MVC_ROUTES, resolveAppPath } from "@/app/routes"
import { SiteMenu } from "@/components/site-menu"
import { Button } from "@/components/ui/button"
import { Cluster, IconTile } from "@/components/ui/layout"

export function SiteHeader({
  baseUrl = "/",
  activePage = "dashboard",
}: {
  baseUrl?: string
  activePage?: string
}) {
  return (
    <Cluster justify="between" gap="lg" className="mx-auto min-h-16 max-w-7xl px-4 py-3 sm:px-6">
      <Button variant="ghost" asChild className="h-auto px-2 py-1.5">
        <a href={resolveAppPath(baseUrl, MVC_ROUTES.home)}>
          <IconTile tone="logo" size="sm" aria-hidden="true">
            L
          </IconTile>
          <span className="flex flex-col text-left leading-none">
            <span className="text-base font-semibold tracking-tight">Lagui</span>
            <span className="text-[11px] font-normal text-muted-foreground">Espace collaboratif</span>
          </span>
        </a>
      </Button>
      <SiteMenu baseUrl={baseUrl} activePage={activePage} />
    </Cluster>
  )
}
