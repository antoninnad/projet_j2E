/// <reference types="vite/client" />

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { CompanyCreationPanel } from "@/components/admin/company-creation-panel"
import { IslandErrorBoundary } from "@/components/island-error-boundary"
import { SiteHeader } from "@/components/site-header"
import { Toaster } from "@/components/ui/sonner"
import { WorkspaceShell } from "@/components/workspace/workspace-shell"
import { createApi } from "@/lib/api"
import { createSessionAwareFetcher } from "@/lib/session"
import "./styles.css"

function mountReactIslands() {
  // 1. Mode autonome Vite (frontend/index.html)
  const standaloneRoot = document.getElementById("root")
  if (import.meta.env.DEV && standaloneRoot) {
    void import("./App.tsx").then(({ default: App }) => {
      createRoot(standaloneRoot).render(
        <StrictMode>
          <App baseUrl={standaloneRoot.dataset.baseUrl || "/"} />
        </StrictMode>,
      )
    })
  }

  // 2. Îlot principal intégré dans dashboard.html (Thymeleaf)
  document.querySelectorAll<HTMLElement>('[data-react-mount="workspace"]').forEach((element) => {
    createRoot(element).render(
      <StrictMode>
        <IslandErrorBoundary>
          <WorkspaceShell
            embedded
            initialTab={element.dataset.initialTab || "files"}
            userName={element.dataset.userName || undefined}
            isAdmin={element.dataset.isAdmin === "true"}
            client={createApi({
              baseUrl: element.dataset.baseUrl,
              fetcher: createSessionAwareFetcher({
                baseUrl: element.dataset.baseUrl,
                loginUrl: element.dataset.loginUrl,
              }),
            })}
          />
        </IslandErrorBoundary>
      </StrictMode>,
    )
  })

  // 3. Îlot de création d'entreprise et premier administrateur (admin-dashboard.html)
  document.querySelectorAll<HTMLElement>('[data-react-mount="company-creation"]').forEach((element) => {
    createRoot(element).render(
      <StrictMode>
        <IslandErrorBoundary>
          <CompanyCreationPanel
            client={createApi({
              baseUrl: element.dataset.baseUrl,
              fetcher: createSessionAwareFetcher({
                baseUrl: element.dataset.baseUrl,
                loginUrl: element.dataset.loginUrl,
              }),
            })}
          />
        </IslandErrorBoundary>
        <Toaster position="top-right" richColors closeButton />
      </StrictMode>,
    )
  })

  // 4. Îlot facultatif d'en-tête React pour des templates dédiés
  document.querySelectorAll<HTMLElement>('[data-react-mount="site-header"], [data-site-header]').forEach((element) => {
    createRoot(element).render(
      <StrictMode>
        <SiteHeader baseUrl={element.dataset.baseUrl || "/"} activePage={element.dataset.activePage || "accueil"} />
      </StrictMode>,
    )
  })
}

mountReactIslands()
