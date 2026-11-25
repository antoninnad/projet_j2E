import { FileText, Folder } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatFileSize } from "@/lib/utils"
import type { DocumentNode, NodePermissions } from "@/types/api"

const ACTIONS: Record<keyof NodePermissions, string> = {
  view: "Consulter",
  modify: "Modifier",
  delete: "Supprimer",
  manage: "Gérer le partage",
  createChild: "Créer dans ce dossier",
}

export function DocumentDetails({ node }: { node: DocumentNode }) {
  const { owner, permissions } = node
  const file = node.kind === "file"
  const Icon = file ? FileText : Folder
  const metadata = [
    ["Département", node.departmentName],
    ["Propriétaire", [owner.firstName, owner.lastName].filter(Boolean).join(" ")],
    ["Dernière mise à jour", new Intl.DateTimeFormat("fr-FR").format(new Date(node.updatedAt ?? node.createdAt))],
    ...(file ? [["Type", node.contentType], ["Taille", formatFileSize(node.size)]] : []),
  ]

  return (
    <div className="space-y-5">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <h2 className="break-all text-lg font-semibold">{node.name}</h2>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        {metadata.filter(([, value]) => value).map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="break-all text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Actions autorisées</h3>
        <ul aria-label="Actions autorisées" className="flex flex-wrap gap-2">
          {(Object.keys(ACTIONS) as (keyof NodePermissions)[]).filter(action => permissions[action]).map(action => (
            <li key={action}><Badge variant="secondary">{ACTIONS[action]}</Badge></li>
          ))}
        </ul>
      </div>
    </div>
  )
}
