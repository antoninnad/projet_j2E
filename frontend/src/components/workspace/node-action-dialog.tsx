import { useRef, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import type { Api } from "@/lib/api"
import { ApiError } from "@/lib/api-client"
import type { DocumentNode } from "@/types/api"
import { FolderDestination } from "./folder-destination"

const LABELS = {
  create: ["Nouveau dossier", "Créer", "Dossier créé"],
  rename: ["Renommer le dossier", "Renommer", "Dossier renommé"],
} as const

export type NodeAction = {
  kind: keyof typeof LABELS | "move" | "delete"
  node: DocumentNode
}

export function NodeActionDialog({
  action,
  client,
  onClose,
  onDone,
}: {
  action: NodeAction
  client: Api
  onClose: (refresh?: boolean) => void
  onDone: (updated?: DocumentNode) => void
}) {
  const { kind, node } = action
  const file = node.kind === "file"
  const noun = file ? "fichier" : "dossier"
  const labels = {
    ...LABELS,
    move: [`Déplacer le ${noun}`, "Déplacer", `Le ${noun} a été déplacé.`],
    delete: [`Supprimer le ${noun}`, "Supprimer", `Le ${noun} a été supprimé.`],
  }
  const [title, submitLabel, success] = labels[kind]
  const [name, setName] = useState(kind === "rename" ? node.name : "")
  const [target, setTarget] = useState<DocumentNode>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [conflict, setConflict] = useState(false)
  const [trigger] = useState(() => document.activeElement)
  const pending = useRef(false)
  const editName = kind === "create" || kind === "rename"
  const trimmed = name.trim()
  const canSubmit = (!editName || !!trimmed) && (kind !== "move" || !!target)
  const descriptions = {
    create: `Dans « ${node.name} ».`,
    rename: `Nom actuel : ${node.name}.`,
    move: `Choisissez la destination du ${noun} « ${node.name} ».`,
    delete: file
      ? `Le fichier « ${node.name} » sera supprimé définitivement.`
      : `Le dossier « ${node.name} » et tout son contenu seront supprimés.`,
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending.current || !canSubmit) return
    pending.current = true
    setBusy(true)
    setError(undefined)
    setConflict(false)

    try {
      let updated: DocumentNode | undefined
      if (kind === "create") updated = await client.createFolder(node.id, trimmed)
      else if (kind === "rename") updated = await client.renameFolder(node.id, trimmed, node.version)
      else if (kind === "delete" && file) await client.deleteFile(node.id, node.version)
      else if (kind === "delete") await client.deleteFolder(node.id, node.version)
      else if (target) updated = await client.moveNode(node.id, target.id, node.version)

      toast.success(success)
      onDone(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'opération a échoué.")
      setConflict(err instanceof ApiError && err.status === 409)
    } finally {
      setBusy(false)
      pending.current = false
    }
  }

  return (
    <Dialog open onOpenChange={(open) => {
      if (!open && !pending.current) onClose(conflict)
    }}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        onCloseAutoFocus={(event) => {
          if (trigger instanceof HTMLElement && trigger.isConnected) {
            event.preventDefault()
            trigger.focus()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{descriptions[kind]}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={busy} className="space-y-2">
            {editName && (
              <>
                <Label htmlFor="folder-name">Nom du dossier</Label>
                <Input
                  id="folder-name"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  maxLength={255}
                  required
                />
              </>
            )}
            {kind === "move" && <FolderDestination client={client} source={node} target={target} onTarget={setTarget} />}
          </fieldset>

          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onClose(conflict)}
              autoFocus={kind === "delete"}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant={kind === "delete" ? "destructive" : "default"}
              disabled={busy || !canSubmit}
            >
              {busy ? <><Spinner aria-hidden="true" /> En cours…</> : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
