import { FileText, Folder } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Cluster, IconTile, Stack } from "@/components/ui/layout"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import type { Api } from "@/lib/api"
import { formatFileSize } from "@/lib/utils"
import type { DocumentNode, NodePermissions } from "@/types/api"
import { FilePreview, type FileEditing } from "./file-preview"
import type { NodeAction } from "./node-action-dialog"

const ACTIONS: Record<keyof NodePermissions, string> = {
  view: "Consulter",
  modify: "Modifier",
  delete: "Supprimer",
  manage: "Gérer le partage",
  createChild: "Créer dans ce dossier",
}

export function DocumentDetails({ node, client, editing, onNodeAction }: {
  node: DocumentNode
  client: Api
  editing: FileEditing
  onNodeAction: (kind: NodeAction["kind"]) => void
}) {
  const { owner, permissions } = node
  const file = node.kind === "file"
  const Icon = file ? FileText : Folder
  const metadata = [
    ["Département", node.departmentName],
    ["Propriétaire", [owner.firstName, owner.lastName].filter(Boolean).join(" ")],
    [
      "Dernière mise à jour",
      new Intl.DateTimeFormat("fr-FR").format(new Date(node.updatedAt ?? node.createdAt)),
    ],
    ...(file
      ? [
          ["Type", node.contentType],
          ["Taille", formatFileSize(node.size)],
        ]
      : []),
  ]

  return (
    <Stack gap="lg">
      <Cluster gap="md" wrap={false}>
        <IconTile tone={file ? "file" : "folder"}>
          <Icon aria-hidden="true" />
        </IconTile>
        <h2 className="break-all text-lg font-semibold">{node.name}</h2>
      </Cluster>

      <Table>
        <TableBody>
          {metadata
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <TableRow key={label}>
                <TableCell className="w-44 text-xs text-muted-foreground">{label}</TableCell>
                <TableCell className="break-all text-sm font-medium">{value}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      {file && permissions.view && (
        <FilePreview
          key={`${node.id}:${node.version}`}
          file={node}
          client={client}
          editing={permissions.modify ? editing : undefined}
        />
      )}

      {(file ? permissions.delete : node.parentId != null && (permissions.modify || permissions.delete)) && (
        <Cluster gap="sm">
          {!file && permissions.modify && (
            <Button type="button" size="sm" variant="outline" onClick={() => onNodeAction("rename")}>
              Renommer le dossier
            </Button>
          )}
          {permissions.delete && (
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => onNodeAction("move")}>
                Déplacer le {file ? "fichier" : "dossier"}
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={() => onNodeAction("delete")}>
                Supprimer le {file ? "fichier" : "dossier"}
              </Button>
            </>
          )}
        </Cluster>
      )}

      <Card className="py-4">
        <CardHeader>
          <CardTitle className="text-sm">
            <h3>Actions autorisées</h3>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul aria-label="Actions autorisées" className="flex flex-wrap gap-2">
            {(Object.keys(ACTIONS) as (keyof NodePermissions)[])
              .filter((action) => permissions[action])
              .map((action) => (
                <li key={action}>
                  <Badge variant={action === "manage" ? "brand" : "secondary"}>
                    {ACTIONS[action]}
                  </Badge>
                </li>
              ))}
          </ul>
        </CardContent>
      </Card>
    </Stack>
  )
}
