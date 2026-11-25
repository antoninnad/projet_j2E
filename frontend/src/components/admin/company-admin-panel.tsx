import { useEffect, useState, type FormEvent } from "react"
import {
  AlertCircle,
  Building,
  FolderTree,
  Plus,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty"
import { Field } from "@/components/ui/field"
import { Input, SearchInput } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Cluster, IconTile, SplitAside, SplitGrid, SplitMain, Stack } from "@/components/ui/layout"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  const joined = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
  return joined || user.username || user.email
}

export function CompanyAdminPanel({ client = api }: { client?: CompanyAdminApi }) {
  const [me, setMe] = useState<User | null>(null)

  const [accountSearch, setAccountSearch] = useState("")
  const [accounts, setAccounts] = useState<User[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [accountsError, setAccountsError] = useState<string | null>(null)
  const [busyAccountId, setBusyAccountId] = useState<number | null>(null)
  const [accountsReload, setAccountsReload] = useState(0)

  const [departments, setDepartments] = useState<Department[]>([])
  const [departmentsLoading, setDepartmentsLoading] = useState(true)
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null)

  const [newDeptName, setNewDeptName] = useState("")
  const [deptFormError, setDeptFormError] = useState<string | null>(null)
  const [creatingDept, setCreatingDept] = useState(false)

  const [members, setMembers] = useState<DepartmentMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState<string | null>(null)
  const [levelDrafts, setLevelDrafts] = useState<Record<number, string>>({})
  const [busyMemberId, setBusyMemberId] = useState<number | null>(null)
  const [membersReload, setMembersReload] = useState(0)

  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState<string>("")
  const [newMemberLevel, setNewMemberLevel] = useState<string>("1")

  useEffect(() => {
    const controller = new AbortController()
    client
      .getSession(controller.signal)
      .then((s) => {
        if (!controller.signal.aborted) setMe(s.user)
      })
      .catch(() => {
        // Ignoré si session non exposée en mode partiel
      })
    return () => controller.abort()
  }, [client])

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
        setAccountsError(err instanceof Error ? err.message : "Impossible de charger les comptes.")
        setAccountsLoading(false)
      })
    return () => controller.abort()
  }, [client, accountSearch, accountsReload])

  useEffect(() => {
    const controller = new AbortController()
    client
      .listDepartments({ size: 50 }, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return
        setDepartments(page.items)
        setDepartmentsError(null)
        if (page.items.length > 0) {
          setSelectedDeptId((prev) => {
            if (prev === null) {
              setMembersLoading(true)
              return page.items[0].id
            }
            return prev
          })
        }
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
  }, [client])

  useEffect(() => {
    if (selectedDeptId === null) return
    const controller = new AbortController()
    client
      .listDepartmentMembers(selectedDeptId, controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return
        setMembers(list)
        const drafts: Record<number, string> = {}
        for (const m of list) {
          drafts[m.userId] = String(m.accessLevel)
        }
        setLevelDrafts(drafts)
        setMembersError(null)
        setMembersLoading(false)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setMembersError(
          err instanceof Error
            ? err.message
            : "Impossible de charger les membres de ce département.",
        )
        setMembersLoading(false)
      })
    return () => controller.abort()
  }, [client, selectedDeptId, membersReload])

  async function handleToggleAccountStatus(account: User, targetStatus: "ACTIVE" | "DISABLED") {
    setBusyAccountId(account.id)
    setAccountsError(null)
    try {
      await client.updateUser(account.id, { status: targetStatus })
      toast.success(
        targetStatus === "DISABLED"
          ? `Le compte de ${fullNameOf(account)} a été désactivé.`
          : `Le compte de ${fullNameOf(account)} a été réactivé.`,
      )
      setAccountsLoading(true)
      setAccountsReload((n) => n + 1)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Impossible de modifier le statut du compte."
      setAccountsError(msg)
      toast.error("Action refusée", { description: msg })
    } finally {
      setBusyAccountId(null)
    }
  }

  async function handleCreateDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setDeptFormError(null)
    const trimmed = newDeptName.trim()
    if (!trimmed) {
      setDeptFormError("Le nom du département est obligatoire.")
      return
    }
    setCreatingDept(true)
    try {
      const created = await client.createDepartment({ name: trimmed })
      setDepartments((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "fr")),
      )
      setMembersLoading(true)
      setSelectedDeptId(created.id)
      setNewDeptName("")
      toast.success(`Département « ${created.name} » créé avec son dossier racine.`)
    } catch (err) {
      if (err instanceof ApiError) {
        setDeptFormError(err.errors?.name ?? err.message)
      } else {
        setDeptFormError(err instanceof Error ? err.message : "Création impossible.")
      }
    } finally {
      setCreatingDept(false)
    }
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedDeptId === null) return
    setMembersError(null)
    const userId = Number(selectedUserIdToAdd)
    const parsedLevel = Number(newMemberLevel)
    if (!userId) {
      setMembersError("Sélectionnez un membre actif à affecter.")
      return
    }
    if (!Number.isInteger(parsedLevel) || parsedLevel < 0) {
      setMembersError("Le niveau d'accès doit être un entier supérieur ou égal à 0.")
      return
    }
    setBusyMemberId(userId)
    try {
      await client.upsertDepartmentMember(selectedDeptId, { userId, accessLevel: parsedLevel })
      setSelectedUserIdToAdd("")
      setNewMemberLevel("1")
      setMembersLoading(true)
      setMembersReload((n) => n + 1)
      toast.success("Membre affecté au département")
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : "Affectation impossible.")
    } finally {
      setBusyMemberId(null)
    }
  }

  async function handleUpdateMemberLevel(member: DepartmentMember) {
    if (selectedDeptId === null) return
    setMembersError(null)
    const raw = levelDrafts[member.userId] ?? String(member.accessLevel)
    const parsed = Number(raw)
    if (!Number.isInteger(parsed) || parsed < 0) {
      setMembersError("Le niveau d'accès doit être un entier positif ou nul.")
      return
    }
    setBusyMemberId(member.userId)
    try {
      await client.upsertDepartmentMember(selectedDeptId, {
        userId: member.userId,
        accessLevel: parsed,
      })
      setMembersLoading(true)
      setMembersReload((n) => n + 1)
      toast.success(`Niveau d'accès de ${member.firstName} ${member.lastName} mis à jour (L = ${parsed})`)
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : "Mise à jour du niveau impossible.")
    } finally {
      setBusyMemberId(null)
    }
  }

  async function handleRemoveMember(member: DepartmentMember) {
    if (selectedDeptId === null) return
    setMembersError(null)
    setBusyMemberId(member.userId)
    try {
      await client.removeDepartmentMember(selectedDeptId, member.userId)
      setMembersLoading(true)
      setMembersReload((n) => n + 1)
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
    <SplitGrid>
      {/* Colonne gauche : Comptes de l'entreprise */}
      <SplitAside>
        <Card aria-labelledby="gestion-comptes-titre">
          <CardHeader className="border-b">
            <Cluster gap="md" wrap={false}>
              <IconTile tone="brand">
                <Users aria-hidden="true" />
              </IconTile>
              <Stack gap="xs">
                <CardTitle>
                  <h2 id="gestion-comptes-titre">Comptes de l&apos;entreprise</h2>
                </CardTitle>
                <CardDescription>
                  Désactivez un compte pour révoquer immédiatement son accès.
                </CardDescription>
              </Stack>
            </Cluster>
            <CardAction>
              <Badge variant="outline">{accounts.length}</Badge>
            </CardAction>
          </CardHeader>

          <CardContent>
            <Stack gap="md">
              <SearchInput
                aria-label="Filtrer les comptes de l'entreprise"
                placeholder="Filtrer par nom, identifiant ou email…"
                value={accountSearch}
                onChange={(event) => {
                  setAccountsLoading(true)
                  setAccountSearch(event.target.value)
                }}
              />

              {accountsError && (
                <Alert variant="destructive">
                  <AlertCircle aria-hidden="true" />
                  <AlertDescription>{accountsError}</AlertDescription>
                </Alert>
              )}

              {accountsLoading ? (
                <Stack gap="sm">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </Stack>
              ) : accounts.length === 0 ? (
                <Empty>
                  <EmptyTitle>Aucun compte trouvé</EmptyTitle>
                  <EmptyDescription>
                    Aucun compte actif ou désactivé ne correspond à votre filtre.
                  </EmptyDescription>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membre</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => {
                      const isMe = me?.id === account.id
                      const isDisabled = account.status === "DISABLED"
                      const isBusy = busyAccountId === account.id
                      return (
                        <TableRow key={account.id}>
                          <TableCell>
                            <Stack gap="xs">
                              <Cluster gap="xs">
                                <span className="font-medium">{fullNameOf(account)}</span>
                                {isMe && <Badge variant="brand">Vous</Badge>}
                              </Cluster>
                              <span className="text-xs text-muted-foreground">{account.email}</span>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Badge variant={isDisabled ? "outline" : "success"}>
                              {isDisabled ? "Désactivé" : "Actif"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {isDisabled ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isBusy}
                                onClick={() => void handleToggleAccountStatus(account, "ACTIVE")}
                              >
                                <UserCheck aria-hidden="true" />
                                Réactiver
                              </Button>
                            ) : (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isMe || isBusy}
                                    aria-label={`Désactiver le compte de ${fullNameOf(account)}`}
                                  >
                                    <UserMinus aria-hidden="true" />
                                    Désactiver
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Désactiver le compte de {fullNameOf(account)} ?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      La session de ce salarié sera révoquée et il ne pourra plus se
                                      connecter tant que son compte ne sera pas réactivé.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-white hover:bg-destructive/90"
                                      onClick={() => void handleToggleAccountStatus(account, "DISABLED")}
                                    >
                                      Confirmer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </Stack>
          </CardContent>
        </Card>
      </SplitAside>

      {/* Colonne droite : Départements, membres et niveaux d'accès */}
      <SplitMain>
        <Card aria-labelledby="gestion-departements-titre">
          <CardHeader className="border-b">
            <Cluster gap="md" wrap={false}>
              <IconTile tone="brand">
                <FolderTree aria-hidden="true" />
              </IconTile>
              <Stack gap="xs">
                <CardTitle>
                  <h2 id="gestion-departements-titre">
                    Départements, membres et niveaux d&apos;accès
                  </h2>
                </CardTitle>
                <CardDescription>
                  Chaque département crée automatiquement son dossier racine. Le niveau numérique L
                  détermine les permissions.
                </CardDescription>
              </Stack>
            </Cluster>
          </CardHeader>

          <CardContent>
            <Stack gap="md">
              <form
                onSubmit={(event) => void handleCreateDepartment(event)}
                className="flex flex-wrap items-end gap-2"
              >
                <Field className="min-w-48 flex-1">
                  <Label htmlFor="new-department-name">Nouveau département</Label>
                  <Input
                    id="new-department-name"
                    value={newDeptName}
                    onChange={(event) => setNewDeptName(event.target.value)}
                    placeholder="Ex : Juridique, Technique, Marketing…"
                  />
                </Field>
                <Button type="submit" disabled={creatingDept}>
                  <Plus aria-hidden="true" />
                  {creatingDept ? "Création…" : "Créer le département"}
                </Button>
              </form>

              {deptFormError && (
                <Alert variant="destructive">
                  <AlertCircle aria-hidden="true" />
                  <AlertDescription>{deptFormError}</AlertDescription>
                </Alert>
              )}

              {departmentsError && (
                <Alert variant="destructive">
                  <AlertCircle aria-hidden="true" />
                  <AlertDescription>{departmentsError}</AlertDescription>
                </Alert>
              )}

              {departmentsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : departments.length === 0 ? (
                <Empty>
                  <EmptyTitle>Aucun département créé</EmptyTitle>
                  <EmptyDescription>
                    Créez votre premier département ci-dessus pour générer son dossier racine.
                  </EmptyDescription>
                </Empty>
              ) : (
                <>
                  <Cluster gap="sm" role="group" aria-label="Sélectionner un département">
                    {departments.map((dept) => {
                      const selected = dept.id === selectedDeptId
                      return (
                        <Button
                          key={dept.id}
                          type="button"
                          size="sm"
                          variant={selected ? "default" : "outline"}
                          aria-pressed={selected}
                          onClick={() => {
                            setMembersLoading(true)
                            setSelectedDeptId(dept.id)
                          }}
                        >
                          <Building aria-hidden="true" />
                          {dept.name}
                        </Button>
                      )
                    })}
                  </Cluster>

                  {selectedDept && (
                    <Card className="bg-muted/20 py-4">
                      <CardHeader>
                        <CardTitle className="text-sm">
                          <h3>Membres du département « {selectedDept.name} »</h3>
                        </CardTitle>
                        <CardAction>
                          <Badge variant="outline">
                            {members.length} membre{members.length > 1 ? "s" : ""}
                          </Badge>
                        </CardAction>
                      </CardHeader>

                      <CardContent>
                        <Stack gap="md">
                          {membersError && (
                            <Alert variant="destructive">
                              <AlertCircle aria-hidden="true" />
                              <AlertDescription>{membersError}</AlertDescription>
                            </Alert>
                          )}

                          {membersLoading ? (
                            <Skeleton className="h-20 w-full" />
                          ) : members.length === 0 ? (
                            <Empty>
                              <EmptyDescription>
                                Aucun membre affecté à ce département.
                              </EmptyDescription>
                            </Empty>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Collaborateur</TableHead>
                                  <TableHead>Niveau d&apos;accès (L)</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {members.map((member) => {
                                  const isBusy = busyMemberId === member.userId
                                  return (
                                    <TableRow key={member.userId}>
                                      <TableCell>
                                        <Stack gap="xs">
                                          <span className="font-medium">
                                            {member.firstName} {member.lastName}
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            @{member.username}
                                          </span>
                                        </Stack>
                                      </TableCell>
                                      <TableCell>
                                        <Cluster gap="sm" wrap={false}>
                                          <Label htmlFor={`member-level-${member.userId}`}>
                                            Niveau L
                                          </Label>
                                          <Input
                                            id={`member-level-${member.userId}`}
                                            type="number"
                                            min={0}
                                            step={1}
                                            value={
                                              levelDrafts[member.userId] ??
                                              String(member.accessLevel)
                                            }
                                            onChange={(event) =>
                                              setLevelDrafts((prev) => ({
                                                ...prev,
                                                [member.userId]: event.target.value,
                                              }))
                                            }
                                            className="h-8 w-20 text-center"
                                          />
                                        </Cluster>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Cluster justify="end" gap="xs">
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
                                            size="icon-sm"
                                            variant="ghost"
                                            disabled={isBusy}
                                            aria-label={`Retirer ${member.firstName} ${member.lastName} du département`}
                                            onClick={() => void handleRemoveMember(member)}
                                          >
                                            <Trash2 aria-hidden="true" />
                                          </Button>
                                        </Cluster>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          )}

                          <Separator />

                          <form
                            onSubmit={(event) => void handleAddMember(event)}
                            className="flex flex-wrap items-end gap-2"
                          >
                            <Field className="min-w-48 flex-1">
                              <Label htmlFor="assign-member-select">Affecter un membre actif</Label>
                              <NativeSelect
                                id="assign-member-select"
                                value={selectedUserIdToAdd}
                                onChange={(event) => setSelectedUserIdToAdd(event.target.value)}
                              >
                                <NativeSelectOption value="">
                                  Choisir un collègue…
                                </NativeSelectOption>
                                {assignableUsers.map((u) => (
                                  <NativeSelectOption key={u.id} value={u.id}>
                                    {fullNameOf(u)} (@{u.username})
                                  </NativeSelectOption>
                                ))}
                              </NativeSelect>
                            </Field>

                            <Field className="w-24">
                              <Label htmlFor="assign-member-level">Niveau L</Label>
                              <Input
                                id="assign-member-level"
                                type="number"
                                min={0}
                                step={1}
                                value={newMemberLevel}
                                onChange={(event) => setNewMemberLevel(event.target.value)}
                              />
                            </Field>

                            <Button type="submit" size="sm" disabled={assignableUsers.length === 0}>
                              <Plus aria-hidden="true" />
                              Affecter
                            </Button>
                          </form>
                        </Stack>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      </SplitMain>
    </SplitGrid>
  )
}
