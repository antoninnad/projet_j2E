import { useEffect, useRef, useState } from "react"
import { Download } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Cluster } from "@/components/ui/layout"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import type { Api } from "@/lib/api"
import { ApiError } from "@/lib/api-client"
import type { DocumentNode } from "@/types/api"

const IMAGE_TYPES = new Set([
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp", "image/avif",
])

type Preview =
  | { type: "text"; text: string; version: number }
  | { type: "image" | "pdf"; url: string }
  | { type: "download" }
  | { type: "error"; message: string }

export type TextDraft = { text: string; version: number }

export type FileEditing = {
  draft?: TextDraft
  onDraftChange: (draft?: TextDraft) => void
  onSaved: (updated: DocumentNode, savedDraft?: TextDraft) => void
  onReload: () => void
}

const textClass = "max-h-96 overflow-auto rounded-md border bg-muted/40 p-3 text-sm break-words whitespace-pre-wrap"

export function FilePreview({
  file,
  client,
  editing,
}: {
  file: DocumentNode
  client: Pick<Api, "getFileContent" | "fileDownloadUrl" | "saveFileText" | "replaceFile">
  editing?: FileEditing
}) {
  const [preview, setPreview] = useState<Preview>()
  const [attempt, setAttempt] = useState(0)
  const [writeError, setWriteError] = useState<{ message: string; conflict: boolean }>()
  const [busy, setBusy] = useState(false)
  const [replacement, setReplacement] = useState<File>()
  const pending = useRef(false)
  const input = useRef<HTMLInputElement>(null)

  const draft = editing?.draft
  const text = preview?.type === "text" ? preview : undefined
  const outdated = !!(draft && text && draft.version !== text.version)
  const canSave = draft && text && !outdated && !writeError?.conflict && draft.text !== text.text

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
          // Match the version to the downloaded text, not an earlier metadata request.
          const etag = response.headers.get("ETag")?.match(/^"(\d+)-(\d+)"$/)
          const version = etag && Number(etag[1]) === file.id ? Number(etag[2]) : file.version
          const bytes = await response.arrayBuffer()
          if (!signal.aborted) {
            setPreview({ type: "text", text: new TextDecoder(charset).decode(bytes), version })
          }
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

  async function write(operation: () => Promise<DocumentNode>, savedDraft?: TextDraft) {
    if (!editing || pending.current || writeError?.conflict) return
    pending.current = true
    setBusy(true)
    setWriteError(undefined)
    try {
      const updated = await operation()
      editing.onSaved(updated, savedDraft)
      setReplacement(undefined)
      toast.success(savedDraft ? "Fichier enregistré" : "Fichier remplacé")
    } catch (error) {
      setWriteError({
        message: error instanceof Error ? error.message : "Impossible de modifier le fichier.",
        conflict: error instanceof ApiError && error.status === 409,
      })
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  function save() {
    if (canSave) void write(() => client.saveFileText(file.id, draft.text, draft.version), draft)
  }

  return (
    <Card className="py-4">
      <CardHeader>
        <Cluster justify="between">
          <CardTitle className="text-sm"><h3>Aperçu du fichier</h3></CardTitle>
          <Cluster gap="xs">
            {editing && text && !draft && (
              <Button
                type="button"
                size="sm"
                onClick={() => editing.onDraftChange({ text: text.text, version: text.version })}
              >
                Modifier le texte
              </Button>
            )}
            {editing && preview && !text && !draft && !replacement && (
              <>
                <input
                  ref={input}
                  type="file"
                  hidden
                  aria-label="Fichier de remplacement"
                  onChange={event => setReplacement(event.currentTarget.files?.[0])}
                />
                <Button type="button" size="sm" variant="outline" onClick={() => input.current?.click()}>
                  Remplacer le fichier
                </Button>
              </>
            )}
            <Button asChild variant="outline" size="sm">
              <a href={client.fileDownloadUrl(file.id)} download>
                <Download aria-hidden="true" />
                Télécharger
              </a>
            </Button>
          </Cluster>
        </Cluster>
      </CardHeader>
      <CardContent className="space-y-3">
        {writeError && (
          <Alert variant="destructive"><AlertDescription>{writeError.message}</AlertDescription></Alert>
        )}
        {writeError?.conflict && (
          <Button type="button" size="sm" variant="outline" onClick={editing?.onReload}>
            Recharger la version récente
          </Button>
        )}
        {editing && draft && (
          <>
            <Textarea
              aria-label={`Brouillon de ${file.name}`}
              value={draft.text}
              readOnly={busy}
              spellCheck={false}
              className="min-h-44 font-mono"
              onChange={event => editing.onDraftChange({ ...draft, text: event.target.value })}
              onKeyDown={event => {
                if ((event.ctrlKey || event.metaKey) && event.key === "s") {
                  event.preventDefault()
                  save()
                }
              }}
            />
            {outdated && text && (
              <div className="space-y-2">
                <p role="status" className="text-sm">
                  Votre brouillon est conservé. Comparez-le avec la dernière version du serveur.
                </p>
                <pre aria-label="Dernière version du serveur" className={textClass}>
                  {text.text || "Le fichier est vide."}
                </pre>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setWriteError(undefined)
                    editing.onDraftChange({ ...draft, version: text.version })
                  }}
                >
                  Reprendre avec cette version
                </Button>
              </div>
            )}
            {preview && preview.type !== "error" && !text && (
              <p className="text-sm">La version actuelle ne peut pas être éditée en texte.</p>
            )}
            <Cluster gap="xs">
              <Button type="button" size="sm" disabled={busy || !canSave} onClick={save}>
                {busy ? "Enregistrement…" : "Enregistrer"}
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => {
                setWriteError(undefined)
                editing.onDraftChange(undefined)
              }}>
                Annuler le brouillon
              </Button>
            </Cluster>
          </>
        )}
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
        ) : draft ? null : preview.type === "text" ? (
          <pre className={textClass}>{preview.text || "Le fichier est vide."}</pre>
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
        {replacement && (
          <div className="space-y-2">
            <p className="break-all text-sm">Nouveau fichier · {replacement.name}</p>
            <Cluster gap="xs">
              <Button
                type="button"
                size="sm"
                disabled={busy || writeError?.conflict}
                onClick={() => void write(() => client.replaceFile(file.id, replacement, file.version))}
              >
                {busy ? "Remplacement…" : "Confirmer le remplacement"}
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => {
                setReplacement(undefined)
                setWriteError(undefined)
              }}>
                Annuler le remplacement
              </Button>
            </Cluster>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
