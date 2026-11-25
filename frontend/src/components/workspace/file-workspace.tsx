import { useEffect, useState } from "react"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api, type Api } from "@/lib/api"
import { formatFileSize } from "@/lib/utils"
import type { BreadcrumbItem, DocumentNode, NodeDetail, PageMeta } from "@/types/api"
import { DocumentDetails } from "./document-details"
import { FileExplorer, PAGE_SIZE } from "./file-explorer"
import { WorkspacePanels } from "./workspace-panels"

type BrowseRequest = { path: BreadcrumbItem[]; page: number }
type Listing = { items: DocumentNode[]; page?: PageMeta }

type Result<Q, T> = { request: Q } & (
  { data: T; error?: never } | { data?: never; error: string }
)

export function FileWorkspace({ embedded = false, client = api }: { embedded?: boolean; client?: Api }) {
  const [browse, setBrowse] = useState<BrowseRequest>({ path: [], page: 0 })
  const [selection, setSelection] = useState<BreadcrumbItem | null>(null)
  const [listing, setListing] = useState<Result<BrowseRequest, Listing>>()
  const [detail, setDetail] = useState<Result<BreadcrumbItem, NodeDetail>>()

  const folder = browse.path.at(-1)
  // Only show results for the current request, even before effect cleanup.
  const currentListing = listing?.request === browse ? listing : undefined
  // Keep the controls mounted while another page in the folder loads.
  const pagination = listing?.request.path === browse.path ? listing.data?.page : undefined
  const currentDetail = detail?.request === selection ? detail : undefined
  const detailData = currentDetail?.data

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const request = folder
      ? client.listFolderChildren(folder.id, { page: browse.page, size: PAGE_SIZE }, signal)
      : client.listRootFolders(signal).then(items => ({ items }))

    void request.then(data => {
      if (!signal.aborted) setListing({ request: browse, data })
    }).catch((error: Error) => {
      if (!signal.aborted) setListing({ request: browse, error: error.message })
    })
    return () => controller.abort()
  }, [client, browse, folder])

  useEffect(() => {
    if (!selection) return
    const controller = new AbortController()
    const { signal } = controller

    void client.getNode(selection.id, signal).then(data => {
      if (!signal.aborted) setDetail({ request: selection, data })
    }).catch((error: Error) => {
      if (!signal.aborted) setDetail({ request: selection, error: error.message })
    })
    return () => controller.abort()
  }, [client, selection])

  function openFolder(path: BreadcrumbItem[]) {
    setBrowse({ path, page: 0 })
    setSelection(path.at(-1) ?? null)
  }

  const currentPath = detailData?.path ?? browse.path
  const breadcrumb = detailData ? [...currentPath, detailData.node] : currentPath
  const folderPath = detailData && detailData.node.id === folder?.id
    ? breadcrumb
    : browse.path
  const Wrapper = embedded ? "div" : "main"

  return (
    <Wrapper
      id={embedded ? undefined : "contenu"}
      tabIndex={embedded ? undefined : -1}
      className={embedded ? "w-full" : "mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9"}
    >
      <h1 className="mb-5 text-2xl font-semibold tracking-tight sm:text-3xl">Espace de travail</h1>
      <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
        <nav aria-label="Fil d'Ariane" className="border-b px-4 py-3 text-sm">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              {breadcrumb.length > 0 ? (
                <button type="button" className="cursor-pointer text-primary hover:underline" onClick={() => openFolder([])}>
                  Départements
                </button>
              ) : <span aria-current="page">Départements</span>}
            </li>
            {breadcrumb.map((item, index) => (
              <li key={item.id} className="flex min-w-0 items-center gap-2">
                <ChevronRight className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                {index === breadcrumb.length - 1 ? (
                  <span aria-current="page" className="break-all font-medium">{item.name}</span>
                ) : (
                  <button
                    type="button"
                    className="cursor-pointer break-all text-primary hover:underline"
                    onClick={() => openFolder(breadcrumb.slice(0, index + 1))}
                  >
                    {item.name}
                  </button>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <WorkspacePanels
          explorer={
            <FileExplorer
              entries={currentListing?.data?.items ?? []}
              selectedId={selection?.id}
              folderName={folder?.name ?? "Dossiers de département"}
              pagination={pagination}
              loading={!currentListing}
              error={currentListing?.error}
              emptyMessage={folder ? "Ce dossier est vide." : "Aucun dossier de département accessible."}
              sizeLabel={node => formatFileSize(node.size)}
              onOpen={node => {
                if (node.kind === "folder") openFolder([...folderPath, node])
                else setSelection(node)
              }}
              onPage={page => setBrowse(current => ({ ...current, page }))}
              onBack={folder ? () => openFolder(folderPath.slice(0, -1)) : undefined}
              onRetry={() => setBrowse(current => ({ ...current }))}
            />
          }
          details={
            <section aria-label="Détails du document" className="h-full overflow-y-auto p-5">
              {detailData ? (
                <DocumentDetails node={detailData.node} />
              ) : currentDetail?.error ? (
                <div className="space-y-2">
                  <p role="alert" className="text-sm text-destructive">{currentDetail.error}</p>
                  <Button variant="outline" size="sm" onClick={() => selection && setSelection({ ...selection })}>
                    Recharger les détails
                  </Button>
                </div>
              ) : (
                <p role={selection ? "status" : undefined} className="text-sm text-muted-foreground">
                  {selection ? "Chargement des détails…" : "Sélectionnez un dossier ou un fichier."}
                </p>
              )}
            </section>
          }
        />
      </div>
    </Wrapper>
  )
}
