import { useCallback, useEffect, useRef, useState } from "react"
import type { Api } from "@/lib/api"
import type { ChatMessage, Conversation } from "@/types/api"
import type { Chat } from "./use-chat"

export function useChatHistory(client: Api, { id, peer }: Conversation, { subscribe, confirm }: Chat) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [hasOlder, setHasOlder] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [olderError, setOlderError] = useState<string>()
  const [peerRead, setPeerRead] = useState(0)
  const [sync, setSync] = useState(0)
  const [result, setResult] = useState<{ sync: number; error?: string }>()
  const checkpoint = useRef<number>(undefined)
  const olderCursor = useRef<number>(undefined)
  const olderRequest = useRef<AbortController>(undefined)
  const resync = useCallback(() => setSync(value => value + 1), [])

  const append = useCallback((incoming: ChatMessage[]) => {
    if (!incoming.length) return
    setMessages(current => {
      const merged = new Map(current.map(message => [message.id, message]))
      incoming.forEach(message => merged.set(message.id, message))
      return [...merged.values()].sort((first, second) => first.id - second.id)
    })
  }, [])

  useEffect(() => subscribe(event => {
    if (event.type === "ready") resync()
    else if (event.conversationId === id) {
      if (event.type === "message.created") append([event.message])
      if (event.type === "conversation.read" && event.readerId === peer.id) {
        setPeerRead(value => Math.max(value, event.lastReadMessageId))
      }
    }
  }), [append, id, peer.id, resync, subscribe])

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    async function load() {
      try {
        let hasMore: boolean
        do {
          // Advance only through REST pages so a live event cannot skip a gap.
          const after = checkpoint.current
          const page = await client.listChatMessages(id, { after }, signal)
          if (signal.aborted) return
          confirm(id, page.items)
          append(page.items)
          checkpoint.current = page.items.at(-1)?.id ?? after ?? 0
          if (after === undefined) {
            olderCursor.current = page.items[0]?.id
            setHasOlder(page.hasMore)
          }
          hasMore = after !== undefined && page.hasMore
        } while (hasMore)
        setResult({ sync })
      } catch (error) {
        if (!signal.aborted) setResult({ sync, error: (error as Error).message })
      }
    }

    void load()
    return () => controller.abort()
  }, [append, client, confirm, id, sync])

  useEffect(() => () => olderRequest.current?.abort(), [])

  async function loadOlder(beforeAppend: () => void) {
    const before = olderCursor.current
    if (!before || !hasOlder || olderRequest.current) return
    const controller = new AbortController()
    olderRequest.current = controller
    setLoadingOlder(true)
    setOlderError(undefined)
    try {
      const page = await client.listChatMessages(id, { before }, controller.signal)
      if (controller.signal.aborted) return
      if (page.items.length) beforeAppend()
      confirm(id, page.items)
      append(page.items)
      olderCursor.current = page.items[0]?.id
      setHasOlder(page.hasMore)
    } catch (error) {
      if (!controller.signal.aborted) setOlderError((error as Error).message)
    } finally {
      if (!controller.signal.aborted) setLoadingOlder(false)
      olderRequest.current = undefined
    }
  }

  return { messages, loading: result?.sync !== sync, historyError: result?.sync === sync ? result.error : undefined,
    resync, sync, peerRead, hasOlder, loadingOlder, olderError, loadOlder }
}
