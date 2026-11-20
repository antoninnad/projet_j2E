import { useEffect, useState } from "react"
import { FolderOpen, MessageSquare, ShieldCheck, Users } from "lucide-react"
import {
  WORKSPACE_TABS,
  parseWorkspaceTab,
  readTabFromLocation,
  syncTabToLocation,
  type WorkspaceTabId,
} from "@/app/routes"
import { PendingRegistrationsPanel } from "@/components/admin/pending-registrations-panel"
import { Badge } from "@/components/ui/badge"
import { Toaster } from "@/components/ui/sonner"
import { FileWorkspace } from "@/components/workspace/file-workspace"
import type { Api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface WorkspaceShellProps {
  initialTab?: string
  userName?: string
  isAdmin?: boolean
  embedded?: boolean
  client?: Api
}

const TAB_ICONS: Record<WorkspaceTabId, typeof FolderOpen> = {
  files: FolderOpen,
  directory: Users,
  chat: MessageSquare,
  admin: ShieldCheck,
}

export function WorkspaceShell({
  initialTab = "files",
  userName,
  isAdmin = false,
  embedded = false,
  client,
}: WorkspaceShellProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>(() =>
    readTabFromLocation(parseWorkspaceTab(initialTab, "files")),
  )

  useEffect(() => {
    const onPopState = () => {
      setActiveTab(readTabFromLocation(parseWorkspaceTab(initialTab, "files")))
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [initialTab])

  function handleSelectTab(tab: WorkspaceTabId) {
    setActiveTab(tab)
    syncTabToLocation(tab)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 shadow-xs">
        <div role="tablist" aria-label="Modules de l'espace de travail" className="flex flex-wrap items-center gap-1.5">
          {WORKSPACE_TABS.map((tab) => {
            const Icon = TAB_ICONS[tab.id]
            const selected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`panel-${tab.id}`}
                onClick={() => handleSelectTab(tab.id)}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {userName && <span className="font-medium text-foreground">{userName}</span>}
          {isAdmin && <Badge variant="secondary">Admin</Badge>}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === "files" && <FileWorkspace embedded={embedded} />}
        {activeTab === "admin" && <PendingRegistrationsPanel client={client} />}
        {activeTab === "directory" && (
          <ModulePlaceholder
            title="Annuaire et profils de l'entreprise"
            description="La recherche paginée des collègues actifs, la consultation des profils et l'édition de votre profil seront branchées en tâche T30."
            badge="Prévu en T30"
          />
        )}
        {activeTab === "chat" && (
          <ModulePlaceholder
            title="Chat privé en temps réel"
            description="La liste des conversations à deux, l'historique paginé et la livraison WebSocket seront intégrés en tâche T35."
            badge="Prévu en T35"
          />
        )}
      </div>

      <Toaster position="top-right" richColors closeButton />
    </div>
  )
}

function ModulePlaceholder({
  title,
  description,
  badge,
}: {
  title: string
  description: string
  badge: string
}) {
  return (
    <section className="rounded-xl border border-dashed border-border bg-background p-8 text-center shadow-xs">
      <Badge variant="outline" className="mb-3">
        {badge}
      </Badge>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>
    </section>
  )
}
