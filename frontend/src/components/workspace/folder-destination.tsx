import { useEffect, useState } from "react"
import { Folder } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { Api } from "@/lib/api"
import type { DocumentNode, PageMeta } from "@/types/api"

export function FolderDestination({
  client,
  source,
  target,
  onTarget,
}: {
  client: Api
  source: DocumentNode
  target: DocumentNode | undefined
  onTarget: (folder?: DocumentNode) => void
}) {
  const [location, setLocation] = useState<{ path: DocumentNode[]; page: number }>({ path: [], page: 0 })
  const [result, setResult] = useState<{
    location: typeof location
    items?: DocumentNode[]
    page?: PageMeta
    error?: string
  }>()

  const current = result?.location === location ? result : undefined
  const folder = location.path.at(-1)
  const available = folder?.permissions.createChild
    && folder.id !== source.parentId
    && folder.minAccessLevel <= source.minAccessLevel

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const request = folder
      ? client.listFolderChildren(folder.id, { page: location.page }, signal)
      : client.listRootFolders(signal).then(items => ({ items, page: undefined }))

    void request.then(({ items, page }) => {
      if (signal.aborted) return
      // Hiding the source also keeps its descendants out of the picker.
      const folders = items.filter(item => item.kind === "folder" && item.id !== source.id)
      setResult({ location, items: folders, page })
    }).catch((err: Error) => {
      if (!signal.aborted) setResult({ location, error: err.message })
    })
    return () => controller.abort()
  }, [client, folder, location, source.id])

  function navigate(path: DocumentNode[]) {
    onTarget(undefined)
    setLocation({ path, page: 0 })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 break-all font-medium">{folder?.name ?? "Départements"}</p>
        {folder && (
          <Button type="button" size="sm" variant="outline" onClick={() => navigate(location.path.slice(0, -1))}>
            Dossier parent
          </Button>
        )}
      </div>

      {!current ? (
        <div className="space-y-1">
          <p role="status" className="sr-only">Chargement des dossiers…</p>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : current.error ? (
        <>
          <Alert variant="destructive"><AlertDescription>{current.error}</AlertDescription></Alert>
          <Button type="button" size="sm" variant="outline" onClick={() => setLocation({ ...location })}>
            Réessayer
          </Button>
        </>
      ) : (
        <ul aria-label="Dossiers de destination" className="max-h-48 space-y-1 overflow-y-auto">
          {current.items?.length === 0 && <li className="text-sm text-muted-foreground">Aucun dossier ici.</li>}
          {current.items?.map(item => (
            <li key={item.id}>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start"
                onClick={() => navigate([...location.path, item])}
              >
                <Folder aria-hidden="true" />
                <span className="truncate">{item.name}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      {current?.page && current.page.totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={current.page.first}
            onClick={() => setLocation({ ...location, page: location.page - 1 })}
          >
            Précédents
          </Button>
          <span className="text-sm">{location.page + 1} / {current.page.totalPages}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={current.page.last}
            onClick={() => setLocation({ ...location, page: location.page + 1 })}
          >
            Suivants
          </Button>
        </div>
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!available}
        aria-pressed={target?.id === folder?.id && !!target}
        onClick={() => onTarget(folder)}
      >
        {target ? "Destination sélectionnée" : "Choisir ce dossier"}
      </Button>
    </div>
  )
}
