import { useState } from "react"
import { WorkspaceShell } from "@/components/workspace/workspace-shell"
import { createPreviewApi } from "@/data/api-preview"

/**
 * Coquille autonome plein écran type Microsoft Teams utilisée par le serveur Vite (frontend/index.html)
 * avec barre latérale verticale rétractable et barre de commandes supérieure.
 */
export default function App({ baseUrl = "/" }: { baseUrl?: string }) {
  const [client] = useState(createPreviewApi)

  return (
    <main id="contenu" tabIndex={-1}>
      <WorkspaceShell userName="Aperçu local (Vite)" isAdmin baseUrl={baseUrl} client={client} />
    </main>
  )
}
