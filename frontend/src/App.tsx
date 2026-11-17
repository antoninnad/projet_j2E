import { SiteHeader } from "@/components/site-header"
import { FileWorkspace } from "@/components/workspace/file-workspace"
import { Toaster } from "@/components/ui/sonner"

export default function App({ baseUrl = "/" }: { baseUrl?: string }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <SiteHeader baseUrl={baseUrl} activePage="accueil" />
      </header>
      <FileWorkspace />
      <Toaster position="top-right" richColors closeButton />
    </div>
  )
}
