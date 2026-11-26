import { useEffect, useRef, useState, type DragEvent } from "react"
import { Upload } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Api } from "@/lib/api"

type Props = {
  folderId: number
  client: Api
  onImported: () => void
}

export function FileImport({ folderId, client, onImported }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const upload = useRef<AbortController>(null)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string>()
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string>()

  useEffect(() => () => upload.current?.abort(), [])

  async function importFile(files: FileList | null) {
    if (!files?.length || upload.current) return
    if (files.length > 1) {
      setError("Importez un fichier à la fois.")
      return
    }

    const file = files[0]
    if (!file.size) {
      setError("Le fichier est vide.")
      return
    }

    const controller = new AbortController()
    upload.current = controller
    setError(undefined)
    setProgress(null)
    setFileName(file.name)

    try {
      await client.uploadFile(folderId, file, setProgress, controller.signal)
      if (!controller.signal.aborted) {
        onImported()
        toast.success("Fichier importé", { description: file.name })
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : "Impossible d'importer le fichier.")
      }
    } finally {
      upload.current = null
      if (!controller.signal.aborted) setFileName(undefined)
    }
  }

  function drop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    void importFile(event.dataTransfer.files)
  }

  return (
    <div
      className={cn("space-y-2 rounded-md border border-dashed p-2", dragging && "border-primary bg-accent")}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return
        event.preventDefault()
        setDragging(!fileName)
      }}
      onDragLeave={(event) => {
        const next = event.relatedTarget
        if (!(next instanceof Node) || !event.currentTarget.contains(next)) setDragging(false)
      }}
      onDrop={drop}
    >
      <input
        ref={input}
        type="file"
        hidden
        aria-label="Choisir un fichier"
        onChange={(event) => {
          void importFile(event.currentTarget.files)
          event.currentTarget.value = ""
        }}
      />
      <Button type="button" size="sm" variant="outline" disabled={!!fileName} onClick={() => input.current?.click()}>
        <Upload aria-hidden="true" />
        Importer un fichier
      </Button>
      {fileName ? (
        <div className="space-y-1">
          <p role="status" className="break-all text-xs text-muted-foreground">
            {progress === 100 ? "Traitement sur le serveur" : "Import en cours"} · {fileName}
          </p>
          <progress aria-label="Progression de l'import" max={100} value={progress ?? undefined} className="w-full" />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Ou glissez un fichier ici.</p>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
