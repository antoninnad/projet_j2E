import { useEffect, useState } from "react"
import { AlertCircle, Check, RefreshCw, ShieldCheck, UserX } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIcon,
  EmptyTitle,
} from "@/components/ui/empty"
import { Cluster, Stack } from "@/components/ui/layout"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

    client
      .listUsers({ ...query, status: "PENDING" }, controller.signal)
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
        setError(
          err instanceof ApiError && err.status === 403
            ? "Accès administrateur requis pour consulter les demandes d'inscription."
            : message,
        )
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
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>Demandes d&apos;inscription en attente</h2>
        </CardTitle>
        <CardDescription>
          Approuvez les nouveaux salariés de votre entreprise ou refusez les demandes non reconnues.
        </CardDescription>

        <CardAction>
          <Cluster gap="sm">
            {result && (
              <Badge variant={result.page.totalElements > 0 ? "warning" : "outline"}>
                {result.page.totalElements} en attente
              </Badge>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => loadPage(query.page)}
              disabled={loading || busy}
            >
              <RefreshCw className={loading ? "animate-spin" : undefined} aria-hidden="true" />
              Actualiser
            </Button>
          </Cluster>
        </CardAction>
      </CardHeader>

      <CardContent>
        <Stack gap="md">
          {error && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                <span>{error}</span>
                {!result && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading || busy}
                    onClick={() => loadPage(query.page)}
                  >
                    Réessayer
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            <Stack gap="sm" role="status" aria-label="Chargement des demandes d'inscription">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </Stack>
          ) : result?.items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyIcon>
                  <ShieldCheck aria-hidden="true" />
                </EmptyIcon>
                <EmptyTitle>Aucune demande en attente</EmptyTitle>
                <EmptyDescription>
                  Les nouvelles inscriptions nécessitant votre approbation apparaîtront automatiquement ici.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            result && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidat</TableHead>
                    <TableHead>Coordonnées</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Décision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{formatDisplayName(user)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {user.email}
                        {user.username ? ` · @${user.username}` : ""}
                      </TableCell>
                      <TableCell>
                        <Badge variant="warning">En attente</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Cluster justify="end" gap="xs">
                          <Button
                            type="button"
                            size="sm"
                            disabled={busy}
                            onClick={() => void handleAction(user, "approve")}
                          >
                            <Check aria-hidden="true" />
                            Approuver
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => void handleAction(user, "decline")}
                          >
                            <UserX aria-hidden="true" />
                            Refuser
                          </Button>
                        </Cluster>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}
        </Stack>
      </CardContent>

      {result && !loading && result.page.totalPages > 1 && (
        <CardFooter className="border-t">
          <span className="text-xs text-muted-foreground">
            Page {result.page.page + 1} / {result.page.totalPages}
          </span>
          <Cluster gap="sm">
            <Button
              variant="outline"
              size="sm"
              disabled={result.page.first || busy}
              onClick={() => loadPage(query.page - 1)}
            >
              Précédente
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={result.page.last || busy}
              onClick={() => loadPage(query.page + 1)}
            >
              Suivante
            </Button>
          </Cluster>
        </CardFooter>
      )}
    </Card>
  )
}
