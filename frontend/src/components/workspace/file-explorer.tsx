import { ChevronLeft, ChevronRight, FileText, Folder, FolderOpen, Search, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pagination } from "@/components/ui/pagination"
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
  entries, selectedId, folderName, filters, pagination, dirtyIds, loading, error,
  emptyMessage = "Ce dossier est vide.", sizeLabel, onPage, onOpen, onBack, onRetry,
}: Props<T>) {
  const empty = filters?.query ? "Essayez un autre nom de fichier."
    : filters?.favoritesOnly ? "Aucun favori dans ce dossier." : emptyMessage

  function changePage(offset: number) {
    if (!pagination || loading) return
    const target = pagination.page + offset
    if (target >= 0 && target < pagination.totalPages) onPage(target)
  }

  return (
    <section aria-label="Explorateur de fichiers" className="flex h-full min-w-0 flex-col bg-background">
      <div className="space-y-4 border-b px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {onBack ? (
              <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Dossier parent">
                <ChevronLeft aria-hidden="true" />
              </Button>
            ) : <FolderOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
            <h2 className="truncate text-sm font-semibold">{folderName}</h2>
          </div>
          {filters && (
            <Button
              variant={filters.favoritesOnly ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label="Afficher les favoris"
              aria-pressed={filters.favoritesOnly}
              onClick={filters.onToggleFavorites}
            >
              <Star className={cn("size-4", filters.favoritesOnly && "fill-amber-400 text-amber-600")} aria-hidden="true" />
            </Button>
          )}
        </div>
        {filters && (
          <div className="relative">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" aria-hidden="true" />
            <Input
              aria-label="Rechercher dans le dossier"
              placeholder="Rechercher un fichier…"
              value={filters.query}
              onChange={event => filters.onSearch(event.target.value)}
              className="pl-9"
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-b px-5 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        <span>Nom</span><span>Type / taille</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <p role="status" className="p-4 text-sm text-muted-foreground">Chargement des documents…</p>
        ) : error ? (
          <div className="space-y-2 p-4">
            <p role="alert" className="text-sm text-destructive">{error}</p>
            {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Réessayer</Button>}
          </div>
        ) : entries.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="space-y-1">
            {entries.map(entry => {
              const folder = entry.kind === "folder"
              const Icon = folder ? Folder : FileText
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(entry)}
                    aria-current={entry.id === selectedId ? "true" : undefined}
                    aria-label={(folder ? "Ouvrir le dossier " : "Ouvrir le fichier ") + entry.name}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-accent",
                      entry.id === selectedId && "bg-accent ring-1 ring-border",
                    )}
                  >
                    <span className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground",
                      folder && "border-amber-200 bg-amber-50 text-amber-600",
                    )}>
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">{entry.name}</span>
                        {entry.favorite && <Star className="size-3 shrink-0 fill-amber-400 text-amber-500" aria-label="Favori" />}
                        {dirtyIds?.has(entry.id) && (
                          <span className="size-1.5 shrink-0 rounded-full bg-blue-500" aria-label="Modifications non enregistrées" />
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {folder ? "Dossier" : entry.updatedAt && new Date(entry.updatedAt).toLocaleDateString("fr-FR")}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {folder ? <ChevronRight className="size-4" aria-hidden="true" /> : sizeLabel(entry)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {pagination && (
        <Pagination aria-label="Pagination des fichiers" className="items-center gap-3 border-t px-3 py-2">
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
              ? (pagination.page + 1) + " / " + pagination.totalPages + " · " + pagination.totalElements + " éléments"
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
