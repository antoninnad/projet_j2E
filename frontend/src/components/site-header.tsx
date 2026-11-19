import { MVC_ROUTES, resolveAppPath } from "@/app/routes"
import { SiteMenu } from "@/components/site-menu"

export function SiteHeader({
  baseUrl = "/",
  activePage = "dashboard",
}: {
  baseUrl?: string
  activePage?: string
}) {
  return (
    <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
      <a
        href={resolveAppPath(baseUrl, MVC_ROUTES.home)}
        className="inline-flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-85"
      >
        <span
          className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-bold tracking-tight text-primary-foreground"
          aria-hidden="true"
        >
          L
        </span>
        <span className="flex flex-col leading-none">
          <span className="text-base font-semibold tracking-tight">Lagui</span>
          <span className="text-[11px] text-muted-foreground">Espace collaboratif</span>
        </span>
      </a>
      <SiteMenu baseUrl={baseUrl} activePage={activePage} />
    </div>
  )
}
