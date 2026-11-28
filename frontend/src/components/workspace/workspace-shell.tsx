import { useEffect, useState, type ReactNode } from "react"
import { LayoutDashboard, UserCheck, Users } from "lucide-react"
import {
  WORKSPACE_TABS,
  parseWorkspaceTab,
  readChatPeerFromLocation,
  readTabFromLocation,
  restrictWorkspaceTab,
  syncTabToLocation,
  type WorkspaceTabId,
} from "@/app/routes"
import { ActivityFeedPanel } from "@/components/activity/activity-feed-panel"
import { CompanyAdminPanel } from "@/components/admin/company-admin-panel"
import { PendingRegistrationsPanel } from "@/components/admin/pending-registrations-panel"
import { ChatPanel } from "@/components/chat/chat-panel"
import { useChat } from "@/components/chat/use-chat"
import { DirectoryProfilePanel } from "@/components/directory/directory-profile-panel"
import { DropdownMenuUser } from "@/components/site-menu"
import { Card, CardContent } from "@/components/ui/card"
import { Cluster, Stack, TopCommandBar, WorkspaceBody } from "@/components/ui/layout"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppSidebar } from "@/components/workspace/app-sidebar"
import { FileWorkspace } from "@/components/workspace/file-workspace"
import { api, type Api } from "@/lib/api"
import type { Colleague } from "@/types/api"

interface WorkspaceShellProps {
  initialTab?: string
  userName?: string
  isAdmin?: boolean
  embedded?: boolean
  baseUrl?: string
  loginUrl?: string
  client?: Api
  documents?: ReactNode
}

export function WorkspaceShell({
  initialTab = "files",
  userName,
  isAdmin = false,
  embedded = false,
  baseUrl = "/",
  loginUrl,
  client = api,
  documents,
}: WorkspaceShellProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>(() =>
    restrictWorkspaceTab(readTabFromLocation(parseWorkspaceTab(initialTab, "files")), isAdmin),
  )
  const [chatPeer, setChatPeer] = useState(readChatPeerFromLocation)
  const chat = useChat(client, embedded, embedded && activeTab === "chat", baseUrl, loginUrl)

  useEffect(() => {
    const onPopState = () => {
      setActiveTab(
        restrictWorkspaceTab(readTabFromLocation(parseWorkspaceTab(initialTab, "files")), isAdmin),
      )
      setChatPeer(readChatPeerFromLocation())
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [initialTab, isAdmin])

  function handleSelectTab(tab: WorkspaceTabId) {
    const allowed = restrictWorkspaceTab(tab, isAdmin)
    if (allowed === activeTab) return
    setActiveTab(allowed)
    setChatPeer(undefined)
    syncTabToLocation(allowed)
  }

  function handleOpenConversation(colleague: Colleague) {
    setChatPeer(colleague.id)
    setActiveTab("chat")
    syncTabToLocation("chat", colleague.id)
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
        chatUnread={chat.unread}
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
                </TabsList>
              </div>

              <TabsContent value="overview">
                <Stack gap="lg">
                  <PendingRegistrationsPanel client={client} />
                  <CompanyAdminPanel client={client} />
                </Stack>
              </TabsContent>

              <TabsContent value="registrations">
                <PendingRegistrationsPanel client={client} />
              </TabsContent>

              <TabsContent value="departments">
                <CompanyAdminPanel client={client} />
              </TabsContent>

            </Tabs>
          )}

          {activeTab === "directory" && (
            <DirectoryProfilePanel client={client} onOpenConversation={handleOpenConversation} />
          )}

          {activeTab === "activity" && <ActivityFeedPanel client={client} />}

          {activeTab === "chat" && (embedded ? (
            <ChatPanel
              client={client}
              chat={chat}
              peerId={chatPeer}
              onClearPeer={() => { setChatPeer(undefined); syncTabToLocation("chat") }}
              onDirectory={() => handleSelectTab("directory")}
            />
          ) : (
            <Card><CardContent>Le chat est disponible depuis le tableau de bord après connexion.</CardContent></Card>
          ))}
        </WorkspaceBody>

        <Toaster position="top-right" richColors closeButton />
      </SidebarInset>
    </SidebarProvider>
  )
}
