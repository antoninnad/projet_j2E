import { useEffect, useState } from "react"
import { LayoutGrid, Palette } from "lucide-react"
import { BrandPaletteShowcase } from "@/components/design/brand-palette-showcase"
import { SiteHeader } from "@/components/site-header"
import { WorkspaceShell } from "@/components/workspace/workspace-shell"
import { createPreviewApi } from "@/data/api-preview"
import {
  BRAND_VARIATIONS,
  applyBrandTheme,
  readStoredBrandTheme,
  type BrandThemeId,
} from "@/lib/theme"
import { cn } from "@/lib/utils"

type PreviewMode = "workspace" | "charte"

function readInitialMode(): PreviewMode {
  if (typeof window === "undefined") return "workspace"
  const view = new URLSearchParams(window.location.search).get("view")
  return view === "charte" ? "charte" : "workspace"
}

/**
 * Coquille autonome utilisée uniquement par le serveur Vite (frontend/index.html)
 * pour développer l'interface React et prévisualiser la charte graphique sans Thymeleaf.
 */
export default function App({ baseUrl = "/" }: { baseUrl?: string }) {
  const [client] = useState(createPreviewApi)
  const [mode, setMode] = useState<PreviewMode>(readInitialMode)
  const [brandTheme, setBrandTheme] = useState<BrandThemeId>(readStoredBrandTheme)

  useEffect(() => {
    applyBrandTheme(brandTheme)
  }, [brandTheme])

  function handleChangeMode(nextMode: PreviewMode) {
    setMode(nextMode)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      if (nextMode === "charte") {
        url.searchParams.set("view", "charte")
      } else {
        url.searchParams.delete("view")
      }
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <SiteHeader baseUrl={baseUrl} activePage="dashboard" />
        <div className="border-t border-border/70 bg-muted/40">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-1.5 text-xs sm:px-6">
            <div className="flex items-center gap-1.5" role="group" aria-label="Vue de l'aperçu local">
              <button
                type="button"
                aria-pressed={mode === "workspace"}
                onClick={() => handleChangeMode("workspace")}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                  mode === "workspace"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <LayoutGrid className="size-3.5" aria-hidden="true" />
                Espace de travail
              </button>
              <button
                type="button"
                aria-pressed={mode === "charte"}
                onClick={() => handleChangeMode("charte")}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                  mode === "charte"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Palette className="size-3.5" aria-hidden="true" />
                Plaquette couleurs
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Variation graphique">
              <span className="hidden text-muted-foreground sm:inline">Thème :</span>
              {BRAND_VARIATIONS.map((item) => {
                const active = item.id === brandTheme
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setBrandTheme(item.id)}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                      active
                        ? "border-primary/30 bg-primary-subtle text-primary-subtle-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: item.preview.primary }}
                      aria-hidden="true"
                    />
                    {item.name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </header>

      <main id="contenu" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {mode === "charte" ? (
          <BrandPaletteShowcase
            activeTheme={brandTheme}
            onSelectTheme={setBrandTheme}
            onOpenWorkspace={() => handleChangeMode("workspace")}
          />
        ) : (
          <WorkspaceShell embedded userName="Aperçu local (Vite)" isAdmin client={client} />
        )}
      </main>
    </div>
  )
}
