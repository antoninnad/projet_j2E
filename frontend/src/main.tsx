/// <reference types="vite/client" />

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App.tsx"
import { SiteHeader } from "@/components/site-header"
import { WorkspaceShell } from "@/components/workspace/workspace-shell"
import { createApi } from "@/lib/api"
import "./styles.css"

function mountReactIslands() {
  // 1. Mode autonome Vite (frontend/index.html)
  const standaloneRoot = document.getElementById("root")
  if (import.meta.env.DEV && standaloneRoot) {
    createRoot(standaloneRoot).render(
      <StrictMode>
        <App baseUrl={standaloneRoot.dataset.baseUrl || "/"} />
      </StrictMode>,
    )
  }

  // 2. Îlot principal intégré dans dashboard.html (Thymeleaf)
  document.querySelectorAll<HTMLElement>('[data-react-mount="workspace"]').forEach((element) => {
    createRoot(element).render(
      <StrictMode>
        <WorkspaceShell
          embedded
          initialTab={element.dataset.initialTab || "files"}
          userName={element.dataset.userName || undefined}
          isAdmin={element.dataset.isAdmin === "true"}
          client={createApi({ baseUrl: element.dataset.baseUrl })}
        />
      </StrictMode>,
    )
  })

  // 3. Îlot facultatif d'en-tête React pour des templates dédiés
  document.querySelectorAll<HTMLElement>('[data-react-mount="site-header"], [data-site-header]').forEach((element) => {
    createRoot(element).render(
      <StrictMode>
        <SiteHeader baseUrl={element.dataset.baseUrl || "/"} activePage={element.dataset.activePage || "accueil"} />
      </StrictMode>,
    )
  })
}

mountReactIslands()
