import { useEffect, useState } from "react"
import { MessageSquare } from "lucide-react"
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
import { DropdownMenuFile, DropdownMenuUser } from "@/components/site-menu"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
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
}

export function WorkspaceShell({
  initialTab = "files",
  userName,
  isAdmin = false,
  embedded = false,
  baseUrl = "/",
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
        {/* Barre supérieure de commandes façon Microsoft Teams */}
        <TopCommandBar>
          <Cluster gap="sm" wrap={false}>
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-5" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <span>Lagui</span>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{currentTabMeta.label}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </Cluster>

          <Cluster gap="xs">
            <DropdownMenuFile />
            <DropdownMenuUser baseUrl={baseUrl} />
          </Cluster>
        </TopCommandBar>

        <WorkspaceBody
          flush={activeTab === "files"}
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          {activeTab === "files" && <FileWorkspace embedded client={client} />}

          {activeTab === "admin" && (
            <Tabs defaultValue="overview">
              <Cluster justify="between" gap="md">
                <TabsList aria-label="Sous-sections d'administration">
                  <TabsTrigger value="overview">Vue complète</TabsTrigger>
                  <TabsTrigger value="registrations">Demandes d&apos;accès</TabsTrigger>
                  <TabsTrigger value="departments">Comptes &amp; Départements</TabsTrigger>
                  <TabsTrigger value="companies">Créer une entreprise</TabsTrigger>
                </TabsList>
                <Badge variant="brand">Console d&apos;administration</Badge>
              </Cluster>

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

          {activeTab === "chat" && (
            <ChatModulePlaceholder peer={selectedChatPeer} />
          )}
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
          <Badge variant="outline">Prévu en T35</Badge>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>
            La liste des conversations à deux, l&apos;historique paginé et la livraison WebSocket
            seront intégrés en tâche T35.
          </EmptyDescription>
        </Empty>
      </CardContent>
    </Card>
  )
}
