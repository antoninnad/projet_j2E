import { useEffect, useState } from "react"
import { Download } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Cluster } from "@/components/ui/layout"
import { Skeleton } from "@/components/ui/skeleton"
import type { Api } from "@/lib/api"
import { ApiError } from "@/lib/api-client"
import type { DocumentNode } from "@/types/api"

const IMAGE_TYPES = new Set([
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp", "image/avif",
])

type Preview =
  | { type: "text"; text: string }
  | { type: "image" | "pdf"; url: string }
  | { type: "download" }
  | { type: "error"; message: string }

export function FilePreview({
  file,
  client,
}: {
  file: DocumentNode
  client: Pick<Api, "getFileContent" | "fileDownloadUrl">
}) {
  const [preview, setPreview] = useState<Preview>()
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    let objectUrl: string | undefined

    async function load() {
      try {
        const response = await client.getFileContent(file.id, signal)
        const contentType = response.headers.get("Content-Type") ?? ""
        const mime = contentType.split(";", 1)[0].trim().toLowerCase()
        const disposition = response.headers.get("Content-Disposition")?.split(";", 1)[0]

        // The preview endpoint decides which content can be shown inline.
        if (disposition?.trim().toLowerCase() === "attachment" ||
          (mime !== "text/plain" && mime !== "application/pdf" && !IMAGE_TYPES.has(mime))) {
          void response.body?.cancel().catch(() => {})
          if (!signal.aborted) setPreview({ type: "download" })
          return
        }

        if (mime === "text/plain") {
          const charset = /;\s*charset\s*=\s*"?([^";\s]+)/i.exec(contentType)?.[1]
          const bytes = await response.arrayBuffer()
          if (!signal.aborted) setPreview({ type: "text", text: new TextDecoder(charset).decode(bytes) })
          return
        }

        const blob = await response.blob()
        if (signal.aborted) return
        objectUrl = URL.createObjectURL(blob)
        setPreview({ type: mime === "application/pdf" ? "pdf" : "image", url: objectUrl })
      } catch (err) {
        if (!signal.aborted) {
          setPreview({
            type: "error",
            message: err instanceof ApiError ? err.message : "Impossible d'afficher l'aperçu.",
          })
        }
      }
    }

    void load()
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [client, file.id, file.version, attempt])

  return (
    <Card className="py-4">
      <CardHeader>
        <Cluster justify="between">
          <CardTitle className="text-sm"><h3>Aperçu du fichier</h3></CardTitle>
          <Button asChild variant="outline" size="sm">
            <a href={client.fileDownloadUrl(file.id)} download>
              <Download aria-hidden="true" />
              Télécharger
            </a>
          </Button>
        </Cluster>
      </CardHeader>
      <CardContent>
        {!preview ? (
          <>
            <p role="status" className="sr-only">Chargement de l'aperçu…</p>
            <Skeleton className="h-24 w-full" />
          </>
        ) : preview.type === "error" ? (
          <div className="space-y-2">
            <Alert variant="destructive"><AlertDescription>{preview.message}</AlertDescription></Alert>
            <Button variant="outline" size="sm" type="button" onClick={() => {
              setPreview(undefined)
              setAttempt(current => current + 1)
            }}>
              Recharger l'aperçu
            </Button>
          </div>
        ) : preview.type === "text" ? (
          <pre className="max-h-96 overflow-auto rounded-md border bg-muted/40 p-3 text-sm break-words whitespace-pre-wrap">
            {preview.text || "Le fichier est vide."}
          </pre>
        ) : preview.type === "image" ? (
          <img
            src={preview.url}
            alt={file.name}
            className="mx-auto max-h-[60vh] max-w-full rounded-md object-contain"
            onError={() => setPreview({ type: "error", message: "Impossible d'afficher cette image." })}
          />
        ) : preview.type === "pdf" ? (
          <iframe
            src={preview.url}
            title={`Aperçu PDF de ${file.name}`}
            className="h-[60vh] min-h-72 w-full rounded-md border"
          />
        ) : (
          <p className="text-sm text-muted-foreground">Téléchargez le fichier pour l'ouvrir.</p>
        )}
      </CardContent>
    </Card>
  )
}
