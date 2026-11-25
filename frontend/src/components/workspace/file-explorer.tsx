import { ChevronLeft, ChevronRight, FileText, Folder, FolderOpen, SearchX, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyIcon, EmptyTitle } from "@/components/ui/empty"
import { SearchInput } from "@/components/ui/input"
import { Cluster, IconTile, Stack } from "@/components/ui/layout"
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination"
import { ScrollArea } from "@/components/ui/scroll-area"
import { fileSize, type WorkspaceEntry } from "@/data/workspace"
import { cn } from "@/lib/utils"

export const PAGE_SIZE = 6

type Props = {
  entries: WorkspaceEntry[]
  selectedId: string
  folderName: string
  canGoBack: boolean
  query: string
  favoritesOnly: boolean
  page: number
  pageCount: number
  total: number
  dirtyIds: ReadonlySet<string>
  onSearch: (query: string) => void
  onToggleFavorites: () => void
  onPage: (page: number) => void
  onOpen: (entry: WorkspaceEntry) => void
  onBack: () => void
}

export function FileExplorer(props: Props) {
  const {
    entries,
    selectedId,
    folderName,
    canGoBack,
    query,
    favoritesOnly,
    page,
    pageCount,
    total,
    dirtyIds,
    onSearch,
    onToggleFavorites,
    onPage,
    onOpen,
    onBack,
  } = props

  function navigate(event: React.MouseEvent<HTMLAnchorElement>, target: number) {
    event.preventDefault()
    if (target >= 1 && target <= pageCount) onPage(target)
  }

  return (
    <section aria-label="Explorateur de fichiers" className="flex h-full min-w-0 flex-col bg-card">
      <Stack gap="sm" className="border-b p-4">
        <Cluster justify="between" wrap={false}>
          <Cluster gap="sm" wrap={false} className="min-w-0">
            {canGoBack ? (
              <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Dossier parent">
                <ChevronLeft aria-hidden="true" />
              </Button>
            ) : (
              <FolderOpen className="size-4 shrink-0 text-primary" aria-hidden="true" />
            )}
            <h2 className="truncate text-sm font-semibold">{folderName}</h2>
          </Cluster>

          <Button
            variant={favoritesOnly ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={onToggleFavorites}
            aria-label="Afficher les favoris"
            aria-pressed={favoritesOnly}
            title="Afficher les favoris"
          >
            <Star className={cn(favoritesOnly && "fill-warning text-warning")} aria-hidden="true" />
          </Button>
        </Cluster>

        <SearchInput
          aria-label="Rechercher dans le dossier"
          placeholder="Rechercher un fichier…"
          value={query}
          onChange={(event) => onSearch(event.target.value)}
        />
      </Stack>

      <Cluster
        justify="between"
        className="border-b px-5 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
      >
        <span>Nom</span>
        <span>Type / taille</span>
      </Cluster>

      <ScrollArea className="min-h-0 flex-1 p-2">
        {entries.length === 0 ? (
          <Empty className="my-4">
            <EmptyIcon>
              <SearchX aria-hidden="true" />
            </EmptyIcon>
            <EmptyTitle>Aucun élément</EmptyTitle>
            <EmptyDescription>
              {query
                ? "Essayez un autre nom de fichier."
                : favoritesOnly
                  ? "Aucun favori dans ce dossier."
                  : "Ce dossier est vide."}
            </EmptyDescription>
          </Empty>
        ) : (
          <Stack gap="xs">
            {entries.map((entry) => {
              const selected = entry.id === selectedId
              return (
                <Button
                  key={entry.id}
                  type="button"
                  variant="ghost"
                  onClick={() => onOpen(entry)}
                  aria-current={selected ? "true" : undefined}
                  aria-label={`${entry.kind === "folder" ? "Ouvrir le dossier" : "Ouvrir le fichier"} ${entry.name}`}
                  className={cn(
                    "h-auto w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-left font-normal",
                    selected && "bg-primary-subtle/80 ring-1 ring-primary/25",
                  )}
                >
                  <IconTile tone={entry.kind === "folder" ? "folder" : "file"} size="sm">
                    {entry.kind === "folder" ? (
                      <Folder aria-hidden="true" />
                    ) : (
                      <FileText aria-hidden="true" />
                    )}
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
                      {dirtyIds.has(entry.id) && (
                        <span
                          className="size-1.5 shrink-0 rounded-full bg-info"
                          aria-label="Modifications non enregistrées"
                        />
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {entry.kind === "folder"
                        ? "Dossier partagé"
                        : new Date(entry.updatedAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                    </span>
                  </span>

                  <span className="shrink-0 text-xs text-muted-foreground">
                    {entry.kind === "folder" ? (
                      <ChevronRight className="size-4" aria-hidden="true" />
                    ) : (
                      fileSize(entry.content)
                    )}
                  </span>
                </Button>
              )
            })}
          </Stack>
        )}
      </ScrollArea>

      <Stack gap="xs" className="border-t p-3">
        <p className="text-center text-xs text-muted-foreground" aria-live="polite">
          {total
            ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} sur ${total} éléments`
            : "0 élément"}
        </p>
        <Pagination aria-label="Pagination des fichiers">
          <PaginationContent>
            <PaginationItem>
              <PaginationLink
                href="#"
                aria-label="Page précédente"
                aria-disabled={page === 1}
                tabIndex={page === 1 ? -1 : 0}
                className={cn(page === 1 && "pointer-events-none opacity-40")}
                onClick={(event) => navigate(event, page - 1)}
              >
                <ChevronLeft className="size-4" />
              </PaginationLink>
            </PaginationItem>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((number) => (
              <PaginationItem key={number}>
                <PaginationLink
                  href="#"
                  aria-label={`Page ${number}`}
                  isActive={number === page}
                  onClick={(event) => navigate(event, number)}
                >
                  {number}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationLink
                href="#"
                aria-label="Page suivante"
                aria-disabled={page === pageCount}
                tabIndex={page === pageCount ? -1 : 0}
                className={cn(page === pageCount && "pointer-events-none opacity-40")}
                onClick={(event) => navigate(event, page + 1)}
              >
                <ChevronRight className="size-4" />
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </Stack>
    </section>
  )
}
