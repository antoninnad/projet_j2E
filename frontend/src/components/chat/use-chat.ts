import { useCallback, useEffect, useRef, useState } from "react"
import type { Api } from "@/lib/api"
import { ApiError } from "@/lib/api-client"
import type { ChatMessage, ChatParticipant, Conversation, SendChatMessage } from "@/types/api"
import { useChatSocket, type ChatEvent } from "./use-chat-socket"

export type OutgoingMessage = SendChatMessage & { failure?: string; forbidden?: boolean }
type Listener = (event: ChatEvent) => void

export function chatName(peer: ChatParticipant): string {
  return [peer.firstName, peer.lastName].filter(Boolean).join(" ") || peer.username
}

function createMessageId(): string {
  return crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)),
    byte => byte.toString(16).padStart(2, "0")).join("")
}

export function useChat(client: Api, enabled: boolean, active: boolean, baseUrl: string, loginUrl?: string) {
  const [revision, setRevision] = useState(0)
  const [pages, setPages] = useState(1)
  const [list, setList] = useState<{
    revision: number; pages: number; items?: Conversation[]; hasMore?: boolean; error?: string
  }>()
  const [unread, setUnread] = useState(0)
  const [outbox, setOutbox] = useState<Record<number, OutgoingMessage[]>>({})
  const [listeners] = useState(() => new Set<Listener>())
  const userId = useRef<number>(undefined)
  const sending = useRef(new Set<string>())

  const refresh = useCallback(() => setRevision(value => value + 1), [])
  const subscribe = useCallback((listener: Listener) => {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [listeners])

  const confirm = useCallback((id: number, messages: ChatMessage[]) => {
    const confirmed = new Set(messages.filter(message => message.mine).map(message => message.clientMessageId))
    setOutbox(current => {
      const pending = current[id]?.filter(item => !confirmed.has(item.clientMessageId))
      if (!pending || pending.length === current[id].length) return current
      return { ...current, [id]: pending }
    })
  }, [])

  function discard(id: number, messageId: string) {
    setOutbox(current => {
      if (!current[id]?.some(item => item.clientMessageId === messageId)) return current
      return { ...current, [id]: current[id].filter(item => item.clientMessageId !== messageId) }
    })
  }

  function receive(event: ChatEvent) {
    if (event.type === "ready") userId.current = event.userId
    if (event.type === "message.created" && event.message.mine) confirm(event.conversationId, [event.message])
    if (event.type !== "conversation.read" || event.readerId === userId.current) refresh()
    listeners.forEach(listener => listener(event))
  }

  const socket = useChatSocket(enabled, baseUrl, loginUrl, receive)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const { signal } = controller
    void client.getChatUnread(signal).then(({ total }) => {
      if (!signal.aborted) setUnread(total)
    }).catch(() => {})
    return () => controller.abort()
  }, [client, enabled, revision])

  useEffect(() => {
    if (!active) return
    const controller = new AbortController()
    const { signal } = controller
    void Promise.all(Array.from({ length: pages }, (_, page) => client.listConversations(page, signal)))
      .then(results => {
        if (signal.aborted) return
        const items = new Map<number, Conversation>()
        results.forEach(result => result.items.forEach(item => items.set(item.id, item)))
        setList({ pages, revision, items: [...items.values()], hasMore: !results.at(-1)?.page.last })
      })
      .catch((error: Error) => {
        if (!signal.aborted) setList(current => ({ ...current, pages, revision, error: error.message }))
      })
    return () => controller.abort()
  }, [client, active, pages, revision])

  async function transmit(id: number, data: SendChatMessage) {
    if (sending.current.has(data.clientMessageId)) return
    sending.current.add(data.clientMessageId)
    try {
      const message = await client.sendChatMessage(id, data)
      receive({ type: "message.created", conversationId: id, message })
    } catch (error) {
      const forbidden = error instanceof ApiError && error.status === 403
      const failure = error instanceof Error ? error.message : "Impossible d'envoyer le message."
      setOutbox(current => ({ ...current, [id]: current[id]?.map(item =>
        item.clientMessageId === data.clientMessageId ? { ...data, failure, forbidden } : item) ?? [] }))
      if (forbidden) refresh()
    } finally {
      sending.current.delete(data.clientMessageId)
    }
  }

  function send(id: number, content: string) {
    const data = { content, clientMessageId: createMessageId() }
    setOutbox(current => ({ ...current, [id]: [...(current[id] ?? []), data] }))
    void transmit(id, data)
  }

  function retry(id: number, { clientMessageId, content }: OutgoingMessage) {
    const data = { clientMessageId, content }
    setOutbox(current => ({ ...current, [id]: current[id]?.map(item =>
      item.clientMessageId === clientMessageId ? data : item) ?? [] }))
    void transmit(id, data)
  }

  return {
    ...socket, unread, list, outbox, subscribe, refresh, send, retry, discard, confirm,
    loading: list?.revision !== revision || list?.pages !== pages,
    loadMore: () => setPages(value => value + 1),
  }
}

export type Chat = ReturnType<typeof useChat>
