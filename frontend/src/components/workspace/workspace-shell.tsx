import { useEffect, useState } from "react"
import { FolderOpen, MessageSquare, ShieldCheck, Users } from "lucide-react"
import {
  WORKSPACE_TABS,
  parseWorkspaceTab,
  readTabFromLocation,
  syncTabToLocation,
  type WorkspaceTabId,
} from "@/app/routes"
import { CompanyAdminPanel } from "@/components/admin/company-admin-panel"
import { CompanyCreationPanel } from "@/components/admin/company-creation-panel"
import { PendingRegistrationsPanel } from "@/components/admin/pending-registrations-panel"
import { DirectoryProfilePanel } from "@/components/directory/directory-profile-panel"
import { Badge } from "@/components/ui/badge"
import { Toaster } from "@/components/ui/sonner"
import { FileWorkspace } from "@/components/workspace/file-workspace"
import type { Api } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { User } from "@/types/api"

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
  const [selectedChatPeer, setSelectedChatPeer] = useState<User | null>(null)

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

  function handleOpenConversation(colleague: User) {
    setSelectedChatPeer(colleague)
    setActiveTab("chat")
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("tab", "chat")
      url.searchParams.set("peer", String(colleague.id))
      window.history.pushState({ tab: "chat", peer: colleague.id }, "", `${url.pathname}${url.search}${url.hash}`)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
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
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
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
          {isAdmin && <Badge variant="brand">Admin</Badge>}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === "files" && <FileWorkspace embedded={embedded} client={client} />}
        {activeTab === "admin" && (
          <div className="space-y-6">
            <PendingRegistrationsPanel client={client} />
            <CompanyAdminPanel client={client} />
            <CompanyCreationPanel client={client} />
          </div>
        )}
        {activeTab === "directory" && (
          <DirectoryProfilePanel client={client} onOpenConversation={handleOpenConversation} />
        )}
        {activeTab === "chat" && (
          <ModulePlaceholder
            title={
              selectedChatPeer
                ? `Conversation privée avec ${selectedChatPeer.firstName} ${selectedChatPeer.lastName}`
                : "Chat privé en temps réel"
            }
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
