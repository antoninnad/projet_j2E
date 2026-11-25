import { useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { WorkspaceShell } from "@/components/workspace/workspace-shell"
import { createPreviewApi } from "@/data/api-preview"

/**
 * Coquille autonome utilisée uniquement par le serveur Vite (frontend/index.html)
 * pour développer l'interface React sans nécessiter le rendu Thymeleaf.
 */
export default function App({ baseUrl = "/" }: { baseUrl?: string }) {
  const [client] = useState(createPreviewApi)

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <SiteHeader baseUrl={baseUrl} activePage="dashboard" />
      </header>
      <main id="contenu" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <WorkspaceShell embedded userName="Aperçu local (Vite)" isAdmin client={client} />
      </main>
    </div>
  )
}
