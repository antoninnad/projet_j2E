import { useState } from "react"
import { DemoFileWorkspace } from "@/components/workspace/demo-file-workspace"
import { WorkspaceShell } from "@/components/workspace/workspace-shell"
import { createPreviewApi } from "@/data/api-preview"

/**
 * Coquille autonome plein écran type Microsoft Teams utilisée par le serveur Vite (frontend/index.html)
 * avec barre latérale verticale rétractable et espace documentaire simulé plein écran.
 */
export default function App({ baseUrl = "/" }: { baseUrl?: string }) {
  const [client] = useState(createPreviewApi)

  return (
    <main id="contenu" tabIndex={-1}>
      <WorkspaceShell
        userName="Aperçu local (Vite)"
        isAdmin
        baseUrl={baseUrl}
        client={client}
        documents={<DemoFileWorkspace embedded client={client} />}
      />
    </main>
  )
}
