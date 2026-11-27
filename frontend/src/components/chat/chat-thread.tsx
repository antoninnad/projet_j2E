import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Send } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import type { Api } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { Conversation } from "@/types/api"
import { chatName, type Chat, type OutgoingMessage } from "./use-chat"
import { useChatHistory } from "./use-chat-history"

const DATE_TIME = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" })
const NO_OUTGOING: OutgoingMessage[] = []

export function ChatThread({ client, chat, conversation }: { client: Api; chat: Chat; conversation: Conversation }) {
  const { id, peer, lastReadMessageId } = conversation
  const { refresh } = chat
  const history = useChatHistory(client, conversation, chat)
  const { messages, loading, historyError, resync, sync } = history
  const outgoing = chat.outbox[id] ?? NO_OUTGOING
  const canSend = conversation.canSend && !outgoing.some(message => message.forbidden)
  const [draft, setDraft] = useState("")
  const [atEnd, setAtEnd] = useState(true)
  const [visible, setVisible] = useState(() => document.visibilityState === "visible")
  const [readError, setReadError] = useState<string>()
  const scroll = useRef<HTMLDivElement>(null)
  const previousHeight = useRef<number>(undefined)
  const readThrough = useRef(0)
  const last = messages.at(-1)

  useEffect(() => {
    const update = () => setVisible(document.visibilityState === "visible")
    document.addEventListener("visibilitychange", update)
    return () => document.removeEventListener("visibilitychange", update)
  }, [])

  useLayoutEffect(() => {
    const element = scroll.current
    if (!element) return
    if (previousHeight.current !== undefined) {
      element.scrollTop += element.scrollHeight - previousHeight.current
      previousHeight.current = undefined
    } else if (atEnd) {
      element.scrollTop = element.scrollHeight
    }
  }, [atEnd, messages, outgoing])

  useEffect(() => {
    if (!last || !visible || !atEnd || loading || historyError || last.mine ||
      last.id <= Math.max(readThrough.current, lastReadMessageId ?? 0)) return
    const controller = new AbortController()
    const { signal } = controller
    void client.markChatRead(id, last.id, signal).then(() => {
      if (!signal.aborted) {
        readThrough.current = last.id
        setReadError(undefined)
        refresh()
      }
    }).catch((error: Error) => {
      if (!signal.aborted) setReadError(error.message)
    })
    return () => controller.abort()
  }, [atEnd, client, historyError, id, last, lastReadMessageId, loading, refresh, sync, visible])

  return (
    <Card className="min-w-0 gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-4">
        <CardTitle><h2>{chatName(peer)}</h2></CardTitle>
        {!canSend && <p className="text-sm text-muted-foreground">Conversation en lecture seule.</p>}
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {historyError && (
          <Alert variant="destructive" className="flex flex-wrap items-center justify-between gap-2">
            <AlertDescription>{historyError}</AlertDescription>
            <Button type="button" size="sm" variant="outline" onClick={resync}>Recharger l’historique</Button>
          </Alert>
        )}
        {readError && (
          <Alert variant="destructive" className="flex flex-wrap items-center justify-between gap-2">
            <AlertDescription>Lecture non enregistrée. {readError}</AlertDescription>
            <Button type="button" size="sm" variant="outline" onClick={resync}>Réessayer</Button>
          </Alert>
        )}
        <div
          ref={scroll}
          className="h-[clamp(18rem,50dvh,36rem)] space-y-3 overflow-y-auto overscroll-contain px-1"
          tabIndex={0}
          aria-label="Historique des messages"
          onScroll={event => {
            const { scrollHeight, scrollTop, clientHeight } = event.currentTarget
            setAtEnd(scrollHeight - scrollTop - clientHeight < 32)
          }}
        >
          {history.hasOlder && (
            <div className="space-y-2 text-center">
              <Button type="button" size="sm" variant="outline" disabled={history.loadingOlder}
                onClick={() => void history.loadOlder(() => { previousHeight.current = scroll.current?.scrollHeight })}
              >
                {history.loadingOlder ? "Chargement…" : "Messages précédents"}
              </Button>
              {history.olderError && <p role="alert" className="text-sm text-destructive">{history.olderError}</p>}
            </div>
          )}
          {loading && !messages.length && (
            <div role="status" className="space-y-3">
              <span className="sr-only">Chargement des messages…</span>
              <Skeleton className="h-12 w-2/3" />
              <Skeleton className="ml-auto h-12 w-1/2" />
            </div>
          )}
          {!loading && !historyError && !messages.length && !outgoing.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucun message dans cette conversation.</p>
          )}
          <ol role="log" aria-label="Messages" className="flex flex-col gap-3">
            {messages.map(message => (
              <li key={message.id} className={cn("max-w-[85%] space-y-1", message.mine ? "self-end" : "self-start")}>
                <p className={cn("rounded-lg px-3 py-2 text-sm wrap-anywhere whitespace-pre-wrap",
                  message.mine ? "bg-primary text-primary-foreground" : "bg-muted")}>{message.content}</p>
                <p className={cn("text-xs text-muted-foreground", message.mine && "text-right")}>
                  <time dateTime={message.sentAt}>{DATE_TIME.format(new Date(message.sentAt))}</time>
                  {message.mine && message.id === history.peerRead && " · Lu"}
                </p>
              </li>
            ))}
            {outgoing.map(message => (
              <li key={message.clientMessageId} className="max-w-[85%] space-y-1 self-end">
                <p className="rounded-lg bg-primary-subtle px-3 py-2 text-sm wrap-anywhere whitespace-pre-wrap">{message.content}</p>
                {message.failure ? (
                  <div className="space-y-1 text-right">
                    <p role="alert" className="text-xs text-destructive">{message.failure}</p>
                    {canSend && <Button type="button" size="sm" variant="outline" onClick={() => chat.retry(id, message)}>Réessayer l’envoi</Button>}
                    <Button type="button" size="sm" variant="ghost" onClick={() => chat.discard(id, message.clientMessageId)}>Retirer</Button>
                  </div>
                ) : <p className="text-right text-xs text-muted-foreground">Envoi…</p>}
              </li>
            ))}
          </ol>
        </div>
        {canSend && (
          <form className="flex items-end gap-2 border-t pt-3" onSubmit={event => {
            event.preventDefault()
            if (!draft.trim()) return
            chat.send(id, draft.trim())
            setDraft("")
          }}>
            <div className="min-w-0 flex-1">
              <Label htmlFor="chat-message" className="sr-only">Ton message</Label>
              <Textarea id="chat-message" value={draft} onChange={event => setDraft(event.target.value)}
                placeholder="Écrire un message" maxLength={4000} rows={2} className="max-h-36 resize-none" />
            </div>
            <Button type="submit" disabled={!draft.trim()}><Send aria-hidden="true" /> Envoyer</Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
