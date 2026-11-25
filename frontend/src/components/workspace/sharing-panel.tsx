import { useEffect, useState, type FormEvent } from "react"
import { Info, Lock, Plus, Shield, Trash2, UserPlus, X } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, type Api } from "@/lib/api"
import { ApiError } from "@/lib/api-client"
import type { NodeSharingInfo, User } from "@/types/api"

export type SharingPanelApi = Pick<
  Api,
  | "getNodeSharing"
  | "updateNodeThreshold"
  | "addNodeContributor"
  | "removeNodeContributor"
  | "listUsers"
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
  const [colleagues, setColleagues] = useState<User[]>([])
  const [thresholdDraft, setThresholdDraft] = useState<string>("0")
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      client.getNodeSharing(nodeId, controller.signal),
      client.listUsers({ status: "ACTIVE", size: 50 }, controller.signal).catch(() => null),
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
  }, [client, nodeId])

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
      className="border-b border-border bg-muted/20 px-4 py-4 sm:px-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 id="panneau-partage-titre" className="text-sm font-semibold">
            Partage et permissions — {nodeName}
          </h2>
          {info && <Badge variant="outline">{info.departmentName}</Badge>}
        </div>

        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Fermer le panneau de partage"
            onClick={onClose}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-900">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-3 text-xs text-muted-foreground">Chargement des droits de partage…</p>
      ) : info ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* Propriétaire & Seuil M */}
          <div className="space-y-3 rounded-lg border border-border bg-background p-4">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Propriétaire
              </p>
              <p className="text-sm font-medium text-foreground">
                {info.owner.firstName} {info.owner.lastName}{" "}
                <span className="font-normal text-muted-foreground">(@{info.owner.username})</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">Seuil actuel M = {info.minAccessLevel}</Badge>
              <Badge variant="outline">Seuil parent ≥ {info.parentMinAccessLevel}</Badge>
              <Badge variant="outline">
                {info.isCompanyAdmin ? "Admin entreprise" : `Votre niveau L = ${info.actorAccessLevel}`}
              </Badge>
            </div>

            {!info.canManageSharing && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <span>
                  Consultation seule : seuls le propriétaire (avec L ≥ M), les membres avec L &gt; M ou
                  l'administrateur d'entreprise peuvent modifier le seuil ou les contributeurs.
                </span>
              </div>
            )}

            <form onSubmit={(event) => void handleSaveThreshold(event)} className="flex items-end gap-2 pt-1">
              <div className="w-32 space-y-1">
                <label htmlFor="sharing-threshold-input" className="block text-xs font-medium text-foreground">
                  Seuil minimum (M)
                </label>
                <Input
                  id="sharing-threshold-input"
                  type="number"
                  min={0}
                  step={1}
                  value={thresholdDraft}
                  disabled={!info.canManageSharing || busy}
                  onChange={(event) => setThresholdDraft(event.target.value)}
                  className="h-9"
                />
              </div>
              <Button type="submit" size="sm" disabled={!info.canManageSharing || busy}>
                Appliquer le seuil
              </Button>
            </form>
          </div>

          {/* Contributeurs */}
          <div className="space-y-3 rounded-lg border border-border bg-background p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Contributeurs ({info.contributors.length})
              </p>
            </div>

            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-2.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>
                Ajouter un contributeur ne contourne jamais le seuil minimum M : un membre avec L &lt; M
                reste sans accès.
              </span>
            </div>

            {info.contributors.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun contributeur explicite pour le moment.</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {info.contributors.map((person) => {
                  const fullName = `${person.firstName} ${person.lastName}`.trim() || person.username
                  return (
                    <li key={person.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                      <span className="truncate font-medium text-foreground">
                        {fullName}{" "}
                        <span className="font-normal text-muted-foreground">(@{person.username})</span>
                      </span>
                      {info.canManageSharing && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={busy}
                          aria-label={`Retirer le contributeur ${fullName}`}
                          onClick={() => void handleRemoveContributor(person.id, fullName)}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            {info.canManageSharing && (
              <form onSubmit={(event) => void handleAddContributor(event)} className="flex items-end gap-2">
                <div className="min-w-40 flex-1 space-y-1">
                  <label htmlFor="sharing-add-contributor" className="block text-xs font-medium text-foreground">
                    Ajouter un contributeur
                  </label>
                  <select
                    id="sharing-add-contributor"
                    value={selectedUserId}
                    disabled={busy}
                    onChange={(event) => setSelectedUserId(event.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs text-foreground"
                  >
                    <option value="">Choisir un collègue actif…</option>
                    {availableColleagues.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} (@{u.username})
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" size="sm" disabled={busy || availableColleagues.length === 0}>
                  <UserPlus className="size-3.5" aria-hidden="true" />
                  <Plus className="sr-only" />
                  Ajouter
                </Button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
