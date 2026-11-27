import { Fragment, useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, FolderOpen, FolderPlus } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyIcon } from "@/components/ui/empty"
import { Cluster, Stack } from "@/components/ui/layout"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { api, type Api } from "@/lib/api"
import { ApiError } from "@/lib/api-client"
import { cn, formatFileSize } from "@/lib/utils"
import type {
  BreadcrumbItem as NodeBreadcrumbItem,
  DocumentNode,
  NodeDetail,
  NodeSearchQuery,
  PageMeta,
} from "@/types/api"
import { DocumentDetails } from "./document-details"
import { FileExplorer, PAGE_SIZE } from "./file-explorer"
import { FileImport } from "./file-import"
import type { TextDraft } from "./file-preview"
import { NodeActionDialog, type NodeAction } from "./node-action-dialog"
import { WorkspacePanels } from "./workspace-panels"

type View = { mode: "browse" | "favorites" } | ({ mode: "search" } & NodeSearchQuery)
type BrowseRequest = { path: NodeBreadcrumbItem[]; page: number; view: View }
type Entry = DocumentNode & { location?: string }
type Listing = { items: Entry[]; page?: PageMeta; folder?: NodeDetail }
type Selection = NodeBreadcrumbItem & { kind: DocumentNode["kind"] }

type Result<Q, T> = { request: Q } & (
  | { data: T; error?: never }
  | { data?: never; error: string }
)

export function FileWorkspace({
  embedded = false,
  client = api,
}: {
  embedded?: boolean
  client?: Api
}) {
  const [browse, setBrowse] = useState<BrowseRequest>({ path: [], page: 0, view: { mode: "browse" } })
  const [selection, setSelection] = useState<Selection | null>(null)
  const [listing, setListing] = useState<Result<BrowseRequest, Listing>>()
  const [detail, setDetail] = useState<Result<Selection, NodeDetail>>()
  const [detailRevision, setDetailRevision] = useState(0)
  const [action, setAction] = useState<NodeAction>()
  const [drafts, setDrafts] = useState(() => new Map<number, TextDraft>())
  const [query, setQuery] = useState("")
  const [departmentRoots, setDepartmentRoots] = useState<DocumentNode[]>()
  const [favoriteBusy, setFavoriteBusy] = useState(false)
  const favoritePending = useRef(false)

  const folder = browse.path.at(-1)
  const search = browse.view.mode === "search" ? browse.view : undefined
  const searching = search !== undefined
  const favorites = browse.view.mode === "favorites"
  const browsing = browse.view.mode === "browse"
  const currentListing = listing?.request === browse ? listing : undefined
  const previousPage = listing?.request.path === browse.path && listing.request.view === browse.view
    ? listing.data
    : undefined
  const pagination = previousPage?.page
  const currentFolder = previousPage?.folder
  const currentDetail = detail?.request === selection ? detail : undefined
  const detailData = selection ? currentDetail?.data : currentFolder

  const openFolder = useCallback((path: NodeBreadcrumbItem[]) => {
    setBrowse({ path, page: 0, view: { mode: "browse" } })
    setQuery("")
    setSelection(null)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const { view, page } = browse
    const pagination = { page, size: PAGE_SIZE }

    async function loadListing(): Promise<Listing> {
      if (view.mode === "search" || view.mode === "favorites") {
        const response = view.mode === "search"
          ? await client.searchNodes({ q: view.q, kind: view.kind, departmentId: view.departmentId, ...pagination }, signal)
          : await client.listFavorites(pagination, signal)
        return {
          page: response.page,
          items: response.items.map(({ node, location }) => ({ ...node, location: location || node.departmentName })),
        }
      }

      if (!folder) {
        const items = await client.listRootFolders(signal)
        if (!signal.aborted) setDepartmentRoots(items)
        return { items }
      }

      const [children, folderDetail] = await Promise.all([
        client.listFolderChildren(folder.id, pagination, signal),
        client.getNode(folder.id, signal),
      ])
      return { ...children, folder: folderDetail }
    }

    function load() {
      void loadListing()
        .then(data => {
          if (signal.aborted) return
          const lastPage = Math.max(0, (data.page?.totalPages ?? 1) - 1)
          if (page > lastPage) {
            setBrowse(current => current === browse ? { ...browse, page: lastPage } : current)
            return
          }
          setListing({ request: browse, data })
        })
        .catch((error: Error) => {
          if (!signal.aborted) setListing({ request: browse, error: error.message })
        })
    }

    const timer = view.mode === "search" ? window.setTimeout(load, 250) : undefined
    if (timer === undefined) load()
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [client, browse, folder])

  useEffect(() => {
    if (!searching || departmentRoots) return
    const controller = new AbortController()
    const { signal } = controller
    void client.listRootFolders(signal).then(items => {
      if (!signal.aborted) setDepartmentRoots(items)
    }).catch(() => {})
    return () => controller.abort()
  }, [client, departmentRoots, searching])

  useEffect(() => {
    if (!selection) return
    const controller = new AbortController()
    const { signal } = controller

    void client
      .getNode(selection.id, signal)
      .then((data) => {
        if (signal.aborted) return
        if (selection.kind === "folder") openFolder([...data.path, data.node])
        else setDetail({ request: selection, data })
      })
      .catch((error: Error) => {
        if (!signal.aborted) setDetail({ request: selection, error: error.message })
      })
    return () => controller.abort()
  }, [client, detailRevision, openFolder, selection])

  function changeSearch(value: string) {
    const q = value.trim()
    setQuery(value)
    if (q === query.trim()) return
    setSelection(null)
    setBrowse(current => ({
      ...current,
      page: 0,
      view: q ? { ...current.view, mode: "search", q } : { mode: "browse" },
    }))
  }

  function changeSearchFilters(filters: Partial<Omit<NodeSearchQuery, "q">>) {
    setSelection(null)
    setBrowse(current => current.view.mode === "search"
      ? { ...current, page: 0, view: { ...current.view, ...filters } }
      : current)
  }

  function toggleFavorites() {
    setQuery("")
    setSelection(null)
    setBrowse(current => ({
      ...current,
      page: 0,
      view: { mode: current.view.mode === "favorites" ? "browse" : "favorites" },
    }))
  }

  function refreshListing() {
    setBrowse(current => ({ ...current }))
  }

  function setDraft(id: number, draft?: TextDraft, expected?: TextDraft) {
    setDrafts(current => {
      if (expected && current.get(id) !== expected) return current
      const next = new Map(current)
      if (draft) next.set(id, draft)
      else next.delete(id)
      return next
    })
  }

  function reloadFile() {
    setSelection(current => current ? { ...current } : null)
  }

  function fileSaved(updated: DocumentNode, savedDraft?: TextDraft) {
    if (savedDraft) setDraft(updated.id, undefined, savedDraft)
    setDetail(current => {
      if (!current?.data || current.data.node.id !== updated.id ||
        current.data.node.version > updated.version) return current
      const node = { ...updated, favorite: current.data.node.favorite }
      return { ...current, data: { ...current.data, node } }
    })
    refreshListing()
  }

  async function toggleFavorite(node: DocumentNode) {
    if (favoritePending.current) return
    favoritePending.current = true
    setFavoriteBusy(true)
    try {
      const favorite = !node.favorite
      if (favorite) await client.addFavorite(node.id)
      else await client.removeFavorite(node.id)

      setDetail(current => {
        if (!current?.data || current.data.node.id !== node.id) return current
        return { request: current.request, data: { ...current.data, node: { ...current.data.node, favorite } } }
      })
      setListing(current => {
        const folder = current?.data?.folder
        if (!current?.data || !folder || folder.node.id !== node.id) return current
        return {
          request: current.request,
          data: { ...current.data, folder: { ...folder, node: { ...folder.node, favorite } } },
        }
      })
      refreshListing()
      setDetailRevision(value => value + 1)
    } catch (error) {
      if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
        refreshListing()
        setDetailRevision(value => value + 1)
      }
      toast.error(error instanceof Error ? error.message : "Impossible de modifier les favoris.")
    } finally {
      favoritePending.current = false
      setFavoriteBusy(false)
    }
  }

  function finishAction(updated?: DocumentNode) {
    setAction(undefined)
    if (action?.node.kind === "file") {
      if (action.kind === "delete") setDraft(action.node.id)
      setSelection(null)
      refreshListing()
    } else if (action?.kind === "create") {
      refreshListing()
    } else {
      const parentPath = currentFolder?.path ?? browse.path.slice(0, -1)
      openFolder(action?.kind === "rename" && updated ? [...parentPath, updated] : parentPath)
    }
  }

  const currentPath = detailData?.path ?? (browsing ? browse.path : [])
  const breadcrumb = detailData ? [...currentPath, detailData.node] : currentPath
  const folderPath =
    currentFolder ? [...currentFolder.path, currentFolder.node] : browse.path
  const listTitle = searching ? "Résultats de recherche" : favorites ? "Mes favoris" : folder?.name ?? "Dossiers de département"
  const emptyMessage = searching ? "Aucun document ne correspond à cette recherche."
    : favorites ? "Aucun favori accessible."
    : folder ? "Ce dossier est vide." : "Aucun dossier de département accessible."
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
      <Breadcrumb aria-label="Fil d'Ariane" className="shrink-0 border-b px-4 py-3 sm:px-5">
        <BreadcrumbList className="text-sm">
          <BreadcrumbItem>
            {breadcrumb.length > 0 || !browsing ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-sm"
                onClick={() => openFolder([])}
              >
                Départements
              </Button>
            ) : (
              <BreadcrumbPage>Départements</BreadcrumbPage>
            )}
          </BreadcrumbItem>

          {breadcrumb.map((item, index) => (
            <Fragment key={item.id}>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="min-w-0">
                {index === breadcrumb.length - 1 ? (
                  <BreadcrumbPage className="break-all">{item.name}</BreadcrumbPage>
                ) : (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-sm break-all"
                    onClick={() => openFolder(breadcrumb.slice(0, index + 1))}
                  >
                    {item.name}
                  </Button>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <WorkspacePanels
        explorer={
          <FileExplorer
            entries={currentListing?.data?.items ?? []}
            selectedId={selection?.id ?? (browsing ? folder?.id : undefined)}
            folderName={listTitle}
            filters={{
              query,
              favoritesOnly: favorites,
              searchLabel: "Rechercher dans les documents",
              maxLength: 100,
              onSearch: changeSearch,
              onToggleFavorites: toggleFavorites,
            }}
            tools={search ? (
              <Cluster gap="xs">
                <NativeSelect
                  size="sm"
                  aria-label="Type de document"
                  value={search.kind ?? ""}
                  onChange={event => {
                    const { value } = event.currentTarget
                    changeSearchFilters({ kind: value === "file" || value === "folder" ? value : undefined })
                  }}
                >
                  <NativeSelectOption value="">Tous les types</NativeSelectOption>
                  <NativeSelectOption value="file">Fichiers</NativeSelectOption>
                  <NativeSelectOption value="folder">Dossiers</NativeSelectOption>
                </NativeSelect>
                <NativeSelect
                  size="sm"
                  aria-label="Département"
                  value={search.departmentId ?? ""}
                  onChange={event => changeSearchFilters({ departmentId: Number(event.target.value) || undefined })}
                >
                  <NativeSelectOption value="">Tous les départements</NativeSelectOption>
                  {departmentRoots?.map(root => (
                    <NativeSelectOption key={root.departmentId} value={root.departmentId}>
                      {root.departmentName}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Cluster>
            ) : currentFolder?.node.permissions.createChild && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAction({ kind: "create", node: currentFolder.node })}
                >
                  <FolderPlus aria-hidden="true" />
                  Nouveau dossier
                </Button>
                <FileImport
                  key={currentFolder.node.id}
                  folderId={currentFolder.node.id}
                  client={client}
                  onImported={refreshListing}
                />
              </>
            )}
            pagination={pagination}
            loading={!currentListing}
            error={currentListing?.error}
            emptyMessage={emptyMessage}
            sizeLabel={(node) => formatFileSize(node.size)}
            onOpen={(node) => {
              if (browsing && node.kind === "folder") openFolder([...folderPath, node])
              else setSelection(node)
            }}
            onPage={(page) => setBrowse((current) => ({ ...current, page }))}
            onBack={browsing && folder ? () => openFolder(folderPath.slice(0, -1)) : undefined}
            onRetry={refreshListing}
          />
        }
        details={
          <section aria-label="Détails du document" className="h-full bg-card">
            <ScrollArea className="h-full p-5">
              {detailData ? (
                <DocumentDetails
                  node={detailData.node}
                  client={client}
                  editing={{
                    draft: drafts.get(detailData.node.id),
                    onDraftChange: draft => setDraft(detailData.node.id, draft),
                    onSaved: fileSaved,
                    onReload: reloadFile,
                  }}
                  favoriteBusy={favoriteBusy}
                  onToggleFavorite={() => void toggleFavorite(detailData.node)}
                  onNodeAction={kind => setAction({ kind, node: detailData.node })}
                />
              ) : currentDetail?.error ? (
                <Stack gap="sm">
                  <Alert variant="destructive">
                    <AlertCircle aria-hidden="true" />
                    <AlertDescription>{currentDetail.error}</AlertDescription>
                  </Alert>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={reloadFile}
                    >
                      Recharger les détails
                    </Button>
                  </div>
                </Stack>
              ) : selection || (browsing && folder && !currentListing) ? (
                <Stack gap="sm">
                  <p role="status" className="sr-only">
                    Chargement des détails…
                  </p>
                  <Skeleton className="h-8 w-2/3" />
                  <Skeleton className="h-36 w-full" />
                  <Skeleton className="h-24 w-full" />
                </Stack>
              ) : (
                <Empty className="my-8">
                  <EmptyIcon>
                    <FolderOpen aria-hidden="true" />
                  </EmptyIcon>
                  <EmptyDescription>Sélectionnez un dossier ou un fichier.</EmptyDescription>
                </Empty>
              )}
            </ScrollArea>
          </section>
        }
      />
      {action && (
        <NodeActionDialog
          action={action}
          client={client}
          onClose={(refresh) => {
            setAction(undefined)
            if (refresh) {
              refreshListing()
              if (action.node.kind === "file") reloadFile()
            }
          }}
          onDone={finishAction}
        />
      )}
    </Wrapper>
  )
}
