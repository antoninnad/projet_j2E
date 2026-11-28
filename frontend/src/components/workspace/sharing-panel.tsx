import { useEffect, useState, type FormEvent } from "react"
import { AlertCircle, Info, Lock, Plus, Shield, Trash2, UserPlus, X } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Cluster, SplitGrid, Stack } from "@/components/ui/layout"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table"
import { api, type Api } from "@/lib/api"
import { ApiError } from "@/lib/api-client"
import type { Colleague, NodeSharingInfo } from "@/types/api"

export type SharingPanelApi = Pick<
  Api,
  | "getNodeSharing"
  | "updateNodeThreshold"
  | "addNodeContributor"
  | "removeNodeContributor"
  | "listColleagues"
>

export function SharingPanel({
  nodeId,
  nodeName,
  client = api,
  onClose,
}: {
  nodeId: string
  nodeName: string
  client?: SharingPanelApi
  onClose?: () => void
}) {
  const [info, setInfo] = useState<NodeSharingInfo | null>(null)
  const [colleagues, setColleagues] = useState<Colleague[]>([])
  const [thresholdDraft, setThresholdDraft] = useState<string>("0")
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      client.getNodeSharing(nodeId, controller.signal),
      client.listColleagues({ page: 0, size: 50 }, controller.signal).catch(() => null),
    ])
      .then(([sharing, usersPage]) => {
        if (controller.signal.aborted) return
        setInfo(sharing)
        setThresholdDraft(String(sharing.minAccessLevel))
        setColleagues(usersPage?.items ?? [])
        setError(null)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setError(
          err instanceof Error
            ? err.message
            : "Impossible de charger les permissions de partage de cet élément.",
        )
        setInfo(null)
        setLoading(false)
      })

    return () => controller.abort()
  }, [client, nodeId, reloadToken])

  async function handleSaveThreshold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!info) return
    setError(null)
    const parsed = Number(thresholdDraft)
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError("Le seuil minimum M doit être un entier supérieur ou égal à 0.")
      return
    }
    setBusy(true)
    try {
      const updated = await client.updateNodeThreshold(nodeId, parsed)
      setInfo(updated)
      setThresholdDraft(String(updated.minAccessLevel))
      toast.success(`Seuil minimum mis à jour (M = ${updated.minAccessLevel})`)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Impossible de modifier le seuil minimum de cet élément.",
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleAddContributor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!info) return
    setError(null)
    const userId = Number(selectedUserId)
    if (!userId) {
      setError("Sélectionnez un collègue actif à ajouter comme contributeur.")
      return
    }
    setBusy(true)
    try {
      const updated = await client.addNodeContributor(nodeId, userId)
      setInfo(updated)
      setSelectedUserId("")
      toast.success("Contributeur ajouté")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'ajouter ce contributeur.")
    } finally {
      setBusy(false)
    }
  }

  async function handleRemoveContributor(userId: number, name: string) {
    setError(null)
    setBusy(true)
    try {
      const updated = await client.removeNodeContributor(nodeId, userId)
      setInfo(updated)
      toast.success(`${name} retiré des contributeurs`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de retirer ce contributeur.")
    } finally {
      setBusy(false)
    }
  }

  const excludedIds = new Set<number>(
    info ? [info.owner.id, ...info.contributors.map((c) => c.id)] : [],
  )
  const availableColleagues = colleagues.filter((u) => !excludedIds.has(u.id))

  return (
    <section
      aria-labelledby="panneau-partage-titre"
      className="border-b bg-primary-subtle/35 p-4 sm:px-5"
    >
      <Stack gap="md">
        <Cluster justify="between">
          <Cluster gap="sm">
            <Shield className="size-4 text-primary" aria-hidden="true" />
            <h2 id="panneau-partage-titre" className="text-sm font-semibold">
              Partage et permissions — {nodeName}
            </h2>
            {info && <Badge variant="brand">{info.departmentName}</Badge>}
          </Cluster>

          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Fermer le panneau de partage"
              onClick={onClose}
            >
              <X aria-hidden="true" />
            </Button>
          )}
        </Cluster>

        {error && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>{error}</span>
              {!info && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading || busy}
                  onClick={() => {
                    setLoading(true)
                    setError(null)
                    setReloadToken((n) => n + 1)
                  }}
                >
                  Réessayer
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div role="status" aria-label="Chargement des permissions de partage">
            <Skeleton className="h-32 w-full" />
          </div>
        ) : info ? (
          <SplitGrid variant="equal">
            {/* Carte Propriétaire & Seuil M */}
            <Card className="py-4">
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                  Propriétaire
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Stack gap="sm">
                  <p className="text-sm font-medium">
                    {info.owner.firstName} {info.owner.lastName}{" "}
                    <span className="font-normal text-muted-foreground">
                      (@{info.owner.username})
                    </span>
                  </p>

                  <Cluster gap="sm">
                    <Badge variant="brand">Seuil actuel M = {info.minAccessLevel}</Badge>
                    <Badge variant="outline">Seuil parent ≥ {info.parentMinAccessLevel}</Badge>
                    <Badge variant="outline">
                      {info.isCompanyAdmin
                        ? "Admin entreprise"
                        : `Votre niveau L = ${info.actorAccessLevel}`}
                    </Badge>
                  </Cluster>

                  {!info.canManageSharing && (
                    <Alert variant="warning">
                      <Lock aria-hidden="true" />
                      <AlertDescription>
                        Consultation seule : seuls le propriétaire (avec L ≥ M), les membres avec
                        L &gt; M ou l&apos;administrateur d&apos;entreprise peuvent modifier le
                        seuil ou les contributeurs.
                      </AlertDescription>
                    </Alert>
                  )}

                  <form
                    onSubmit={(event) => void handleSaveThreshold(event)}
                    className="flex flex-wrap items-end gap-2 pt-1"
                  >
                    <Field className="w-36">
                      <Label htmlFor="sharing-threshold-input">Seuil minimum (M)</Label>
                      <Input
                        id="sharing-threshold-input"
                        type="number"
                        min={0}
                        step={1}
                        value={thresholdDraft}
                        disabled={!info.canManageSharing || busy}
                        onChange={(event) => setThresholdDraft(event.target.value)}
                      />
                    </Field>
                    <Button type="submit" size="sm" disabled={!info.canManageSharing || busy}>
                      Appliquer le seuil
                    </Button>
                  </form>
                </Stack>
              </CardContent>
            </Card>

            {/* Carte Contributeurs */}
            <Card className="py-4">
              <CardHeader>
                <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                  Contributeurs ({info.contributors.length})
                </CardTitle>
                <CardAction>
                  <Badge variant="secondary">{info.contributors.length}</Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                <Stack gap="sm">
                  <Alert variant="info">
                    <Info aria-hidden="true" />
                    <AlertDescription>
                      Ajouter un contributeur ne contourne jamais le seuil minimum M : un membre
                      avec L &lt; M reste sans accès.
                    </AlertDescription>
                  </Alert>

                  {info.contributors.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Aucun contributeur explicite pour le moment.
                    </p>
                  ) : (
                    <Table>
                      <TableBody>
                        {info.contributors.map((person) => {
                          const fullName =
                            `${person.firstName} ${person.lastName}`.trim() || person.username
                          return (
                            <TableRow key={person.id}>
                              <TableCell className="py-2 text-xs font-medium">
                                {fullName}{" "}
                                <span className="font-normal text-muted-foreground">
                                  (@{person.username})
                                </span>
                              </TableCell>
                              <TableCell className="py-2 text-right">
                                {info.canManageSharing && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    disabled={busy}
                                    aria-label={`Retirer le contributeur ${fullName}`}
                                    onClick={() => void handleRemoveContributor(person.id, fullName)}
                                  >
                                    <Trash2 aria-hidden="true" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )}

                  {info.canManageSharing && (
                    <form
                      onSubmit={(event) => void handleAddContributor(event)}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <Field className="min-w-40 flex-1">
                        <Label htmlFor="sharing-add-contributor">Ajouter un contributeur</Label>
                        <NativeSelect
                          id="sharing-add-contributor"
                          value={selectedUserId}
                          disabled={busy}
                          onChange={(event) => setSelectedUserId(event.target.value)}
                        >
                          <NativeSelectOption value="">
                            Choisir un collègue actif…
                          </NativeSelectOption>
                          {availableColleagues.map((u) => (
                            <NativeSelectOption key={u.id} value={u.id}>
                              {u.firstName} {u.lastName} (@{u.username})
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      </Field>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={busy || availableColleagues.length === 0}
                      >
                        <UserPlus aria-hidden="true" />
                        <Plus className="sr-only" />
                        Ajouter
                      </Button>
                    </form>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </SplitGrid>
        ) : null}
      </Stack>
    </section>
  )
}
