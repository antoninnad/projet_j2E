import { useEffect, useState, type FormEvent } from "react"
import {
  Building,
  FolderTree,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, type Api } from "@/lib/api"
import { ApiError } from "@/lib/api-client"
import type { Department, DepartmentMember, User } from "@/types/api"

export type CompanyAdminApi = Pick<
  Api,
  | "getSession"
  | "listUsers"
  | "updateUser"
  | "listDepartments"
  | "createDepartment"
  | "listDepartmentMembers"
  | "upsertDepartmentMember"
  | "removeDepartmentMember"
>

function fullNameOf(user: Pick<User, "firstName" | "lastName" | "username" | "email">): string {
  const full = `${user.firstName} ${user.lastName}`.trim()
  return full || user.username || user.email
}

export function CompanyAdminPanel({ client = api }: { client?: CompanyAdminApi }) {
  // --- État : comptes de l'entreprise ---
  const [me, setMe] = useState<User | null>(null)
  const [accounts, setAccounts] = useState<User[]>([])
  const [accountSearch, setAccountSearch] = useState("")
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [accountsError, setAccountsError] = useState<string | null>(null)
  const [confirmDisableId, setConfirmDisableId] = useState<number | null>(null)
  const [busyAccountId, setBusyAccountId] = useState<number | null>(null)
  const [accountsTick, setAccountsTick] = useState(0)

  // --- État : départements & niveaux ---
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null)
  const [newDeptName, setNewDeptName] = useState("")
  const [deptFormError, setDeptFormError] = useState<string | null>(null)
  const [creatingDept, setCreatingDept] = useState(false)
  const [departmentsLoading, setDepartmentsLoading] = useState(true)
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)
  const [deptsTick, setDeptsTick] = useState(0)

  const [members, setMembers] = useState<DepartmentMember[]>([])
  const [levelDrafts, setLevelDrafts] = useState<Record<number, string>>({})
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState<string | null>(null)
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState<string>("")
  const [newMemberLevel, setNewMemberLevel] = useState<string>("1")
  const [busyMemberId, setBusyMemberId] = useState<number | null>(null)
  const [membersTick, setMembersTick] = useState(0)

  // Session courante
  useEffect(() => {
    const controller = new AbortController()
    client
      .getSession(controller.signal)
      .then((session) => {
        if (!controller.signal.aborted) setMe(session.user)
      })
      .catch(() => {
        // Ignoré : le contrôle serveur protège déjà la désactivation de son propre compte
      })
    return () => controller.abort()
  }, [client])

  // Comptes de l'entreprise (actifs et désactivés)
  useEffect(() => {
    const controller = new AbortController()
    client
      .listUsers({ size: 50, search: accountSearch.trim() || undefined }, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return
        setAccounts(page.items.filter((u) => u.status !== "PENDING"))
        setAccountsError(null)
        setAccountsLoading(false)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setAccountsError(
          err instanceof Error ? err.message : "Impossible de charger les comptes de l'entreprise.",
        )
        setAccountsLoading(false)
      })
    return () => controller.abort()
  }, [client, accountSearch, accountsTick])

  // Départements
  useEffect(() => {
    const controller = new AbortController()
    client
      .listDepartments({ size: 50 }, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return
        setDepartments(page.items)
        setSelectedDeptId((current) =>
          current && page.items.some((d) => d.id === current) ? current : (page.items[0]?.id ?? null),
        )
        setDepartmentsError(null)
        setDepartmentsLoading(false)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setDepartmentsError(
          err instanceof Error ? err.message : "Impossible de charger les départements.",
        )
        setDepartmentsLoading(false)
      })
    return () => controller.abort()
  }, [client, deptsTick])

  // Membres du département sélectionné
  useEffect(() => {
    if (selectedDeptId === null) {
      return
    }
    const controller = new AbortController()
    client
      .listDepartmentMembers(selectedDeptId, controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return
        setMembers(list)
        setLevelDrafts(Object.fromEntries(list.map((m) => [m.userId, String(m.accessLevel)])))
        setMembersError(null)
        setMembersLoading(false)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setMembersError(
          err instanceof Error ? err.message : "Impossible de charger les membres du département.",
        )
        setMembersLoading(false)
      })
    return () => controller.abort()
  }, [client, selectedDeptId, membersTick])

  async function handleToggleAccountStatus(user: User, nextStatus: "ACTIVE" | "DISABLED") {
    setBusyAccountId(user.id)
    setAccountsError(null)
    try {
      await client.updateUser(user.id, { status: nextStatus })
      setConfirmDisableId(null)
      setAccountsLoading(true)
      setAccountsTick((value) => value + 1)
      if (selectedDeptId !== null) {
        setMembersLoading(true)
        setMembersTick((value) => value + 1)
      }
      toast.success(
        nextStatus === "DISABLED"
          ? `Le compte de ${fullNameOf(user)} a été désactivé.`
          : `Le compte de ${fullNameOf(user)} a été réactivé.`,
      )
    } catch (err) {
      setAccountsError(err instanceof Error ? err.message : "Impossible de mettre à jour ce compte.")
    } finally {
      setBusyAccountId(null)
    }
  }

  async function handleCreateDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setDeptFormError(null)
    const name = newDeptName.trim()
    if (!name) {
      setDeptFormError("Le nom du département est obligatoire.")
      return
    }
    setCreatingDept(true)
    try {
      const created = await client.createDepartment({ name })
      setNewDeptName("")
      setDepartmentsLoading(true)
      setSelectedDeptId(created.id)
      setDeptsTick((value) => value + 1)
      setMembersLoading(true)
      setMembersTick((value) => value + 1)
      toast.success(`Département « ${created.name} » créé`, {
        description: "Son dossier racine a été créé automatiquement.",
      })
    } catch (err) {
      setDeptFormError(
        err instanceof ApiError ? err.message : "Impossible de créer le département.",
      )
    } finally {
      setCreatingDept(false)
    }
  }

  async function handleUpdateMemberLevel(member: DepartmentMember) {
    if (selectedDeptId === null) return
    const parsed = Number(levelDrafts[member.userId] ?? member.accessLevel)
    if (!Number.isInteger(parsed) || parsed < 0) {
      setMembersError("Le niveau d'accès doit être un entier supérieur ou égal à 0.")
      return
    }
    setBusyMemberId(member.userId)
    setMembersError(null)
    try {
      await client.upsertDepartmentMember(selectedDeptId, {
        userId: member.userId,
        accessLevel: parsed,
      })
      setMembersLoading(true)
      setMembersTick((value) => value + 1)
      toast.success(`Niveau de ${member.firstName} ${member.lastName} mis à jour (L = ${parsed})`)
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : "Impossible de modifier le niveau d'accès.")
    } finally {
      setBusyMemberId(null)
    }
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedDeptId === null) return
    setMembersError(null)
    const userId = Number(selectedUserIdToAdd)
    const accessLevel = Number(newMemberLevel)
    if (!userId) {
      setMembersError("Sélectionnez un membre actif à affecter.")
      return
    }
    if (!Number.isInteger(accessLevel) || accessLevel < 0) {
      setMembersError("Le niveau d'accès doit être un entier supérieur ou égal à 0.")
      return
    }
    setBusyMemberId(userId)
    try {
      await client.upsertDepartmentMember(selectedDeptId, { userId, accessLevel })
      setSelectedUserIdToAdd("")
      setNewMemberLevel("1")
      setMembersLoading(true)
      setMembersTick((value) => value + 1)
      toast.success("Membre affecté au département")
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : "Impossible d'affecter ce membre.")
    } finally {
      setBusyMemberId(null)
    }
  }

  async function handleRemoveMember(member: DepartmentMember) {
    if (selectedDeptId === null) return
    setBusyMemberId(member.userId)
    setMembersError(null)
    try {
      await client.removeDepartmentMember(selectedDeptId, member.userId)
      setMembersLoading(true)
      setMembersTick((value) => value + 1)
      toast.success(`${member.firstName} ${member.lastName} retiré du département`)
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : "Impossible de retirer ce membre.")
    } finally {
      setBusyMemberId(null)
    }
  }

  const memberIds = new Set(members.map((m) => m.userId))
  const assignableUsers = accounts.filter((u) => u.status === "ACTIVE" && !memberIds.has(u.id))
  const selectedDept = departments.find((d) => d.id === selectedDeptId) ?? null

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Gestion des comptes : désactivation / réactivation */}
      <section
        aria-labelledby="gestion-comptes-titre"
        className="overflow-hidden rounded-xl border border-border bg-background shadow-sm lg:col-span-5"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Users className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <h2 id="gestion-comptes-titre" className="text-base font-semibold tracking-tight">
                Comptes de l'entreprise
              </h2>
              <p className="text-xs text-muted-foreground">
                Désactivez un compte pour révoquer immédiatement son accès.
              </p>
            </div>
          </div>
          <Badge variant="outline">{accounts.length}</Badge>
        </div>

        <div className="space-y-4 p-5">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              aria-label="Filtrer les comptes de l'entreprise"
              placeholder="Filtrer par nom, identifiant ou email…"
              value={accountSearch}
              onChange={(event) => {
                setAccountsLoading(true)
                setAccountSearch(event.target.value)
              }}
              className="pl-9"
            />
          </div>

          {accountsError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {accountsError}
            </div>
          )}

          {accountsLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Chargement des comptes…</p>
          ) : accounts.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              Aucun compte actif ou désactivé trouvé.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {accounts.map((account) => {
                const isMe = me?.id === account.id
                const isDisabled = account.status === "DISABLED"
                const isBusy = busyAccountId === account.id
                return (
                  <li key={account.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{fullNameOf(account)}</p>
                        {isMe && <Badge variant="secondary">Vous</Badge>}
                        <Badge variant={isDisabled ? "outline" : "secondary"}>
                          {isDisabled ? "Désactivé" : "Actif"}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{account.email}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isDisabled ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => void handleToggleAccountStatus(account, "ACTIVE")}
                        >
                          <UserCheck className="size-4" aria-hidden="true" />
                          Réactiver
                        </Button>
                      ) : confirmDisableId === account.id ? (
                        <>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => void handleToggleAccountStatus(account, "DISABLED")}
                          >
                            Confirmer
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => setConfirmDisableId(null)}
                          >
                            Annuler
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isMe || isBusy}
                          aria-label={`Désactiver le compte de ${fullNameOf(account)}`}
                          onClick={() => setConfirmDisableId(account.id)}
                        >
                          <UserMinus className="size-4" aria-hidden="true" />
                          Désactiver
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Départements, membres et niveaux d'accès */}
      <section
        aria-labelledby="gestion-departements-titre"
        className="overflow-hidden rounded-xl border border-border bg-background shadow-sm lg:col-span-7"
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <FolderTree className="size-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <div>
            <h2 id="gestion-departements-titre" className="text-base font-semibold tracking-tight">
              Départements, membres et niveaux d'accès
            </h2>
            <p className="text-xs text-muted-foreground">
              Chaque département crée automatiquement son dossier racine. Le niveau numérique L détermine les permissions.
            </p>
          </div>
        </div>

        <div className="space-y-5 p-5">
          {/* Création de département */}
          <form onSubmit={(event) => void handleCreateDepartment(event)} className="flex flex-wrap items-end gap-2">
            <div className="min-w-48 flex-1 space-y-1">
              <label htmlFor="new-department-name" className="block text-xs font-medium text-foreground">
                Nouveau département
              </label>
              <Input
                id="new-department-name"
                value={newDeptName}
                onChange={(event) => setNewDeptName(event.target.value)}
                placeholder="Ex : Juridique, Technique, Marketing…"
              />
            </div>
            <Button type="submit" disabled={creatingDept}>
              <Plus className="size-4" aria-hidden="true" />
              {creatingDept ? "Création…" : "Créer le département"}
            </Button>
          </form>

          {deptFormError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-900">
              {deptFormError}
            </div>
          )}

          {departmentsError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {departmentsError}
            </div>
          )}

          {/* Sélecteur de département */}
          {departmentsLoading ? (
            <p className="text-sm text-muted-foreground">Chargement des départements…</p>
          ) : departments.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              Aucun département créé pour le moment.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Sélectionner un département">
                {departments.map((dept) => {
                  const selected = dept.id === selectedDeptId
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setMembersLoading(true)
                        setSelectedDeptId(dept.id)
                      }}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-secondary"
                      }`}
                    >
                      <Building className="size-3.5" aria-hidden="true" />
                      {dept.name}
                    </button>
                  )
                })}
              </div>

              {selectedDept && (
                <div className="space-y-4 rounded-lg border border-border bg-muted/15 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">
                      Membres du département « {selectedDept.name} »
                    </h3>
                    <Badge variant="outline">{members.length} membre{members.length > 1 ? "s" : ""}</Badge>
                  </div>

                  {membersError && (
                    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-900">
                      {membersError}
                    </div>
                  )}

                  {membersLoading ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">Chargement des adhésions…</p>
                  ) : members.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      Aucun membre affecté à ce département.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border rounded-lg border border-border bg-background">
                      {members.map((member) => {
                        const isBusy = busyMemberId === member.userId
                        return (
                          <li
                            key={member.userId}
                            className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {member.firstName} {member.lastName}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">@{member.username}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <label
                                htmlFor={`member-level-${member.userId}`}
                                className="text-xs text-muted-foreground"
                              >
                                Niveau L
                              </label>
                              <Input
                                id={`member-level-${member.userId}`}
                                type="number"
                                min={0}
                                step={1}
                                value={levelDrafts[member.userId] ?? String(member.accessLevel)}
                                onChange={(event) =>
                                  setLevelDrafts((prev) => ({
                                    ...prev,
                                    [member.userId]: event.target.value,
                                  }))
                                }
                                className="h-8 w-20 text-center"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isBusy}
                                onClick={() => void handleUpdateMemberLevel(member)}
                              >
                                Enregistrer
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                disabled={isBusy}
                                aria-label={`Retirer ${member.firstName} ${member.lastName} du département`}
                                onClick={() => void handleRemoveMember(member)}
                              >
                                <Trash2 className="size-4" aria-hidden="true" />
                              </Button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  {/* Formulaire d'affectation d'un nouveau membre */}
                  <form
                    onSubmit={(event) => void handleAddMember(event)}
                    className="flex flex-wrap items-end gap-2 border-t border-border pt-3"
                  >
                    <div className="min-w-48 flex-1 space-y-1">
                      <label htmlFor="assign-member-select" className="block text-xs font-medium text-foreground">
                        Affecter un membre actif
                      </label>
                      <select
                        id="assign-member-select"
                        value={selectedUserIdToAdd}
                        onChange={(event) => setSelectedUserIdToAdd(event.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                      >
                        <option value="">Choisir un collègue…</option>
                        {assignableUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {fullNameOf(u)} (@{u.username})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24 space-y-1">
                      <label htmlFor="assign-member-level" className="block text-xs font-medium text-foreground">
                        Niveau L
                      </label>
                      <Input
                        id="assign-member-level"
                        type="number"
                        min={0}
                        step={1}
                        value={newMemberLevel}
                        onChange={(event) => setNewMemberLevel(event.target.value)}
                        className="h-9"
                      />
                    </div>

                    <Button type="submit" size="sm" disabled={assignableUsers.length === 0}>
                      <Plus className="size-4" aria-hidden="true" />
                      Affecter
                    </Button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
