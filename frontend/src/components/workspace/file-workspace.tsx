import { useEffect, useMemo, useState } from "react"
import {
  FileText,
  MoreVertical,
  Pencil,
  Save,
  Share2,
  Star,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Cluster, IconTile, Stack } from "@/components/ui/layout"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Separator } from "@/components/ui/separator"
import { initialEntries, type WorkspaceEntry } from "@/data/workspace"
import type { Api } from "@/lib/api"
import { paginate } from "@/lib/pagination"
import { cn } from "@/lib/utils"
import { ContributorAvatars } from "./contributor-avatars"
import { FileEditor } from "./file-editor"
import { FileExplorer, PAGE_SIZE } from "./file-explorer"
import { SharingPanel } from "./sharing-panel"

export function FileWorkspace({ embedded = false, client }: { embedded?: boolean; client?: Api }) {
  const [entries, setEntries] = useState(initialEntries)
  const [selectedId, setSelectedId] = useState("guide")
  const [folderId, setFolderId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(false)
  const [sharingOpen, setSharingOpen] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [desktop, setDesktop] = useState(() => window.matchMedia("(min-width: 768px)").matches)

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)")
    const update = () => setDesktop(media.matches)
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  const { byId, byParent } = useMemo(() => {
    const byId = new Map<string, WorkspaceEntry>()
    const byParent = new Map<string | null, WorkspaceEntry[]>()
    for (const entry of entries) {
      byId.set(entry.id, entry)
      const siblings = byParent.get(entry.parentId)
      if (siblings) siblings.push(entry)
      else byParent.set(entry.parentId, [entry])
    }
    return { byId, byParent }
  }, [entries])

  const selected = byId.get(selectedId)!
  const folder = folderId === null ? undefined : byId.get(folderId)
  const value = drafts[selectedId] ?? selected.content
  const dirty = value !== selected.content
  const dirtyIds = new Set(Object.keys(drafts).filter((id) => drafts[id] !== byId.get(id)?.content))
  const filtered = useMemo(() => {
    const search = query.toLocaleLowerCase("fr")
    return (byParent.get(folderId) ?? [])
      .filter(
        (entry) =>
          entry.name.toLocaleLowerCase("fr").includes(search) && (!favoritesOnly || entry.favorite),
      )
      .sort(
        (a, b) =>
          Number(b.kind === "folder") - Number(a.kind === "folder") ||
          Number(b.favorite) - Number(a.favorite) ||
          a.name.localeCompare(b.name, "fr"),
      )
  }, [byParent, folderId, query, favoritesOnly])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const listing = paginate(filtered, currentPage - 1, PAGE_SIZE)

  function selectFolder(id: string | null) {
    setFolderId(id)
    setQuery("")
    setPage(1)
    setFavoritesOnly(false)
  }

  function open(entry: WorkspaceEntry) {
    if (entry.kind === "folder") {
      selectFolder(entry.id)
      return
    }
    setSelectedId(entry.id)
    setEditing(drafts[entry.id] !== undefined)
    toast.success("Fichier ouvert avec succès", { description: entry.name })
  }

  function save() {
    if (!dirty) return
    setEntries((current) =>
      current.map((entry) =>
        entry.id === selectedId
          ? {
              ...entry,
              content: value,
              updatedAt: new Date().toISOString(),
              contributors: ["antonin", ...entry.contributors.filter((id) => id !== "antonin")],
            }
          : entry,
      ),
    )
    clearDraft()
    toast.success("Fichier enregistré avec succès", { description: selected.name })
  }

  function clearDraft() {
    setDrafts((current) => {
      const next = { ...current }
      delete next[selectedId]
      return next
    })
    setEditing(false)
  }

  function toggleFavorite() {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === selectedId ? { ...entry, favorite: !entry.favorite } : entry,
      ),
    )
  }

  const Wrapper = embedded ? "div" : "main"

  return (
    <Wrapper
      id={embedded ? undefined : "contenu"}
      tabIndex={embedded ? undefined : -1}
      className={cn(
        "flex w-full flex-1 flex-col overflow-hidden bg-card",
        embedded ? "h-full min-h-[720px]" : "min-h-svh",
      )}
    >
      {/* Barre d'actions documentaire plein écran (sans en-tête ni annotations parasites) */}
      <Cluster justify="between" gap="lg" className="shrink-0 border-b px-4 py-3 sm:px-5">
        <Cluster gap="md" wrap={false} className="min-w-0">
          <IconTile tone="brand" size="sm">
            <FileText aria-hidden="true" />
          </IconTile>
          <Stack gap="xs" className="min-w-0">
            <p className="truncate text-sm font-semibold">{selected.name}</p>
            <p className="text-xs text-muted-foreground">
              {dirty ? "Brouillon en cours" : "Document ouvert"}
            </p>
          </Stack>
        </Cluster>

        <Cluster gap="md">
          <ContributorAvatars ids={selected.contributors} />
          <Separator orientation="vertical" className="hidden h-6 sm:block" />
          <Cluster gap="xs">
            <Button
              variant={sharingOpen ? "secondary" : "outline"}
              size="sm"
              aria-expanded={sharingOpen}
              onClick={() => setSharingOpen((prev) => !prev)}
            >
              <Share2 aria-hidden="true" />
              Partager
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={selected.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              aria-pressed={selected.favorite}
              title={selected.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              onClick={toggleFavorite}
            >
              <Star
                className={cn(selected.favorite && "fill-warning text-warning")}
                aria-hidden="true"
              />
            </Button>
            {editing ? (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Annuler les modifications"
                  title="Annuler les modifications"
                  onClick={clearDraft}
                >
                  <X aria-hidden="true" />
                </Button>
                <Button size="sm" onClick={save} disabled={!dirty}>
                  <Save aria-hidden="true" />
                  Enregistrer
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil aria-hidden="true" />
                Modifier
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Options du document"
                >
                  <MoreVertical aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSharingOpen((prev) => !prev)}>
                  <Share2 aria-hidden="true" />
                  Gérer le partage (seuil M)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleFavorite}>
                  <Star aria-hidden="true" />
                  {selected.favorite ? "Retirer des favoris" : "Épingler en favori"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setEditing((prev) => !prev)}>
                  <Pencil aria-hidden="true" />
                  {editing ? "Quitter le mode édition" : "Basculer en édition"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Cluster>
        </Cluster>
      </Cluster>

      {sharingOpen && (
        <SharingPanel
          nodeId={selected.id}
          nodeName={selected.name}
          client={client}
          onClose={() => setSharingOpen(false)}
        />
      )}

      <ResizablePanelGroup
        key={desktop ? "desktop" : "mobile"}
        orientation={desktop ? "horizontal" : "vertical"}
        className={
          desktop
            ? "min-h-0 flex-1 h-[calc(100svh-7.25rem)]!"
            : "min-h-0 flex-1 h-[980px]!"
        }
      >
        <ResizablePanel
          id="explorer"
          defaultSize={desktop ? "28%" : "45%"}
          minSize={desktop ? "20%" : "35%"}
          maxSize={desktop ? "45%" : "55%"}
        >
          <FileExplorer
            entries={listing.items}
            selectedId={selectedId}
            folderName={folder?.name ?? "Tous les fichiers"}
            canGoBack={folderId !== null}
            query={query}
            favoritesOnly={favoritesOnly}
            page={currentPage}
            pageCount={pageCount}
            total={listing.page.totalElements}
            dirtyIds={dirtyIds}
            onSearch={(next) => {
              setQuery(next)
              setPage(1)
            }}
            onToggleFavorites={() => {
              setFavoritesOnly(!favoritesOnly)
              setPage(1)
            }}
            onPage={setPage}
            onOpen={open}
            onBack={() => selectFolder(folder?.parentId ?? null)}
          />
        </ResizablePanel>
        <ResizableHandle withHandle aria-label="Redimensionner les panneaux" />
        <ResizablePanel id="editor" defaultSize={desktop ? "72%" : "55%"} minSize="45%">
          <FileEditor
            file={selected}
            editing={editing}
            value={value}
            dirty={dirty}
            onChange={(next) => setDrafts((current) => ({ ...current, [selectedId]: next }))}
            onSave={save}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* État accessible aux lecteurs d'écran uniquement (zéro encombrement visuel) */}
      <span className="sr-only" aria-live="polite">
        {dirtyIds.size
          ? `${dirtyIds.size} brouillon${dirtyIds.size > 1 ? "s" : ""} conservé${dirtyIds.size > 1 ? "s" : ""} pendant cette session`
          : "Vos documents sont prêts à être consultés"}
      </span>
    </Wrapper>
  )
}
