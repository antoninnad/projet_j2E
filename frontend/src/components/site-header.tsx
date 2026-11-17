import { SiteMenu } from "@/components/site-menu"

export function SiteHeader({ baseUrl = "/", activePage = "accueil" }: {
  baseUrl?: string
  activePage?: string
}) {
  return (
    <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-3">
      <a href={baseUrl} className="font-semibold">Lagui</a>
      <SiteMenu baseUrl={baseUrl} activePage={activePage} />
    </div>
  )
}
