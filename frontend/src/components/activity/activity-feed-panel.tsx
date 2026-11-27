import { Fragment, useEffect, useState } from "react"
import {
  Activity,
  AlertCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Folder,
  History,
  RefreshCw,
  Shield,
  UserCheck,
} from "lucide-react"
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
  EmptyActions,
  EmptyDescription,
  EmptyHeader,
  EmptyIcon,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"
import { Cluster, Stack } from "@/components/ui/layout"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api, type Api } from "@/lib/api"
import { ApiError } from "@/lib/api-client"
import type { ActivityCategory, ActivityEntry, Page } from "@/types/api"

export type ActivityFeedApi = Pick<Api, "listActivity">
export type NodeActivityApi = Partial<Pick<Api, "listNodeActivity">>

type CategoryFilter = "ALL" | ActivityCategory

const ACTIVITY_DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
})

const DEFAULT_FEED_PAGE_SIZE = 10
const DEFAULT_NODE_PAGE_SIZE = 5

function formatOccurredAt(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return iso
  return ACTIVITY_DATE_FORMATTER.format(parsed)
}

function describeActivityEntry(entry: ActivityEntry) {
  const actorName = entry.actor
    ? [entry.actor.firstName, entry.actor.lastName].filter(Boolean).join(" ").trim() || "Membre"
    : "Administrateur de plateforme"

  let subject: string | null = null
  if (entry.nodeName) {
    subject = entry.nodeName
  } else if (
    entry.departmentName &&
    (entry.action === "DEPARTMENT_CREATED" ||
      entry.action === "DEPARTMENT_RENAMED" ||
      entry.action === "MEMBER_ACCESS_SET" ||
      entry.action === "MEMBER_REMOVED")
  ) {
    subject = entry.departmentName
  } else if (entry.targetUserName) {
    subject = entry.targetUserName
  } else if (entry.departmentName) {
    subject = entry.departmentName
  }

  const secondaryParts: string[] = []
  if (entry.targetUserName && subject !== entry.targetUserName) {
    secondaryParts.push(`Membre concerné : ${entry.targetUserName}`)
  }
  if (entry.details?.trim()) {
    secondaryParts.push(entry.details.trim())
  }

  const categoryBadge: { label: string; variant: "info" | "brand" | "secondary" } =
    entry.category === "DOCUMENT"
      ? { label: "Document", variant: "info" }
      : entry.category === "RIGHTS"
        ? { label: "Permissions", variant: "brand" }
        : { label: "Administration", variant: "secondary" }

  const Icon =
    entry.category === "RIGHTS"
      ? Shield
      : entry.category === "ADMINISTRATION"
        ? entry.action.startsWith("ACCOUNT_") || entry.action.startsWith("MEMBER_")
          ? UserCheck
          : Building2
        : entry.nodeKind === "folder"
          ? Folder
          : FileText

  return {
    actorName,
    subject,
    secondaryText: secondaryParts.join(" · "),
    categoryBadge,
    formattedDate: formatOccurredAt(entry.occurredAt),
    Icon,
  }
}

function ActivityEntryRow({
  entry,
  compact = false,
}: {
  entry: ActivityEntry
  compact?: boolean
}) {
  const { actorName, subject, secondaryText, categoryBadge, formattedDate, Icon } =
    describeActivityEntry(entry)

  return (
    <Item role="listitem" size="sm" className={compact ? "px-0 py-2.5" : "px-2 py-3 sm:px-3"}>
      <ItemMedia
        variant="icon"
        className={
          entry.category === "RIGHTS"
            ? "border-primary/20 bg-primary-subtle text-primary-subtle-foreground"
            : entry.category === "DOCUMENT"
              ? "border-info-border bg-info-subtle text-info-foreground"
              : "border-border bg-muted text-muted-foreground"
        }
      >
        <Icon aria-hidden="true" />
      </ItemMedia>

      <ItemContent className="min-w-0">
        <ItemTitle className="w-full flex-wrap gap-x-1.5 gap-y-1 font-normal">
          <span className="font-semibold text-foreground">{actorName}</span>
          <span className="text-muted-foreground">{entry.label}</span>
          {subject && <span className="break-all font-medium text-foreground">{subject}</span>}
          {!compact && entry.departmentName && subject !== entry.departmentName && (
            <Badge variant="outline">{entry.departmentName}</Badge>
          )}
        </ItemTitle>

        {secondaryText && <ItemDescription>{secondaryText}</ItemDescription>}
      </ItemContent>

      <ItemActions className="w-full justify-between text-xs text-muted-foreground sm:w-auto sm:justify-end">
        <Badge variant={categoryBadge.variant}>{categoryBadge.label}</Badge>
        <time dateTime={entry.occurredAt} className="inline-flex items-center gap-1 whitespace-nowrap">
          <Clock className="size-3" aria-hidden="true" />
          {formattedDate}
        </time>
      </ItemActions>
    </Item>
  )
}

export function ActivityFeedPanel({
  client = api,
  pageSize = DEFAULT_FEED_PAGE_SIZE,
}: {
  client?: ActivityFeedApi
  pageSize?: number
}) {
  const [page, setPage] = useState(0)
  const [category, setCategory] = useState<CategoryFilter>("ALL")
  const [result, setResult] = useState<Page<ActivityEntry> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    client
      .listActivity({ page, size: pageSize }, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        const lastPage = Math.max(0, data.page.totalPages - 1)
        if (page > lastPage) {
          setPage(lastPage)
          return
        }
        setResult(data)
        setError(null)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setError(
          err instanceof Error
            ? err.message
            : "Impossible de charger le journal d'activité pour le moment.",
        )
        setResult(null)
        setLoading(false)
      })

    return () => controller.abort()
  }, [client, page, pageSize, reloadToken])

  function handleChangePage(nextPage: number) {
    setLoading(true)
    setError(null)
    setPage(nextPage)
  }

  function handleRefresh() {
    setLoading(true)
    setError(null)
    setReloadToken((n) => n + 1)
  }

  const allItems = result?.items ?? []
  const filteredItems =
    category === "ALL" ? allItems : allItems.filter((item) => item.category === category)

  return (
    <Card aria-labelledby="activite-entreprise-titre">
      <CardHeader className="border-b">
        <CardTitle>
          <h2 id="activite-entreprise-titre">Activité récente</h2>
        </CardTitle>
        <CardDescription>
          Suivez les opérations sur les documents accessibles, les changements de droits et la vie de
          votre espace d&apos;entreprise.
        </CardDescription>

        <CardAction>
          <Cluster gap="sm">
            {result && (
              <Badge variant="outline">
                {result.page.totalElements} opération{result.page.totalElements > 1 ? "s" : ""}
              </Badge>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={handleRefresh}
            >
              <RefreshCw className={loading ? "animate-spin" : undefined} aria-hidden="true" />
              Actualiser
            </Button>
          </Cluster>
        </CardAction>
      </CardHeader>

      <CardContent>
        <Stack gap="md">
          <Tabs
            value={category}
            onValueChange={(value) => setCategory(value as CategoryFilter)}
            className="gap-4"
          >
            <div className="border-b">
              <TabsList
                variant="line"
                aria-label="Filtrer par catégorie d'activité"
                className="h-auto w-full flex-wrap justify-start gap-x-4 gap-y-1 p-0 pb-1 [&>[data-slot=tabs-trigger]]:flex-none [&>[data-slot=tabs-trigger]]:px-1"
              >
                <TabsTrigger value="ALL">Toutes les opérations</TabsTrigger>
                <TabsTrigger value="DOCUMENT">Fichiers &amp; dossiers</TabsTrigger>
                <TabsTrigger value="RIGHTS">Droits &amp; partage</TabsTrigger>
                <TabsTrigger value="ADMINISTRATION">Comptes &amp; départements</TabsTrigger>
              </TabsList>
            </div>
          </Tabs>

          {error && (
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                <span>{error}</span>
                <Button type="button" variant="outline" size="sm" onClick={handleRefresh}>
                  Réessayer
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            <Stack gap="sm" role="status" aria-label="Chargement de l'activité">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </Stack>
          ) : !error && allItems.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyIcon>
                  <Activity aria-hidden="true" />
                </EmptyIcon>
                <EmptyTitle>Aucune activité enregistrée</EmptyTitle>
                <EmptyDescription>
                  Les créations de dossiers, imports de fichiers et modifications de permissions
                  apparaîtront ici au fil du travail de l&apos;équipe.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : !error && filteredItems.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyIcon>
                  <Activity aria-hidden="true" />
                </EmptyIcon>
                <EmptyTitle>Aucune opération dans cette catégorie sur cette page</EmptyTitle>
                <EmptyDescription>
                  Changez de filtre ou parcourez les autres pages pour consulter l&apos;ensemble du
                  journal.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyActions>
                <Button type="button" variant="outline" size="sm" onClick={() => setCategory("ALL")}>
                  Afficher toutes les catégories
                </Button>
              </EmptyActions>
            </Empty>
          ) : (
            !error && (
              <ItemGroup aria-label="Liste des opérations récentes">
                {filteredItems.map((entry, index) => (
                  <Fragment key={entry.id}>
                    {index > 0 && <ItemSeparator />}
                    <ActivityEntryRow entry={entry} />
                  </Fragment>
                ))}
              </ItemGroup>
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
              type="button"
              variant="outline"
              size="sm"
              disabled={result.page.first || loading}
              onClick={() => handleChangePage(page - 1)}
            >
              <ChevronLeft aria-hidden="true" />
              Précédente
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={result.page.last || loading}
              onClick={() => handleChangePage(page + 1)}
            >
              Suivante
              <ChevronRight aria-hidden="true" />
            </Button>
          </Cluster>
        </CardFooter>
      )}
    </Card>
  )
}

export function NodeActivitySection({
  nodeId,
  client = api,
  pageSize = DEFAULT_NODE_PAGE_SIZE,
  defaultOpen = false,
}: {
  nodeId: number
  client?: NodeActivityApi
  pageSize?: number
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [page, setPage] = useState(0)
  const [result, setResult] = useState<Page<ActivityEntry> | null>(null)
  const [loading, setLoading] = useState(defaultOpen)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const listNodeActivity = client.listNodeActivity

  useEffect(() => {
    if (!open || !listNodeActivity) return
    const controller = new AbortController()

    listNodeActivity(nodeId, { page, size: pageSize }, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        const lastPage = Math.max(0, data.page.totalPages - 1)
        if (page > lastPage) {
          setPage(lastPage)
          return
        }
        setResult(data)
        setError(null)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setError(
          err instanceof ApiError && err.status === 404
            ? "L'historique de cet élément n'est plus accessible."
            : err instanceof Error
              ? err.message
              : "Impossible de charger l'historique de cet élément.",
        )
        setResult(null)
        setLoading(false)
      })

    return () => controller.abort()
  }, [listNodeActivity, nodeId, open, page, pageSize, reloadToken])

  if (!listNodeActivity) return null

  function handleToggle() {
    if (!open && !result && !error) {
      setLoading(true)
    }
    setOpen((prev) => !prev)
  }

  function handleChangePage(nextPage: number) {
    setLoading(true)
    setError(null)
    setPage(nextPage)
  }

  function handleRetry() {
    setLoading(true)
    setError(null)
    setReloadToken((n) => n + 1)
  }

  const contentId = `node-activity-${nodeId}`

  return (
    <Card className="py-4">
      <CardHeader className={open ? "border-b" : undefined}>
        <CardTitle className="text-sm">
          <h3 className="inline-flex items-center gap-2">
            <History className="size-4 text-muted-foreground" aria-hidden="true" />
            Historique d&apos;activité
          </h3>
        </CardTitle>
        <CardAction>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={open}
            aria-controls={contentId}
            onClick={handleToggle}
          >
            {open ? "Masquer l'historique" : "Afficher l'historique"}
          </Button>
        </CardAction>
      </CardHeader>

      {open && (
        <CardContent id={contentId}>
          <Stack gap="sm">
            {error && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                  <span>{error}</span>
                  <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
                    Réessayer
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {loading ? (
              <Stack gap="xs" role="status" aria-label="Chargement de l'historique du document">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </Stack>
            ) : !error && result && result.items.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">
                Aucune opération journalisée sur cet élément pour le moment.
              </p>
            ) : (
              !error &&
              result && (
                <>
                  <ItemGroup aria-label="Historique des opérations sur cet élément">
                    {result.items.map((entry, index) => (
                      <Fragment key={entry.id}>
                        {index > 0 && <ItemSeparator />}
                        <ActivityEntryRow entry={entry} compact />
                      </Fragment>
                    ))}
                  </ItemGroup>

                  {result.page.totalPages > 1 && (
                    <Cluster justify="between" className="border-t pt-3 text-xs text-muted-foreground">
                      <span>
                        Page {result.page.page + 1} / {result.page.totalPages}
                      </span>
                      <Cluster gap="xs">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={result.page.first || loading}
                          onClick={() => handleChangePage(page - 1)}
                        >
                          Précédente
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={result.page.last || loading}
                          onClick={() => handleChangePage(page + 1)}
                        >
                          Suivante
                        </Button>
                      </Cluster>
                    </Cluster>
                  )}
                </>
              )
            )}
          </Stack>
        </CardContent>
      )}
    </Card>
  )
}
