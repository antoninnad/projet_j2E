import { useMemo, useState } from "react"
import { FileText, MoreVertical, Pencil, Save, Share2, Star, X } from "lucide-react"
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
import { Separator } from "@/components/ui/separator"
import { fileSize, initialEntries, type WorkspaceEntry } from "@/data/workspace"
import type { Api } from "@/lib/api"
import { paginate } from "@/lib/pagination"
import { cn } from "@/lib/utils"
import { ContributorAvatars } from "./contributor-avatars"
import { FileEditor } from "./file-editor"
import { FileExplorer, PAGE_SIZE } from "./file-explorer"
import { SharingPanel } from "./sharing-panel"
import { WorkspacePanels } from "./workspace-panels"

export function DemoFileWorkspace({
  embedded = false,
  client,
}: {
  embedded?: boolean
  client?: Api
}) {
  const [entries, setEntries] = useState(initialEntries)
  const [selectedId, setSelectedId] = useState("guide")
  const [folderId, setFolderId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(false)
  const [sharingOpen, setSharingOpen] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

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
  const favoriteLabel = selected.favorite ? "Retirer des favoris" : "Ajouter aux favoris"
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
      current.map((entry) => {
        if (entry.id !== selectedId) return entry
        return {
          ...entry,
          content: value,
          updatedAt: new Date().toISOString(),
          contributors: ["antonin", ...entry.contributors.filter((id) => id !== "antonin")],
        }
      }),
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

  const plural = dirtyIds.size > 1 ? "s" : ""
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
              aria-label={favoriteLabel}
              aria-pressed={selected.favorite}
              title={favoriteLabel}
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
                  {favoriteLabel}
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

      <WorkspacePanels
        explorer={
          <FileExplorer
            entries={listing.items}
            selectedId={selectedId}
            folderName={folder?.name ?? "Tous les fichiers"}
            onBack={folderId === null ? undefined : () => selectFolder(folder?.parentId ?? null)}
            filters={{
              query,
              favoritesOnly,
              onSearch: (next) => {
                setQuery(next)
                setPage(1)
              },
              onToggleFavorites: () => {
                setFavoritesOnly(!favoritesOnly)
                setPage(1)
              },
            }}
            pagination={listing.page}
            dirtyIds={dirtyIds}
            onPage={(index) => setPage(index + 1)}
            onOpen={open}
            sizeLabel={(entry) => fileSize(entry.content)}
          />
        }
        details={
          <FileEditor
            file={selected}
            editing={editing}
            value={value}
            dirty={dirty}
            onChange={(next) => setDrafts((current) => ({ ...current, [selectedId]: next }))}
            onSave={save}
          />
        }
      />

      <span className="sr-only" aria-live="polite">
        {dirtyIds.size
          ? `${dirtyIds.size} brouillon${plural} conservé${plural} pendant cette session`
          : "Vos documents sont prêts à être consultés"}
      </span>
    </Wrapper>
  )
}
