import { useEffect, useEffectEvent, useState } from "react"
import { resolveAppPath } from "@/app/routes"
import { expiredLoginUrl } from "@/lib/session"
import type { ChatMessage } from "@/types/api"

export type ChatEvent =
  | { type: "ready"; userId: number }
  | { type: "message.created"; conversationId: number; message: ChatMessage }
  | { type: "conversation.read"; conversationId: number; readerId: number; lastReadMessageId: number }

type Connection = "connecting" | "connected" | "reconnecting" | "limited" | "expired"

function parseEvent(data: unknown): ChatEvent | undefined {
  if (typeof data !== "string") return
  try {
    const event = JSON.parse(data) as ChatEvent | null
    if (event?.type === "ready" && Number.isSafeInteger(event.userId)) return event
    if (event?.type === "message.created" && Number.isSafeInteger(event.message?.id)) return event
    if (event?.type === "conversation.read" && Number.isSafeInteger(event.lastReadMessageId)) return event
  } catch {
    // Ignore malformed frames without interrupting the connection.
  }
}

export function useChatSocket(
  enabled: boolean,
  baseUrl: string,
  loginUrl: string | undefined,
  onEvent: (event: ChatEvent) => void,
) {
  const [connection, setConnection] = useState<Connection>("connecting")
  const [attempt, setAttempt] = useState(0)
  const receive = useEffectEvent(onEvent)

  useEffect(() => {
    if (!enabled) return
    const url = new URL(resolveAppPath(baseUrl, "/ws/chat"), window.location.href)
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
    let socket: WebSocket
    let heartbeat: number | undefined
    let retry: number | undefined
    let delay = 1000

    function connect() {
      socket = new WebSocket(url)
      socket.onmessage = ({ data }) => {
        const event = parseEvent(data)
        if (!event) return
        if (event.type === "ready") {
          delay = 1000
          setConnection("connected")
          window.clearInterval(heartbeat)
          heartbeat = window.setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) socket.send('{"type":"ping"}')
          }, 30_000)
        }
        receive(event)
      }
      socket.onclose = ({ code }) => {
        window.clearInterval(heartbeat)
        if (code === 4401) {
          setConnection("expired")
          window.location.assign(loginUrl || expiredLoginUrl(baseUrl))
        } else if (code === 4429) {
          setConnection("limited")
        } else {
          setConnection("reconnecting")
          retry = window.setTimeout(connect, delay)
          delay = Math.min(delay * 2, 30_000)
        }
      }
    }

    connect()
    return () => {
      window.clearTimeout(retry)
      window.clearInterval(heartbeat)
      socket.onmessage = socket.onclose = null
      socket.close()
    }
  }, [enabled, baseUrl, loginUrl, attempt])

  return {
    connection,
    reconnect: () => {
      setConnection("connecting")
      setAttempt(value => value + 1)
    },
  }
}
