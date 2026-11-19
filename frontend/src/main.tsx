import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App.tsx"
import { SiteHeader } from "@/components/site-header"
import { WorkspaceShell } from "@/components/workspace/workspace-shell"
import "./styles.css"

function mountReactIslands() {
  // 1. Mode autonome Vite (frontend/index.html)
  const standaloneRoot = document.getElementById("root")
  if (standaloneRoot) {
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
