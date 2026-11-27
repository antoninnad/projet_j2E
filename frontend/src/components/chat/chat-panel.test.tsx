import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createApi, type Api } from "@/lib/api"
import { paginate } from "@/lib/pagination"
import type { ChatMessage, Conversation, SendChatMessage } from "@/types/api"
import { ChatPanel } from "./chat-panel"
import { useChat } from "./use-chat"

const date = "2026-11-27T09:00:00Z"
const conversation: Conversation = {
  id: 3, peer: { id: 2, firstName: "Bob", lastName: "Durand", username: "bob", active: true },
  lastMessage: null, unreadCount: 0, lastReadMessageId: null, canSend: true, createdAt: date, lastActivityAt: date,
}

function message(id: number, content: string, mine = false): ChatMessage {
  return { id, content, mine, conversationId: 3, senderId: mine ? 1 : 2, sentAt: date }
}

class ChatSocket {
  static readonly OPEN = 1
  static connections: ChatSocket[] = []
  onmessage?: (event: { data: string }) => void
  onclose?: (event: { code: number }) => void
  readyState = ChatSocket.OPEN
  send = vi.fn()
  close = vi.fn()

  constructor() { ChatSocket.connections.push(this) }

  receive(event: object) { this.onmessage?.({ data: JSON.stringify(event) }) }
}

function ChatFixture({ client, peerId }: { client: Api; peerId?: number }) {
  const chat = useChat(client, true, true, "/")
  return <>
    <output aria-label="Total non lu">{chat.unread}</output>
    <ChatPanel client={client} chat={chat} peerId={peerId} onClearPeer={() => {}} onDirectory={() => {}} />
  </>
}

describe("ChatPanel", () => {
  beforeEach(() => {
    ChatSocket.connections = []
    vi.stubGlobal("WebSocket", ChatSocket)
  })

  afterEach(() => vi.unstubAllGlobals())

  it("ouvre la conversation depuis le profil et réessaie un envoi avec le même identifiant", async () => {
    const user = userEvent.setup()
    const sent: SendChatMessage[] = []
    const fetcher = vi.fn(async (url: string, request: RequestInit) => {
      if (url === "/api/conversations") {
        expect(request.method).toBe("POST")
        expect(JSON.parse(String(request.body))).toEqual({ peerId: 2 })
        return Response.json(conversation)
      }
      if (url === "/api/conversations?page=0") return Response.json(paginate([conversation]))
      if (url === "/api/conversations/unread") return Response.json({ total: 0 })
      if (url === "/api/conversations/3/messages" && request.method === "POST") {
        const data: SendChatMessage = JSON.parse(String(request.body))
        sent.push(data)
        if (sent.length === 1) throw new Error("Connection lost")
        return Response.json({ ...message(20, data.content, true), clientMessageId: data.clientMessageId })
      }
      if (url === "/api/conversations/3/messages") return Response.json({ items: [], hasMore: false })
      throw new Error(`Unexpected route ${url}`)
    })
    render(<ChatFixture client={createApi({ fetcher })} peerId={2} />)
    act(() => ChatSocket.connections[0].receive({ type: "ready", userId: 1 }))

    fireEvent.change(await screen.findByRole("textbox", { name: "Ton message" }), {
      target: { value: "Bonjour Bob" },
    })
    await user.click(screen.getByRole("button", { name: "Envoyer" }))
    await user.click(await screen.findByRole("button", { name: "Réessayer l’envoi" }))
    await waitFor(() => expect(sent).toHaveLength(2))
    expect(sent[1]).toEqual(sent[0])
    const event = {
      type: "message.created", conversationId: 3,
      message: { ...message(20, sent[0].content, true), clientMessageId: sent[0].clientMessageId },
    }
    act(() => ChatSocket.connections[0].receive(event))
    const log = within(screen.getByRole("log"))
    expect(log.getAllByText("Bonjour Bob")).toHaveLength(1)
    expect(log.queryByText("Envoi…")).not.toBeInTheDocument()
  })

  it("rattrape plusieurs pages après une coupure et marque la conversation lue", async () => {
    const user = userEvent.setup()
    let lastRead = 0
    let unread = 2
    let finishCatchUp!: (response: Response) => void
    const catchUp = new Promise<Response>(resolve => { finishCatchUp = resolve })
    const fetcher = vi.fn(async (url: string, request: RequestInit) => {
      if (url === "/api/conversations?page=0") return Response.json(paginate([{ ...conversation, unreadCount: unread }]))
      if (url === "/api/conversations/unread") return Response.json({ total: unread })
      if (url === "/api/conversations/3/messages") return Response.json({ items: [message(10, "Message de départ", true)], hasMore: true })
      if (url === "/api/conversations/3/messages?before=10") return Response.json({ items: [message(5, "Ancien message")], hasMore: false })
      if (url === "/api/conversations/3/messages?after=10") return catchUp
      if (url === "/api/conversations/3/messages?after=12") {
        return Response.json({ items: [message(13, "Message en double")], hasMore: false })
      }
      if (url === "/api/conversations/3/read") {
        lastRead = JSON.parse(String(request.body)).lastMessageId
        unread = 0
        return Response.json({ ...conversation, lastReadMessageId: lastRead })
      }
      throw new Error(`Unexpected route ${url}`)
    })
    render(<ChatFixture client={createApi({ fetcher })} />)
    const first = ChatSocket.connections[0]
    act(() => first.receive({ type: "ready", userId: 1 }))
    await user.click(await screen.findByRole("button", { name: /Bob Durand/ }))
    const log = within(screen.getByRole("log"))
    expect(await log.findByText("Message de départ")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Messages précédents" }))
    expect(await log.findByText("Ancien message")).toBeInTheDocument()
    expect(screen.getByLabelText("Total non lu")).toHaveTextContent("2")

    act(() => first.onclose?.({ code: 1006 }))
    expect(screen.getByText(/Reconnexion en cours/)).toBeInTheDocument()
    await waitFor(() => expect(ChatSocket.connections).toHaveLength(2), { timeout: 2000 })
    const second = ChatSocket.connections[1]
    act(() => {
      second.receive({ type: "ready", userId: 1 })
      second.receive({ type: "message.created", conversationId: 3, message: message(13, "Message en double") })
    })
    expect(lastRead).toBe(0)
    await act(async () => finishCatchUp(Response.json({ items: [message(12, "Message rattrapé")], hasMore: true })))

    expect(await log.findByText("Message rattrapé")).toBeInTheDocument()
    expect(log.getAllByText("Message en double")).toHaveLength(1)
    await waitFor(() => expect(lastRead).toBe(13))
    await waitFor(() => expect(screen.getByLabelText("Total non lu")).toHaveTextContent("0"))
  })
})
