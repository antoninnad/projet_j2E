import { useEffect, useState } from "react"
import { Check, ChevronRight, FileText, FolderOpen, Pencil, Save, Star, X } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { initialEntries, type WorkspaceEntry } from "@/data/workspace"
import { cn } from "@/lib/utils"
import { ContributorAvatars } from "./contributor-avatars"
import { FileEditor } from "./file-editor"
import { FileExplorer, PAGE_SIZE } from "./file-explorer"

export function FileWorkspace({ embedded = false }: { embedded?: boolean }) {
  const [entries, setEntries] = useState(initialEntries)
  const [selectedId, setSelectedId] = useState("guide")
  const [folderId, setFolderId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [desktop, setDesktop] = useState(() => window.matchMedia("(min-width: 768px)").matches)

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)")
    const update = () => setDesktop(media.matches)
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  const selected = entries.find(entry => entry.id === selectedId)!
  const folder = entries.find(entry => entry.id === folderId)
  const value = drafts[selectedId] ?? selected.content
  const dirty = value !== selected.content
  const dirtyIds = entries.filter(entry => drafts[entry.id] !== undefined && drafts[entry.id] !== entry.content).map(entry => entry.id)
  const filtered = entries.filter(entry => entry.parentId === folderId && entry.name.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")) && (!favoritesOnly || entry.favorite)).sort((a, b) => Number(b.kind === "folder") - Number(a.kind === "folder") || Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, "fr"))
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visibleEntries = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function open(entry: WorkspaceEntry) {
    if (entry.kind === "folder") {
      setFolderId(entry.id)
      setQuery("")
      setPage(1)
      setFavoritesOnly(false)
      return
    }
    setSelectedId(entry.id)
    setEditing(drafts[entry.id] !== undefined)
    toast.success("Fichier ouvert avec succès", { description: entry.name })
  }

  function save() {
    if (!dirty) return
    setEntries(current => current.map(entry => entry.id === selectedId ? { ...entry, content: value, updatedAt: new Date().toISOString(), contributors: ["antonin", ...entry.contributors.filter(id => id !== "antonin")] } : entry))
    clearDraft()
    toast.success("Fichier enregistré avec succès", { description: selected.name })
  }

  function clearDraft() {
    setDrafts(current => { const next = { ...current }; delete next[selectedId]; return next })
    setEditing(false)
  }

  function toggleFavorite() {
    setEntries(current => current.map(entry => entry.id === selectedId ? { ...entry, favorite: !entry.favorite } : entry))
  }

  const Wrapper = embedded ? "div" : "main"

  return (
    <Wrapper
      id={embedded ? undefined : "contenu"}
      tabIndex={embedded ? undefined : -1}
      className={embedded ? "w-full" : "mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9"}
    >
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground"><FolderOpen className="size-3.5" aria-hidden="true" /><span>Entreprise</span><ChevronRight className="size-3" aria-hidden="true" /><span>Documents</span></div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Espace de travail</h1>
          <p className="mt-2 text-sm text-muted-foreground">Vos fichiers, vos idées et votre équipe, au même endroit.</p>
        </div>
        <Badge variant="outline" className="gap-1.5 bg-background py-1.5"><span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />Espace partagé</Badge>
      </div>

      <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted"><FileText className="size-5 text-muted-foreground" aria-hidden="true" /></div>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{selected.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{dirty ? "Brouillon en cours" : "Document ouvert"}</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <ContributorAvatars ids={selected.contributors} />
            <div className="hidden h-6 w-px bg-border sm:block" />
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" aria-label={selected.favorite ? "Retirer des favoris" : "Ajouter aux favoris"} aria-pressed={selected.favorite} title={selected.favorite ? "Retirer des favoris" : "Ajouter aux favoris"} onClick={toggleFavorite}><Star className={cn("size-4", selected.favorite && "fill-amber-400 text-amber-600")} /></Button>
              {editing ? <><Button variant="ghost" size="icon" aria-label="Annuler les modifications" title="Annuler les modifications" onClick={clearDraft}><X className="size-4" /></Button><Button size="sm" onClick={save} disabled={!dirty}><Save className="size-4" />Enregistrer</Button></> : <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="size-4" />Modifier</Button>}
            </div>
          </div>
        </div>

        <ResizablePanelGroup key={desktop ? "desktop" : "mobile"} orientation={desktop ? "horizontal" : "vertical"} className={desktop ? "h-[660px]!" : "h-[1080px]!"}>
          <ResizablePanel id="explorer" defaultSize={desktop ? "32%" : "45%"} minSize={desktop ? "25%" : "35%"} maxSize={desktop ? "50%" : "55%"}>
            <FileExplorer entries={visibleEntries} selectedId={selectedId} folderName={folder?.name ?? "Tous les fichiers"} canGoBack={folderId !== null} query={query} favoritesOnly={favoritesOnly} page={currentPage} pageCount={pageCount} total={filtered.length} dirtyIds={dirtyIds} onSearch={value => { setQuery(value); setPage(1) }} onToggleFavorites={() => { setFavoritesOnly(!favoritesOnly); setPage(1) }} onPage={setPage} onOpen={open} onBack={() => { setFolderId(folder?.parentId ?? null); setQuery(""); setPage(1); setFavoritesOnly(false) }} />
          </ResizablePanel>
          <ResizableHandle withHandle aria-label="Redimensionner les panneaux" />
          <ResizablePanel id="editor" defaultSize={desktop ? "68%" : "55%"} minSize="40%">
            <FileEditor file={selected} editing={editing} value={value} dirty={dirty} onChange={value => setDrafts(current => ({ ...current, [selectedId]: value }))} onSave={save} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><Check className="size-3.5" aria-hidden="true" />{dirtyIds.length ? `${dirtyIds.length} brouillon${dirtyIds.length > 1 ? "s" : ""} conservé${dirtyIds.length > 1 ? "s" : ""} pendant cette session` : "Vos documents sont prêts à être consultés"}</span><span>Glissez la séparation pour ajuster votre espace</span></div>
    </Wrapper>
  )
}
