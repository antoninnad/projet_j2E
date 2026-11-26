import { useEffect, useState, type FormEvent } from "react"
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Save,
  UserRound,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyIcon, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldError, FieldGroup, FieldRow } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SearchInput } from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import {
  Cluster,
  PresenceAvatar,
  SplitAside,
  SplitGrid,
  SplitMain,
  Stack,
} from "@/components/ui/layout"
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { api, type Api } from "@/lib/api"
import { ApiError } from "@/lib/api-client"
import type { Page, Profile, User } from "@/types/api"

type DirectoryProfileApi = Pick<
  Api,
  | "getSession"
  | "updateUser"
  | "getMyProfile"
  | "updateMyProfile"
  | "changeMyPassword"
  | "listUsers"
  | "getUserProfile"
>

const DIRECTORY_PAGE_SIZE = 4

function initialsOf(firstName?: string, lastName?: string, username?: string): string {
  const first = firstName?.trim()?.[0] ?? ""
  const last = lastName?.trim()?.[0] ?? ""
  if (first || last) return `${first}${last}`.toUpperCase()
  return (username?.trim().slice(0, 2) || "U").toUpperCase()
}

function fullNameOf(user: Pick<User, "firstName" | "lastName" | "username" | "email">): string {
  const joined = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
  return joined || user.username || user.email
}

export interface DirectoryProfilePanelProps {
  client?: DirectoryProfileApi
  onOpenConversation?: (colleague: User) => void
}

export function DirectoryProfilePanel({
  client = api,
  onOpenConversation,
}: DirectoryProfilePanelProps) {
  const [me, setMe] = useState<User | null>(null)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [bio, setBio] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string>>({})
  const [profileSavedNotice, setProfileSavedNotice] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<Record<string, string>>({})
  const [passwordSavedNotice, setPasswordSavedNotice] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [directoryResult, setDirectoryResult] = useState<Page<User> | null>(null)
  const [directoryLoading, setDirectoryLoading] = useState(true)
  const [directoryError, setDirectoryError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const [selectedColleague, setSelectedColleague] = useState<User | null>(null)
  const [colleagueProfile, setColleagueProfile] = useState<Profile | null>(null)
  const [colleagueLoading, setColleagueLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([client.getSession(controller.signal), client.getMyProfile(controller.signal)])
      .then(([sessionData, profileData]) => {
        if (controller.signal.aborted) return
        setMe(sessionData.user)
        setFirstName(sessionData.user.firstName ?? "")
        setLastName(sessionData.user.lastName ?? "")
        setBio(profileData.bio ?? "")
        setAvatarUrl(profileData.profilePictureUrl ?? "")
        setProfileError(null)
        setProfileLoading(false)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setProfileError(
          err instanceof Error
            ? err.message
            : "Impossible de charger votre profil pour le moment.",
        )
        setProfileLoading(false)
      })

    return () => controller.abort()
  }, [client])

  useEffect(() => {
    const controller = new AbortController()
    client
      .listUsers(
        {
          page,
          size: DIRECTORY_PAGE_SIZE,
          status: "ACTIVE",
          search: search.trim() || undefined,
        },
        controller.signal,
      )
      .then((data) => {
        if (controller.signal.aborted) return
        setDirectoryResult(data)
        setDirectoryError(null)
        setDirectoryLoading(false)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setDirectoryError(
          err instanceof Error ? err.message : "Impossible de charger l'annuaire de l'entreprise.",
        )
        setDirectoryResult(null)
        setDirectoryLoading(false)
      })

    return () => controller.abort()
  }, [client, page, search, reloadToken])

  useEffect(() => {
    if (!selectedColleague) return
    const controller = new AbortController()
    client
      .getUserProfile(selectedColleague.id, controller.signal)
      .then((profile) => {
        if (controller.signal.aborted) return
        setColleagueProfile(profile)
        setColleagueLoading(false)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setColleagueProfile({ id: selectedColleague.id, bio: "", profilePictureUrl: null })
        setColleagueLoading(false)
      })

    return () => controller.abort()
  }, [client, selectedColleague])

  function handleSearchChange(value: string) {
    setDirectoryLoading(true)
    setSearch(value)
    setPage(0)
  }

  function handleChangePage(nextPage: number) {
    setDirectoryLoading(true)
    setPage(nextPage)
  }

  function handleRefreshDirectory() {
    setDirectoryLoading(true)
    setReloadToken((n) => n + 1)
  }

  function handleSelectColleague(colleague: User) {
    setColleagueProfile(null)
    setColleagueLoading(true)
    setSelectedColleague(colleague)
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileError(null)
    setProfileFieldErrors({})
    setProfileSavedNotice(null)

    const errors: Record<string, string> = {}
    if (!firstName.trim()) errors.firstName = "Le prénom est obligatoire."
    if (!lastName.trim()) errors.lastName = "Le nom est obligatoire."
    if (bio.length > 2000) errors.bio = "La biographie ne peut pas dépasser 2000 caractères."

    const trimmedAvatar = avatarUrl.trim()
    if (trimmedAvatar && !/^https?:\/\/.+/i.test(trimmedAvatar) && !trimmedAvatar.startsWith("/")) {
      errors.profilePictureUrl = "Indiquez une URL valide commençant par https:// ou /."
    }

    if (Object.keys(errors).length > 0) {
      setProfileFieldErrors(errors)
      return
    }

    setProfileSaving(true)
    try {
      const trimmedFirst = firstName.trim()
      const trimmedLast = lastName.trim()
      if (me && (trimmedFirst !== me.firstName || trimmedLast !== me.lastName)) {
        const updatedUser = await client.updateUser(me.id, {
          firstName: trimmedFirst,
          lastName: trimmedLast,
        })
        setMe(updatedUser)
      }
      const updated = await client.updateMyProfile({
        bio: bio.trim(),
        profilePictureUrl: trimmedAvatar ? trimmedAvatar : null,
      })
      setBio(updated.bio ?? "")
      setAvatarUrl(updated.profilePictureUrl ?? "")
      setProfileSavedNotice("Votre profil a bien été enregistré.")
      toast.success("Profil mis à jour")
      handleRefreshDirectory()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors) setProfileFieldErrors(err.errors)
        setProfileError(err.message)
      } else {
        setProfileError(err instanceof Error ? err.message : "Échec de la sauvegarde du profil.")
      }
    } finally {
      setProfileSaving(false)
    }
  }

  async function handleSavePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError(null)
    setPasswordFieldErrors({})
    setPasswordSavedNotice(null)

    const errors: Record<string, string> = {}
    if (!currentPassword) errors.currentPassword = "Le mot de passe actuel est requis."
    if (newPassword.length < 8) {
      errors.newPassword = "Le nouveau mot de passe doit contenir au moins 8 caractères."
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = "La confirmation ne correspond pas au nouveau mot de passe."
    }

    if (Object.keys(errors).length > 0) {
      setPasswordFieldErrors(errors)
      return
    }

    setPasswordSaving(true)
    try {
      await client.changeMyPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPasswordSavedNotice("Votre mot de passe a été modifié avec succès.")
      toast.success("Mot de passe modifié")
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors) setPasswordFieldErrors(err.errors)
        setPasswordError(err.message)
      } else {
        setPasswordError(
          err instanceof Error ? err.message : "Impossible de modifier votre mot de passe.",
        )
      }
    } finally {
      setPasswordSaving(false)
    }
  }

  const totalPages = Math.max(1, directoryResult?.page.totalPages ?? 1)
  const colleagues = directoryResult?.items ?? []

  return (
    <>
      <SplitGrid>
        {/* Colonne gauche : Mon profil & Sécurité */}
        <SplitAside>
          <Card aria-labelledby="mon-profil-titre">
            <CardHeader className="border-b">
              <CardTitle>
                <h2 id="mon-profil-titre">Mon profil</h2>
              </CardTitle>
            </CardHeader>

            {profileLoading ? (
              <CardContent>
                <Stack gap="sm">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-24 w-full" />
                </Stack>
              </CardContent>
            ) : (
              <form onSubmit={(event) => void handleSaveProfile(event)} noValidate>
                <CardContent>
                  <FieldGroup>
                    {profileError && (
                      <Alert variant="destructive">
                        <AlertCircle aria-hidden="true" />
                        <AlertDescription>{profileError}</AlertDescription>
                      </Alert>
                    )}

                    {profileSavedNotice && (
                      <Alert variant="success">
                        <CheckCircle2 aria-hidden="true" />
                        <AlertDescription>{profileSavedNotice}</AlertDescription>
                      </Alert>
                    )}

                    <Cluster gap="lg" wrap={false}>
                      <PresenceAvatar
                        src={avatarUrl.trim() || null}
                        alt="Aperçu de mon avatar"
                        initials={initialsOf(firstName, lastName, me?.username)}
                        size="lg"
                      />
                      <Field className="min-w-0 flex-1">
                        <Label htmlFor="profile-avatar-url">URL de l&apos;avatar</Label>
                        <Cluster gap="sm" wrap={false}>
                          <Input
                            id="profile-avatar-url"
                            type="url"
                            value={avatarUrl}
                            onChange={(event) => setAvatarUrl(event.target.value)}
                            placeholder="https://exemple.fr/avatar.png"
                          />
                          {avatarUrl && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              aria-label="Retirer l'avatar"
                              title="Retirer l'avatar"
                              onClick={() => setAvatarUrl("")}
                            >
                              <X aria-hidden="true" />
                            </Button>
                          )}
                        </Cluster>
                        {profileFieldErrors.profilePictureUrl && (
                          <FieldError>{profileFieldErrors.profilePictureUrl}</FieldError>
                        )}
                      </Field>
                    </Cluster>

                    <FieldRow>
                      <Field>
                        <Label htmlFor="profile-first-name">Prénom</Label>
                        <Input
                          id="profile-first-name"
                          value={firstName}
                          onChange={(event) => setFirstName(event.target.value)}
                          required
                        />
                        {profileFieldErrors.firstName && (
                          <FieldError>{profileFieldErrors.firstName}</FieldError>
                        )}
                      </Field>

                      <Field>
                        <Label htmlFor="profile-last-name">Nom</Label>
                        <Input
                          id="profile-last-name"
                          value={lastName}
                          onChange={(event) => setLastName(event.target.value)}
                          required
                        />
                        {profileFieldErrors.lastName && (
                          <FieldError>{profileFieldErrors.lastName}</FieldError>
                        )}
                      </Field>
                    </FieldRow>

                    <Field>
                      <Cluster justify="between">
                        <Label htmlFor="profile-bio">Biographie</Label>
                        <span className="text-xs text-muted-foreground">{bio.length} / 2000</span>
                      </Cluster>
                      <Textarea
                        id="profile-bio"
                        rows={4}
                        maxLength={2000}
                        value={bio}
                        onChange={(event) => setBio(event.target.value)}
                        placeholder="Présentez votre rôle, votre équipe et vos sujets…"
                      />
                      {profileFieldErrors.bio && <FieldError>{profileFieldErrors.bio}</FieldError>}
                    </Field>
                  </FieldGroup>
                </CardContent>

                <CardFooter className="mt-5 justify-end border-t">
                  <Button type="submit" disabled={profileSaving}>
                    <Save aria-hidden="true" />
                    {profileSaving ? "Enregistrement…" : "Enregistrer mon profil"}
                  </Button>
                </CardFooter>
              </form>
            )}
          </Card>

          <Card aria-labelledby="mot-de-passe-titre">
            <CardHeader className="border-b">
              <CardTitle>
                <h2 id="mot-de-passe-titre">Mot de passe</h2>
              </CardTitle>
            </CardHeader>

            <form onSubmit={(event) => void handleSavePassword(event)} noValidate>
              <CardContent>
                <FieldGroup>
                  {passwordError && (
                    <Alert variant="destructive">
                      <AlertCircle aria-hidden="true" />
                      <AlertDescription>{passwordError}</AlertDescription>
                    </Alert>
                  )}

                  {passwordSavedNotice && (
                    <Alert variant="success">
                      <CheckCircle2 aria-hidden="true" />
                      <AlertDescription>{passwordSavedNotice}</AlertDescription>
                    </Alert>
                  )}

                  <Field>
                    <Label htmlFor="current-password">Mot de passe actuel</Label>
                    <Input
                      id="current-password"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      required
                    />
                    {passwordFieldErrors.currentPassword && (
                      <FieldError>{passwordFieldErrors.currentPassword}</FieldError>
                    )}
                  </Field>

                  <FieldRow>
                    <Field>
                      <Label htmlFor="new-password">Nouveau mot de passe</Label>
                      <Input
                        id="new-password"
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        required
                      />
                      {passwordFieldErrors.newPassword && (
                        <FieldError>{passwordFieldErrors.newPassword}</FieldError>
                      )}
                    </Field>

                    <Field>
                      <Label htmlFor="confirm-new-password">Confirmation</Label>
                      <Input
                        id="confirm-new-password"
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        required
                      />
                      {passwordFieldErrors.confirmPassword && (
                        <FieldError>{passwordFieldErrors.confirmPassword}</FieldError>
                      )}
                    </Field>
                  </FieldRow>
                </FieldGroup>
              </CardContent>

              <CardFooter className="mt-5 justify-end border-t">
                <Button type="submit" variant="outline" disabled={passwordSaving}>
                  {passwordSaving ? "Mise à jour…" : "Mettre à jour le mot de passe"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </SplitAside>

        {/* Colonne droite : Recherche + Comptes + Pagination uniquement */}
        <SplitMain>
          <Stack gap="md">
            <SearchInput
              aria-label="Rechercher un collègue"
              placeholder="Rechercher par nom, prénom, identifiant ou email…"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
            />

            {directoryError && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertDescription>{directoryError}</AlertDescription>
              </Alert>
            )}

            {directoryLoading ? (
              <Stack gap="sm">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </Stack>
            ) : colleagues.length === 0 ? (
              <Empty>
                <EmptyIcon>
                  <Users aria-hidden="true" />
                </EmptyIcon>
                <EmptyTitle>Aucun collègue trouvé</EmptyTitle>
                <EmptyDescription>
                  Aucun membre actif ne correspond à votre recherche.
                </EmptyDescription>
              </Empty>
            ) : (
              <Table>
                <TableBody>
                  {colleagues.map((colleague) => {
                    const isMe = me?.id === colleague.id
                    const isSelected = selectedColleague?.id === colleague.id
                    return (
                      <TableRow
                        key={colleague.id}
                        data-state={isSelected ? "selected" : undefined}
                      >
                        <TableCell>
                          <Cluster gap="md" wrap={false}>
                            <PresenceAvatar
                              initials={initialsOf(
                                colleague.firstName,
                                colleague.lastName,
                                colleague.username,
                              )}
                            />
                            <Stack gap="xs">
                              <Cluster gap="xs">
                                <span className="font-medium">{fullNameOf(colleague)}</span>
                                {isMe && <Badge variant="brand">Vous</Badge>}
                                {colleague.role === "COMPANY_ADMIN" && (
                                  <Badge variant="outline">Admin</Badge>
                                )}
                              </Cluster>
                              <span className="text-xs text-muted-foreground">
                                @{colleague.username} · {colleague.email}
                              </span>
                            </Stack>
                          </Cluster>
                        </TableCell>

                        <TableCell className="text-right">
                          <Cluster justify="end" gap="xs">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectColleague(colleague)}
                            >
                              Voir le profil
                            </Button>
                            {!isMe && onOpenConversation && (
                              <Button
                                type="button"
                                size="sm"
                                aria-label={`Envoyer un message à ${fullNameOf(colleague)}`}
                                onClick={() => onOpenConversation(colleague)}
                              >
                                <MessageSquare aria-hidden="true" />
                                Message
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Menu de ${fullNameOf(colleague)}`}
                                >
                                  <MoreHorizontal aria-hidden="true" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleSelectColleague(colleague)}
                                >
                                  <UserRound aria-hidden="true" />
                                  Consulter la fiche
                                </DropdownMenuItem>
                                {!isMe && onOpenConversation && (
                                  <DropdownMenuItem
                                    onClick={() => onOpenConversation(colleague)}
                                  >
                                    <MessageSquare aria-hidden="true" />
                                    Démarrer un chat privé
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </Cluster>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}

            <Cluster justify="between" className="pt-1 text-xs text-muted-foreground">
              <span>
                Page {page + 1} sur {totalPages}
              </span>
              <Cluster gap="sm">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={directoryLoading || page <= 0}
                  onClick={() => handleChangePage(page - 1)}
                  aria-label="Page précédente de l'annuaire"
                >
                  <ChevronLeft aria-hidden="true" />
                  Précédent
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={directoryLoading || page + 1 >= totalPages}
                  onClick={() => handleChangePage(page + 1)}
                  aria-label="Page suivante de l'annuaire"
                >
                  Suivant
                  <ChevronRight aria-hidden="true" />
                </Button>
              </Cluster>
            </Cluster>
          </Stack>
        </SplitMain>
      </SplitGrid>

      {/* Tiroir latéral type Microsoft Teams pour la fiche collègue */}
      <Sheet
        open={Boolean(selectedColleague)}
        onOpenChange={(open) => {
          if (!open) setSelectedColleague(null)
        }}
      >
        <SheetContent side="right" closeLabel="Fermer la fiche profil">
          {selectedColleague && (
            <>
              <SheetHeader>
                <Cluster gap="md" wrap={false}>
                  <PresenceAvatar
                    src={colleagueProfile?.profilePictureUrl ?? null}
                    alt={`Avatar de ${fullNameOf(selectedColleague)}`}
                    initials={initialsOf(
                      selectedColleague.firstName,
                      selectedColleague.lastName,
                      selectedColleague.username,
                    )}
                    size="lg"
                  />
                  <Stack gap="xs">
                    <SheetTitle>{fullNameOf(selectedColleague)}</SheetTitle>
                    <SheetDescription>@{selectedColleague.username}</SheetDescription>
                  </Stack>
                </Cluster>
              </SheetHeader>

              <SheetBody>
                <Stack gap="md">
                  <Cluster gap="sm">
                    <Badge variant="brand">
                      {selectedColleague.role === "COMPANY_ADMIN"
                        ? "Administrateur d'entreprise"
                        : "Membre"}
                    </Badge>
                    <Badge variant="success">Compte actif</Badge>
                  </Cluster>

                  <Card className="py-3">
                    <CardContent>
                      <Cluster gap="sm">
                        <Mail className="size-4 text-muted-foreground" aria-hidden="true" />
                        <span className="text-xs font-medium">{selectedColleague.email}</span>
                      </Cluster>
                    </CardContent>
                  </Card>

                  <Card className="py-4">
                    <CardHeader>
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                        Biographie
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {colleagueLoading ? (
                        <Skeleton className="h-16 w-full" />
                      ) : (
                        <p className="text-sm leading-relaxed">
                          {colleagueProfile?.bio?.trim()
                            ? colleagueProfile.bio
                            : "Ce membre n'a pas encore renseigné de biographie."}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Stack>
              </SheetBody>

              {me?.id !== selectedColleague.id && onOpenConversation && (
                <SheetFooter>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => {
                      const target = selectedColleague
                      setSelectedColleague(null)
                      onOpenConversation(target)
                    }}
                  >
                    <MessageSquare aria-hidden="true" />
                    Ouvrir une conversation privée
                  </Button>
                </SheetFooter>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
