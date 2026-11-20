import { ChevronLeft, ChevronRight, FileText, Folder, FolderOpen, Search, SearchX, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination"
import { cn } from "@/lib/utils"
import { fileSize, type WorkspaceEntry } from "@/data/workspace"

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
  const { entries, selectedId, folderName, canGoBack, query, favoritesOnly, page, pageCount, total, dirtyIds, onSearch, onToggleFavorites, onPage, onOpen, onBack } = props
  function navigate(event: React.MouseEvent<HTMLAnchorElement>, target: number) {
    event.preventDefault()
    if (target >= 1 && target <= pageCount) onPage(target)
  }
  return (
    <section aria-label="Explorateur de fichiers" className="flex h-full min-w-0 flex-col bg-background">
      <div className="space-y-4 border-b px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {canGoBack ? <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Dossier parent"><ChevronLeft /></Button> : <FolderOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
            <h2 className="truncate text-sm font-semibold">{folderName}</h2>
          </div>
          <Button variant={favoritesOnly ? "secondary" : "ghost"} size="icon-sm" onClick={onToggleFavorites} aria-label="Afficher les favoris" aria-pressed={favoritesOnly} title="Afficher les favoris"><Star className={cn("size-4", favoritesOnly && "fill-amber-400 text-amber-600")} /></Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" aria-hidden="true" />
          <Input aria-label="Rechercher dans le dossier" placeholder="Rechercher un fichier…" value={query} onChange={event => onSearch(event.target.value)} className="pl-9" />
        </div>
      </div>
      <div className="flex items-center justify-between border-b px-5 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase"><span>Nom</span><span>Type / taille</span></div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {entries.length === 0 ? <div className="flex h-full min-h-36 flex-col items-center justify-center gap-2 px-4 text-center"><SearchX className="size-7 text-muted-foreground" aria-hidden="true" /><p className="text-sm font-medium">Aucun élément</p><p className="text-xs text-muted-foreground">{query ? "Essayez un autre nom de fichier." : favoritesOnly ? "Aucun favori dans ce dossier." : "Ce dossier est vide."}</p></div> : <ul className="space-y-1">
          {entries.map(entry => <li key={entry.id}>
            <button type="button" onClick={() => onOpen(entry)} aria-current={entry.id === selectedId ? "true" : undefined} aria-label={`${entry.kind === "folder" ? "Ouvrir le dossier" : "Ouvrir le fichier"} ${entry.name}`} className={cn("group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-accent", selectedId === entry.id && "bg-accent ring-1 ring-border")}>
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background", entry.kind === "folder" ? "border-amber-200 bg-amber-50 text-amber-600" : "text-muted-foreground")}>
                {entry.kind === "folder" ? <Folder className="size-4" aria-hidden="true" /> : <FileText className="size-4" aria-hidden="true" />}
              </span>
              <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5"><span className="truncate text-sm font-medium">{entry.name}</span>{entry.favorite && <Star className="size-3 shrink-0 fill-amber-400 text-amber-500" aria-label="Favori" />}{dirtyIds.has(entry.id) && <span className="size-1.5 shrink-0 rounded-full bg-blue-500" aria-label="Modifications non enregistrées" />}</span><span className="mt-0.5 block text-xs text-muted-foreground">{entry.kind === "folder" ? "Dossier partagé" : new Date(entry.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span></span>
              <span className="shrink-0 text-xs text-muted-foreground">{entry.kind === "folder" ? <ChevronRight className="size-4" aria-hidden="true" /> : fileSize(entry.content)}</span>
            </button>
          </li>)}
        </ul>}
      </div>
      <div className="space-y-2 border-t px-3 py-3">
        <p className="text-center text-xs text-muted-foreground" aria-live="polite">{total ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} sur ${total} éléments` : "0 élément"}</p>
        <Pagination aria-label="Pagination des fichiers">
          <PaginationContent>
            <PaginationItem><PaginationLink href="#" aria-label="Page précédente" aria-disabled={page === 1} tabIndex={page === 1 ? -1 : 0} className={cn(page === 1 && "pointer-events-none opacity-40")} onClick={event => navigate(event, page - 1)}><ChevronLeft className="size-4" /></PaginationLink></PaginationItem>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map(number => <PaginationItem key={number}><PaginationLink href="#" aria-label={`Page ${number}`} isActive={number === page} onClick={event => navigate(event, number)}>{number}</PaginationLink></PaginationItem>)}
            <PaginationItem><PaginationLink href="#" aria-label="Page suivante" aria-disabled={page === pageCount} tabIndex={page === pageCount ? -1 : 0} className={cn(page === pageCount && "pointer-events-none opacity-40")} onClick={event => navigate(event, page + 1)}><ChevronRight className="size-4" /></PaginationLink></PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </section>
  )
}
