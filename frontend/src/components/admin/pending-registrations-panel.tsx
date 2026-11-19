import { useEffect, useState } from "react"
import { Check, RefreshCw, ShieldCheck, UserX } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const ADMIN_USERS_API = "/api/admin/users"

interface PendingUser {
  id: number
  username?: string
  firstName?: string
  lastName?: string
  email: string
}

function formatDisplayName(user: PendingUser): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
  return fullName || user.username || user.email
}

async function fetchPendingUsers(signal?: AbortSignal): Promise<PendingUser[]> {
  const response = await fetch(`${ADMIN_USERS_API}/pending`, {
    credentials: "include",
    signal,
  })
  if (response.status === 401 || response.status === 403) {
    throw new Error("Accès administrateur requis pour consulter les demandes d'inscription.")
  }
  if (!response.ok) {
    throw new Error(`Le serveur a répondu avec le statut ${response.status}.`)
  }
  const data: PendingUser[] = await response.json()
  return Array.isArray(data) ? data : []
}

export function PendingRegistrationsPanel() {
  const [users, setUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    fetchPendingUsers(controller.signal)
      .then((data) => {
        if (!active) return
        setUsers(data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!active || (err instanceof DOMException && err.name === "AbortError")) return
        const message = err instanceof Error ? err.message : "Impossible de joindre le serveur."
        setError(message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [])

  async function handleRefresh() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPendingUsers()
      setUsers(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de joindre le serveur."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(user: PendingUser, action: "approve" | "decline") {
    setBusyId(user.id)
    setError(null)
    try {
      const response = await fetch(`${ADMIN_USERS_API}/${user.id}/${action}`, {
        method: "POST",
        credentials: "include",
      })
      if (!response.ok) {
        throw new Error(`Le serveur a répondu avec le statut ${response.status}.`)
      }
      setUsers((current) => current.filter((item) => item.id !== user.id))
      const label = formatDisplayName(user)
      toast.success(
        action === "approve"
          ? `${label} a été approuvé et peut maintenant se connecter.`
          : `La demande de ${label} a été refusée.`,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : "Action impossible pour le moment."
      setError(message)
      toast.error("Échec de l'opération", { description: message })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <ShieldCheck className="size-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight">Demandes d'inscription en attente</h2>
            <p className="text-xs text-muted-foreground">
              Approuvez les nouveaux salariés de votre entreprise ou refusez les demandes non reconnues.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline">{users.length} en attente</Badge>
          <Button type="button" variant="outline" size="sm" onClick={() => void handleRefresh()} disabled={loading}>
            <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
            Actualiser
          </Button>
        </div>
      </div>

      <div className="p-5">
        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            {error}
          </div>
        )}

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Chargement des demandes d'inscription…
          </p>
        ) : users.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
            <p className="text-sm font-medium text-foreground">Aucune demande en attente</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Les nouvelles inscriptions nécessitant votre approbation apparaîtront automatiquement ici.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {users.map((user) => {
              const isBusy = busyId === user.id
              return (
                <li key={user.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{formatDisplayName(user)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email}
                      {user.username ? ` · @${user.username}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => void handleAction(user, "approve")}
                    >
                      <Check className="size-4" aria-hidden="true" />
                      Approuver
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => void handleAction(user, "decline")}
                    >
                      <UserX className="size-4" aria-hidden="true" />
                      Refuser
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
