import { Fragment, useEffect, useState } from "react"
import { AlertCircle, FolderOpen } from "lucide-react"
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
import { Stack } from "@/components/ui/layout"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api, type Api } from "@/lib/api"
import { cn, formatFileSize } from "@/lib/utils"
import type {
  BreadcrumbItem as NodeBreadcrumbItem,
  DocumentNode,
  NodeDetail,
  PageMeta,
} from "@/types/api"
import { DocumentDetails } from "./document-details"
import { FileExplorer, PAGE_SIZE } from "./file-explorer"
import { WorkspacePanels } from "./workspace-panels"

type BrowseRequest = { path: NodeBreadcrumbItem[]; page: number }
type Listing = { items: DocumentNode[]; page?: PageMeta }

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
  const [browse, setBrowse] = useState<BrowseRequest>({ path: [], page: 0 })
  const [selection, setSelection] = useState<NodeBreadcrumbItem | null>(null)
  const [listing, setListing] = useState<Result<BrowseRequest, Listing>>()
  const [detail, setDetail] = useState<Result<NodeBreadcrumbItem, NodeDetail>>()

  const folder = browse.path.at(-1)
  const currentListing = listing?.request === browse ? listing : undefined
  const pagination = listing?.request.path === browse.path ? listing.data?.page : undefined
  const currentDetail = detail?.request === selection ? detail : undefined
  const detailData = currentDetail?.data

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const request = folder
      ? client.listFolderChildren(folder.id, { page: browse.page, size: PAGE_SIZE }, signal)
      : client.listRootFolders(signal).then((items) => ({ items }))

    void request
      .then((data) => {
        if (!signal.aborted) setListing({ request: browse, data })
      })
      .catch((error: Error) => {
        if (!signal.aborted) setListing({ request: browse, error: error.message })
      })
    return () => controller.abort()
  }, [client, browse, folder])

  useEffect(() => {
    if (!selection) return
    const controller = new AbortController()
    const { signal } = controller

    void client
      .getNode(selection.id, signal)
      .then((data) => {
        if (!signal.aborted) setDetail({ request: selection, data })
      })
      .catch((error: Error) => {
        if (!signal.aborted) setDetail({ request: selection, error: error.message })
      })
    return () => controller.abort()
  }, [client, selection])

  function openFolder(path: NodeBreadcrumbItem[]) {
    setBrowse({ path, page: 0 })
    setSelection(path.at(-1) ?? null)
  }

  const currentPath = detailData?.path ?? browse.path
  const breadcrumb = detailData ? [...currentPath, detailData.node] : currentPath
  const folderPath =
    detailData && detailData.node.id === folder?.id ? breadcrumb : browse.path
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
            {breadcrumb.length > 0 ? (
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
            selectedId={selection?.id}
            folderName={folder?.name ?? "Dossiers de département"}
            pagination={pagination}
            loading={!currentListing}
            error={currentListing?.error}
            emptyMessage={
              folder ? "Ce dossier est vide." : "Aucun dossier de département accessible."
            }
            sizeLabel={(node) => formatFileSize(node.size)}
            onOpen={(node) => {
              if (node.kind === "folder") openFolder([...folderPath, node])
              else setSelection(node)
            }}
            onPage={(page) => setBrowse((current) => ({ ...current, page }))}
            onBack={folder ? () => openFolder(folderPath.slice(0, -1)) : undefined}
            onRetry={() => setBrowse((current) => ({ ...current }))}
          />
        }
        details={
          <section aria-label="Détails du document" className="h-full bg-card">
            <ScrollArea className="h-full p-5">
              {detailData ? (
                <DocumentDetails node={detailData.node} />
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
                      onClick={() => selection && setSelection({ ...selection })}
                    >
                      Recharger les détails
                    </Button>
                  </div>
                </Stack>
              ) : selection ? (
                <p role="status" className="text-sm text-muted-foreground">
                  Chargement des détails…
                </p>
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
    </Wrapper>
  )
}
