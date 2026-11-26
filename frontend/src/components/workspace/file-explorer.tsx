import type { ReactNode } from "react"
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  SearchX,
  Star,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyIcon } from "@/components/ui/empty"
import { SearchInput } from "@/components/ui/input"
import { Cluster, IconTile, Stack } from "@/components/ui/layout"
import { Pagination } from "@/components/ui/pagination"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { PageMeta } from "@/types/api"

export const PAGE_SIZE = 6

type Entry = {
  id: string | number
  name: string
  kind: "folder" | "file"
  updatedAt?: string | null
  favorite?: boolean
}

type Props<T extends Entry> = {
  entries: T[]
  selectedId?: T["id"]
  folderName: string
  tools?: ReactNode
  filters?: {
    query: string
    favoritesOnly: boolean
    onSearch: (query: string) => void
    onToggleFavorites: () => void
  }
  pagination?: PageMeta
  dirtyIds?: ReadonlySet<T["id"]>
  loading?: boolean
  error?: string
  emptyMessage?: string
  sizeLabel: (entry: T) => string
  onPage: (page: number) => void
  onOpen: (entry: T) => void
  onBack?: () => void
  onRetry?: () => void
}

export function FileExplorer<T extends Entry>({
  entries,
  selectedId,
  folderName,
  tools,
  filters,
  pagination,
  dirtyIds,
  loading,
  error,
  emptyMessage = "Ce dossier est vide.",
  sizeLabel,
  onPage,
  onOpen,
  onBack,
  onRetry,
}: Props<T>) {
  const empty = filters?.query
    ? "Essayez un autre nom de fichier."
    : filters?.favoritesOnly
      ? "Aucun favori dans ce dossier."
      : emptyMessage

  function changePage(offset: number) {
    if (!pagination || loading) return
    const target = pagination.page + offset
    if (target >= 0 && target < pagination.totalPages) onPage(target)
  }

  return (
    <section aria-label="Explorateur de fichiers" className="flex h-full min-w-0 flex-col bg-card">
      <Stack gap="sm" className="border-b p-4">
        <Cluster justify="between" wrap={false}>
          <Cluster gap="sm" wrap={false} className="min-w-0">
            {onBack ? (
              <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Dossier parent">
                <ChevronLeft aria-hidden="true" />
              </Button>
            ) : (
              <FolderOpen className="size-4 shrink-0 text-primary" aria-hidden="true" />
            )}
            <h2 className="truncate text-sm font-semibold">{folderName}</h2>
          </Cluster>

          {filters && (
            <Button
              variant={filters.favoritesOnly ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label="Afficher les favoris"
              aria-pressed={filters.favoritesOnly}
              onClick={filters.onToggleFavorites}
            >
              <Star
                className={cn(filters.favoritesOnly && "fill-warning text-warning")}
                aria-hidden="true"
              />
            </Button>
          )}
        </Cluster>

        {filters && (
          <SearchInput
            aria-label="Rechercher dans le dossier"
            placeholder="Rechercher un fichier…"
            value={filters.query}
            onChange={(event) => filters.onSearch(event.target.value)}
          />
        )}
        {tools}
      </Stack>

      <Cluster
        justify="between"
        className="border-b px-5 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
      >
        <span>Nom</span>
        <span>Type / taille</span>
      </Cluster>

      <ScrollArea className="min-h-0 flex-1 p-2">
        {loading ? (
          <Stack gap="sm" className="p-2">
            <p role="status" className="sr-only">
              Chargement des documents…
            </p>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </Stack>
        ) : error ? (
          <Stack gap="sm" className="p-2">
            <Alert variant="destructive">
              <AlertCircle aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Réessayer
              </Button>
            )}
          </Stack>
        ) : entries.length === 0 ? (
          <Empty className="my-4">
            <EmptyIcon>
              <SearchX aria-hidden="true" />
            </EmptyIcon>
            <EmptyDescription>{empty}</EmptyDescription>
          </Empty>
        ) : (
          <Stack gap="xs">
            {entries.map((entry) => {
              const folder = entry.kind === "folder"
              const selected = entry.id === selectedId
              const Icon = folder ? Folder : FileText
              return (
                <Button
                  key={entry.id}
                  type="button"
                  variant="ghost"
                  onClick={() => onOpen(entry)}
                  aria-current={selected ? "true" : undefined}
                  aria-label={(folder ? "Ouvrir le dossier " : "Ouvrir le fichier ") + entry.name}
                  className={cn(
                    "h-auto w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-left font-normal",
                    selected && "bg-primary-subtle/80 ring-1 ring-primary/25",
                  )}
                >
                  <IconTile tone={folder ? "folder" : "file"} size="sm">
                    <Icon aria-hidden="true" />
                  </IconTile>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-foreground">
                        {entry.name}
                      </span>
                      {entry.favorite && (
                        <Star
                          className="size-3 shrink-0 fill-warning text-warning"
                          aria-label="Favori"
                        />
                      )}
                      {dirtyIds?.has(entry.id) && (
                        <span
                          className="size-1.5 shrink-0 rounded-full bg-info"
                          aria-label="Modifications non enregistrées"
                        />
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {folder
                        ? "Dossier"
                        : entry.updatedAt &&
                          new Date(entry.updatedAt).toLocaleDateString("fr-FR")}
                    </span>
                  </span>

                  <span className="shrink-0 text-xs text-muted-foreground">
                    {folder ? (
                      <ChevronRight className="size-4" aria-hidden="true" />
                    ) : (
                      sizeLabel(entry)
                    )}
                  </span>
                </Button>
              )
            })}
          </Stack>
        )}
      </ScrollArea>

      {pagination && (
        <Pagination
          aria-label="Pagination des fichiers"
          className="items-center gap-3 border-t px-3 py-2.5"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Page précédente"
            aria-disabled={loading || pagination.first}
            className="aria-disabled:opacity-50"
            onClick={() => changePage(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="text-center text-xs text-muted-foreground" aria-live="polite">
            {pagination.totalPages > 0
              ? `${pagination.page + 1} / ${pagination.totalPages} · ${pagination.totalElements} éléments`
              : "0 élément"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Page suivante"
            aria-disabled={loading || pagination.last}
            className="aria-disabled:opacity-50"
            onClick={() => changePage(1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </Pagination>
      )}
    </section>
  )
}
