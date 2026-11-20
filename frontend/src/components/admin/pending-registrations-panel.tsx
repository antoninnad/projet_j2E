import { useEffect, useState } from "react"
import { Check, RefreshCw, ShieldCheck, UserX } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api, type Api } from "@/lib/api"
import { ApiError } from "@/lib/api-client"
import type { Page, User } from "@/types/api"

type RegistrationsApi = Pick<Api, "listUsers" | "approveUser" | "declineUser">

function formatDisplayName(user: User): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
  return fullName || user.username || user.email
}

export function PendingRegistrationsPanel({ client = api }: { client?: RegistrationsApi }) {
  const [query, setQuery] = useState({ page: 0 })
  const [result, setResult] = useState<Page<User> | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    client.listUsers({ ...query, status: "PENDING" }, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        const lastPage = Math.max(0, data.page.totalPages - 1)
        if (query.page > lastPage) {
          setQuery({ page: lastPage })
          return
        }
        setResult(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const message = err instanceof Error ? err.message : "Impossible de joindre le serveur."
        setError(err instanceof ApiError && err.status === 403
          ? "Accès administrateur requis pour consulter les demandes d'inscription."
          : message)
        setResult(null)
        setLoading(false)
      })

    return () => controller.abort()
  }, [client, query])

  function loadPage(page: number) {
    setLoading(true)
    setError(null)
    setQuery({ page })
  }

  async function handleAction(user: User, action: "approve" | "decline") {
    setBusy(true)
    setError(null)
    try {
      if (action === "approve") await client.approveUser(user.id)
      else await client.declineUser(user.id)
      loadPage(query.page)
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
      setBusy(false)
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
          {result && <Badge variant="outline">{result.page.totalElements} en attente</Badge>}
          <Button type="button" variant="outline" size="sm" onClick={() => loadPage(query.page)} disabled={loading || busy}>
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
        ) : result?.items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
            <p className="text-sm font-medium text-foreground">Aucune demande en attente</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Les nouvelles inscriptions nécessitant votre approbation apparaîtront automatiquement ici.
            </p>
          </div>
        ) : result && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {result.items.map((user) => (
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
                    disabled={busy}
                    onClick={() => void handleAction(user, "approve")}
                  >
                    <Check className="size-4" aria-hidden="true" />
                    Approuver
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void handleAction(user, "decline")}
                  >
                    <UserX className="size-4" aria-hidden="true" />
                    Refuser
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {result && !loading && result.page.totalPages > 1 && (
          <nav aria-label="Pagination des demandes" className="mt-4 flex items-center justify-end gap-3">
            <Button variant="outline" size="sm" disabled={result.page.first || busy} onClick={() => loadPage(query.page - 1)}>
              Précédente
            </Button>
            <span className="text-sm text-muted-foreground">{result.page.page + 1} / {result.page.totalPages}</span>
            <Button variant="outline" size="sm" disabled={result.page.last || busy} onClick={() => loadPage(query.page + 1)}>
              Suivante
            </Button>
          </nav>
        )}
      </div>
    </section>
  )
}
