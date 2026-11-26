import { useEffect, useState, type ReactNode } from "react"
import { Building2, LayoutDashboard, MessageSquare, UserCheck, Users } from "lucide-react"
import {
  WORKSPACE_TABS,
  parseWorkspaceTab,
  readTabFromLocation,
  restrictWorkspaceTab,
  syncTabToLocation,
  type WorkspaceTabId,
} from "@/app/routes"
import { CompanyAdminPanel } from "@/components/admin/company-admin-panel"
import { CompanyCreationPanel } from "@/components/admin/company-creation-panel"
import { PendingRegistrationsPanel } from "@/components/admin/pending-registrations-panel"
import { DirectoryProfilePanel } from "@/components/directory/directory-profile-panel"
import { DropdownMenuUser } from "@/components/site-menu"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyIcon, EmptyTitle } from "@/components/ui/empty"
import { Cluster, Stack, TopCommandBar, WorkspaceBody } from "@/components/ui/layout"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppSidebar } from "@/components/workspace/app-sidebar"
import { FileWorkspace } from "@/components/workspace/file-workspace"
import type { Api } from "@/lib/api"
import type { User } from "@/types/api"

interface WorkspaceShellProps {
  initialTab?: string
  userName?: string
  isAdmin?: boolean
  embedded?: boolean
  baseUrl?: string
  client?: Api
  documents?: ReactNode
}

export function WorkspaceShell({
  initialTab = "files",
  userName,
  isAdmin = false,
  embedded = false,
  baseUrl = "/",
  client,
  documents,
}: WorkspaceShellProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>(() =>
    restrictWorkspaceTab(readTabFromLocation(parseWorkspaceTab(initialTab, "files")), isAdmin),
  )
  const [selectedChatPeer, setSelectedChatPeer] = useState<User | null>(null)

  useEffect(() => {
    const onPopState = () => {
      setActiveTab(
        restrictWorkspaceTab(readTabFromLocation(parseWorkspaceTab(initialTab, "files")), isAdmin),
      )
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [initialTab, isAdmin])

  function handleSelectTab(tab: WorkspaceTabId) {
    const allowed = restrictWorkspaceTab(tab, isAdmin)
    setActiveTab(allowed)
    syncTabToLocation(allowed)
  }

  function handleOpenConversation(colleague: User) {
    setSelectedChatPeer(colleague)
    setActiveTab("chat")
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("tab", "chat")
      url.searchParams.set("peer", String(colleague.id))
      window.history.pushState(
        { tab: "chat", peer: colleague.id },
        "",
        `${url.pathname}${url.search}${url.hash}`,
      )
    }
  }

  const currentTabMeta = WORKSPACE_TABS.find((tab) => tab.id === activeTab) ?? WORKSPACE_TABS[0]

  return (
    <SidebarProvider contained={embedded}>
      <AppSidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        userName={userName}
        isAdmin={isAdmin}
        baseUrl={baseUrl}
      />

      <SidebarInset>
        <TopCommandBar>
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
            <div className="min-w-0">
              <h1 className="truncate text-sm leading-tight font-semibold">{currentTabMeta.label}</h1>
              <p className="hidden truncate text-xs leading-tight text-muted-foreground md:block">
                {currentTabMeta.description}
              </p>
            </div>
          </div>

          <Cluster gap="xs">
            <DropdownMenuUser baseUrl={baseUrl} isAdmin={isAdmin} authenticated />
          </Cluster>
        </TopCommandBar>

        <WorkspaceBody
          flush={activeTab === "files"}
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          {activeTab === "files" &&
            (documents ?? <FileWorkspace embedded={embedded} client={client} />)}

          {activeTab === "admin" && isAdmin && (
            <Tabs defaultValue="overview" className="gap-6">
              <div className="border-b">
                <TabsList
                  variant="line"
                  aria-label="Sous-sections d'administration"
                  className="h-auto w-full flex-wrap justify-start gap-x-4 gap-y-1 p-0 pb-1 [&>[data-slot=tabs-trigger]]:flex-none [&>[data-slot=tabs-trigger]]:px-1"
                >
                  <TabsTrigger value="overview">
                    <LayoutDashboard aria-hidden="true" />
                    Vue complète
                  </TabsTrigger>
                  <TabsTrigger value="registrations">
                    <UserCheck aria-hidden="true" />
                    Demandes d&apos;accès
                  </TabsTrigger>
                  <TabsTrigger value="departments">
                    <Users aria-hidden="true" />
                    Comptes &amp; Départements
                  </TabsTrigger>
                  <TabsTrigger value="companies">
                    <Building2 aria-hidden="true" />
                    Créer une entreprise
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview">
                <Stack gap="lg">
                  <PendingRegistrationsPanel client={client} />
                  <CompanyAdminPanel client={client} />
                  <CompanyCreationPanel client={client} />
                </Stack>
              </TabsContent>

              <TabsContent value="registrations">
                <PendingRegistrationsPanel client={client} />
              </TabsContent>

              <TabsContent value="departments">
                <CompanyAdminPanel client={client} />
              </TabsContent>

              <TabsContent value="companies">
                <CompanyCreationPanel client={client} />
              </TabsContent>
            </Tabs>
          )}

          {activeTab === "directory" && (
            <DirectoryProfilePanel client={client} onOpenConversation={handleOpenConversation} />
          )}

          {activeTab === "chat" && <ChatModulePlaceholder peer={selectedChatPeer} />}
        </WorkspaceBody>

        <Toaster position="top-right" richColors closeButton />
      </SidebarInset>
    </SidebarProvider>
  )
}

function ChatModulePlaceholder({ peer }: { peer: User | null }) {
  const title = peer
    ? `Conversation privée avec ${peer.firstName} ${peer.lastName}`
    : "Chat privé en temps réel"

  return (
    <Card>
      <CardContent>
        <Empty>
          <EmptyIcon>
            <MessageSquare aria-hidden="true" />
          </EmptyIcon>
          <Badge variant="outline">Bientôt disponible</Badge>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>
            Vos conversations à deux, leur historique et les nouveaux messages en temps réel
            apparaîtront ici.
          </EmptyDescription>
        </Empty>
      </CardContent>
    </Card>
  )
}
