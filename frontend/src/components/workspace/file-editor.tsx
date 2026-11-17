import { FileCode2, LockKeyhole } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { fileSize, type WorkspaceEntry } from "@/data/workspace"

type Props = { file: WorkspaceEntry; editing: boolean; value: string; dirty: boolean; onChange: (value: string) => void; onSave: () => void }

export function FileEditor({ file, editing, value, dirty, onChange, onSave }: Props) {
  const extension = file.name.split(".").pop()?.toUpperCase()
  return (
    <section aria-label="Éditeur du fichier" className="flex h-full min-w-0 flex-col bg-background">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-5 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm"><FileCode2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="truncate">{file.name}</span>{dirty && <span className="size-2 shrink-0 rounded-full bg-blue-500" aria-label="Brouillon non enregistré" />}</div>
        <Badge variant="secondary">{editing ? "Édition" : "Aperçu"}</Badge>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {editing ? <Textarea aria-label={`Contenu de ${file.name}`} value={value} onChange={event => onChange(event.target.value)} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === "s") { event.preventDefault(); onSave() } }} spellCheck={false} className="h-full min-h-full resize-none rounded-none border-0 p-6 font-mono text-sm leading-7 shadow-none [field-sizing:fixed] focus-visible:ring-inset" /> : <pre aria-label={`Aperçu de ${file.name}`} className="min-h-full p-6 font-mono text-sm leading-7 break-words whitespace-pre-wrap">{value || "Ce fichier est vide."}</pre>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3 text-xs text-muted-foreground">
        <span>{value.split("\n").length} lignes · {fileSize(value)} · {extension}</span>
        <span className="flex items-center gap-1.5">{editing ? dirty ? "Modifications non enregistrées" : "Aucune modification" : <><LockKeyhole className="size-3" aria-hidden="true" />Lecture seule</>}</span>
      </div>
    </section>
  )
}
