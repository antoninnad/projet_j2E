import { useEffect, useState } from "react"
import { MessageSquare } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyIcon, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import type { Api } from "@/lib/api"
import type { Conversation } from "@/types/api"
import { ChatThread } from "./chat-thread"
import { chatName, type Chat } from "./use-chat"

export function ChatPanel({ client, chat, peerId, onClearPeer, onDirectory }: {
  client: Api
  chat: Chat
  peerId?: number
  onClearPeer: () => void
  onDirectory: () => void
}) {
  const { list, connection, loading, refresh } = chat
  const [selected, setSelected] = useState<Conversation>()
  const [opening, setOpening] = useState<{ peerId: number; conversation?: Conversation; error?: string }>()
  const [attempt, setAttempt] = useState(0)
  const currentOpening = opening?.peerId === peerId ? opening : undefined
  const current = peerId === undefined ? selected : currentOpening?.conversation
  const conversation = list?.items?.find(item => item.id === current?.id) ?? current

  useEffect(() => {
    if (peerId === undefined) return
    const controller = new AbortController()
    const { signal } = controller
    void client.openConversation(peerId, signal).then(conversation => {
      if (signal.aborted) return
      setOpening({ peerId, conversation })
      refresh()
    }).catch((error: Error) => {
      if (!signal.aborted) setOpening({ peerId, error: error.message })
    })
    return () => controller.abort()
  }, [attempt, client, peerId, refresh])

  return (
    <div className="space-y-3">
      {connection === "connecting" && <p role="status" className="sr-only">Connexion au chat…</p>}
      {connection === "reconnecting" && (
        <Alert role="status" variant="warning">
          <AlertDescription>Connexion au chat interrompue. Reconnexion en cours…</AlertDescription>
        </Alert>
      )}
      {connection === "limited" && (
        <Alert variant="warning" className="flex flex-wrap items-center justify-between gap-2">
          <AlertDescription>Ferme un autre onglet pour rétablir le chat en temps réel.</AlertDescription>
          <Button type="button" variant="outline" size="sm" onClick={chat.reconnect}>Reconnecter</Button>
        </Alert>
      )}
      <div className="grid items-start gap-4 md:grid-cols-[minmax(12rem,18rem)_minmax(0,1fr)]">
        <Card className="min-w-0 gap-0 py-0">
          <CardHeader className="border-b py-4">
            <CardTitle><h2>Conversations</h2></CardTitle>
          </CardHeader>
          <CardContent className="max-h-[40dvh] space-y-3 overflow-y-auto p-3 md:max-h-[75dvh]">
            {!loading && list?.error && (
              <Alert variant="destructive">
                <AlertDescription>{list.error}</AlertDescription>
                <Button type="button" variant="outline" size="sm" onClick={refresh}>Réessayer</Button>
              </Alert>
            )}
            {loading && !list?.items && (
              <div role="status" className="space-y-2">
                <span className="sr-only">Chargement des conversations…</span>
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            )}
            {!loading && !list?.error && !list?.items?.length && (
              <p className="text-sm text-muted-foreground">Aucune conversation pour le moment.</p>
            )}
            <ul aria-label="Conversations" className="space-y-1">
              {list?.items?.map(item => (
                <li key={item.id}>
                  <Button
                    type="button"
                    variant={item.id === conversation?.id ? "secondary" : "ghost"}
                    className="h-auto w-full justify-between py-2 text-left"
                    aria-current={item.id === conversation?.id ? "true" : undefined}
                    onClick={() => { setSelected(item); onClearPeer() }}
                  >
                    <span className="min-w-0 space-y-1">
                      <span className="block truncate">{chatName(item.peer)}</span>
                      {item.lastMessage && (
                        <span className="block truncate text-xs font-normal text-muted-foreground" aria-hidden="true">
                          {item.lastMessage.content}
                        </span>
                      )}
                    </span>
                    {item.unreadCount > 0 && (
                      <Badge variant="brand" aria-label={`${item.unreadCount} non lus`}>{item.unreadCount}</Badge>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
            {list?.hasMore && (
              <Button type="button" variant="outline" size="sm" disabled={loading} onClick={chat.loadMore}>
                {loading ? "Chargement…" : "Plus de conversations"}
              </Button>
            )}
          </CardContent>
        </Card>
        {conversation ? (
          <ChatThread key={conversation.id} client={client} chat={chat} conversation={conversation} />
        ) : peerId !== undefined && !currentOpening?.error ? (
          <Card className="p-5">
            <p role="status" className="sr-only">Ouverture de la conversation…</p>
            <Skeleton className="h-48" />
          </Card>
        ) : (
          <Card>
            <CardContent>
              {currentOpening?.error && (
                <Alert variant="destructive" className="flex flex-wrap items-center justify-between gap-2">
                  <AlertDescription>{currentOpening.error}</AlertDescription>
                  <Button type="button" size="sm" variant="outline" onClick={() => setAttempt(value => value + 1)}>
                    Réessayer l’ouverture
                  </Button>
                </Alert>
              )}
              <Empty>
                <EmptyIcon><MessageSquare aria-hidden="true" /></EmptyIcon>
                <EmptyTitle>Ouvre une conversation</EmptyTitle>
                <EmptyDescription>Pour écrire à un collègue, ouvre son profil dans l’annuaire.</EmptyDescription>
                <Button type="button" variant="outline" onClick={onDirectory}>Ouvrir l’annuaire</Button>
              </Empty>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
