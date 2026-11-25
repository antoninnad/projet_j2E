import { FileCode2, LockKeyhole } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Cluster } from "@/components/ui/layout"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { fileSize, type WorkspaceEntry } from "@/data/workspace"

type Props = {
  file: WorkspaceEntry
  editing: boolean
  value: string
  dirty: boolean
  onChange: (value: string) => void
  onSave: () => void
}

export function FileEditor({ file, editing, value, dirty, onChange, onSave }: Props) {
  const extension = file.name.split(".").pop()?.toUpperCase()

  return (
    <section aria-label="Éditeur du fichier" className="flex h-full min-w-0 flex-col bg-card">
      <Cluster justify="between" className="border-b bg-muted/35 px-5 py-3">
        <Cluster gap="sm" wrap={false} className="min-w-0 text-sm">
          <FileCode2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate font-medium">{file.name}</span>
          {dirty && (
            <span
              className="size-2 shrink-0 rounded-full bg-info"
              aria-label="Brouillon non enregistré"
            />
          )}
        </Cluster>
        <Badge variant={editing ? "brand" : "secondary"}>{editing ? "Édition" : "Aperçu"}</Badge>
      </Cluster>

      <ScrollArea className="min-h-0 flex-1">
        {editing ? (
          <Textarea
            aria-label={`Contenu de ${file.name}`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "s") {
                event.preventDefault()
                onSave()
              }
            }}
            spellCheck={false}
            className="h-full min-h-[480px] resize-none rounded-none border-0 p-6 font-mono text-sm leading-7 shadow-none [field-sizing:fixed] focus-visible:ring-inset"
          />
        ) : (
          <pre
            aria-label={`Aperçu de ${file.name}`}
            className="min-h-full p-6 font-mono text-sm leading-7 break-words whitespace-pre-wrap"
          >
            {value || "Ce fichier est vide."}
          </pre>
        )}
      </ScrollArea>

      <Cluster justify="between" className="border-t px-5 py-3 text-xs text-muted-foreground">
        <span>
          {value.split("\n").length} lignes · {fileSize(value)} · {extension}
        </span>
        <Cluster gap="xs">
          {editing ? (
            dirty ? (
              "Modifications non enregistrées"
            ) : (
              "Aucune modification"
            )
          ) : (
            <>
              <LockKeyhole className="size-3" aria-hidden="true" />
              <span>Lecture seule</span>
            </>
          )}
        </Cluster>
      </Cluster>
    </section>
  )
}
