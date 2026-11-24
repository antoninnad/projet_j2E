import { useEffect, useState, type FormEvent } from "react"
import {
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Mail,
  MessageSquare,
  RefreshCw,
  Save,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { api, type Api } from "@/lib/api"
import { ApiError } from "@/lib/api-client"
import type { Page, Profile, User } from "@/types/api"

const DIRECTORY_PAGE_SIZE = 4

export type DirectoryProfileApi = Pick<
  Api,
  | "getSession"
  | "getMyProfile"
  | "updateMyProfile"
  | "updateUser"
  | "changeMyPassword"
  | "listUsers"
  | "getUserProfile"
>

function initialsOf(firstName?: string, lastName?: string, fallback = "?"): string {
  const value = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.trim().toUpperCase()
  return value || fallback.slice(0, 2).toUpperCase()
}

function fullNameOf(user: Pick<User, "firstName" | "lastName" | "username" | "email">): string {
  const full = `${user.firstName} ${user.lastName}`.trim()
  return full || user.username || user.email
}

export function DirectoryProfilePanel({
  client = api,
  onOpenConversation,
}: {
  client?: DirectoryProfileApi
  onOpenConversation?: (colleague: User) => void
}) {
  // --- État : Mon profil ---
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

  // --- État : Mot de passe ---
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<Record<string, string>>({})
  const [passwordSavedNotice, setPasswordSavedNotice] = useState<string | null>(null)

  // --- État : Annuaire ---
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [reloadTick, setReloadTick] = useState(0)
  const [directoryResult, setDirectoryResult] = useState<Page<User> | null>(null)
  const [directoryLoading, setDirectoryLoading] = useState(true)
  const [directoryError, setDirectoryError] = useState<string | null>(null)

  // --- État : Consultation profil collègue ---
  const [selectedColleague, setSelectedColleague] = useState<User | null>(null)
  const [colleagueProfile, setColleagueProfile] = useState<Profile | null>(null)
  const [colleagueLoading, setColleagueLoading] = useState(false)

  // Chargement initial de la session et du profil personnel
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([client.getSession(controller.signal), client.getMyProfile(controller.signal)])
      .then(([session, profile]) => {
        if (controller.signal.aborted) return
        setMe(session.user)
        setFirstName(session.user.firstName)
        setLastName(session.user.lastName)
        setBio(profile.bio ?? "")
        setAvatarUrl(profile.profilePictureUrl ?? "")
        setProfileError(null)
        setProfileLoading(false)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setProfileError(
          err instanceof Error ? err.message : "Impossible de charger votre profil pour le moment.",
        )
        setProfileLoading(false)
      })

    return () => controller.abort()
  }, [client])

  // Chargement paginé de l'annuaire des collègues actifs
  useEffect(() => {
    const controller = new AbortController()
    client
      .listUsers(
        {
          status: "ACTIVE",
          search: search.trim() || undefined,
          page,
          size: DIRECTORY_PAGE_SIZE,
          sort: "lastName,asc",
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
  }, [client, search, page, reloadTick])

  // Chargement de la fiche publique interne lorsqu'un collègue est sélectionné
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
        // Repli gracieux si l'endpoint détaillé n'est pas encore exposé côté serveur (T29)
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
    setDirectoryError(null)
    setReloadTick((value) => value + 1)
  }

  function handleSelectColleague(colleague: User) {
    setColleagueProfile(null)
    setColleagueLoading(true)
    setSelectedColleague(colleague)
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileFieldErrors({})
    setProfileError(null)
    setProfileSavedNotice(null)

    const trimmedFirst = firstName.trim()
    const trimmedLast = lastName.trim()
    const trimmedAvatar = avatarUrl.trim()
    const errors: Record<string, string> = {}

    if (!trimmedFirst) errors.firstName = "Le prénom est obligatoire."
    if (!trimmedLast) errors.lastName = "Le nom est obligatoire."
    if (bio.length > 2000) errors.bio = "La biographie ne doit pas dépasser 2000 caractères."
    if (trimmedAvatar && !/^https?:\/\/|^data:image\//i.test(trimmedAvatar)) {
      errors.profilePictureUrl = "Indiquez une URL valide commençant par https:// ou http://."
    }

    if (Object.keys(errors).length > 0) {
      setProfileFieldErrors(errors)
      return
    }

    setProfileSaving(true)
    try {
      let updatedUser = me
      if (me && (trimmedFirst !== me.firstName || trimmedLast !== me.lastName)) {
        updatedUser = await client.updateUser(me.id, {
          firstName: trimmedFirst,
          lastName: trimmedLast,
        })
        setMe(updatedUser)
      }
      const updatedProfile = await client.updateMyProfile({
        bio,
        profilePictureUrl: trimmedAvatar ? trimmedAvatar : null,
      })
      setBio(updatedProfile.bio)
      setAvatarUrl(updatedProfile.profilePictureUrl ?? "")
      setProfileSavedNotice("Votre profil a bien été enregistré.")
      setReloadTick((value) => value + 1)
      toast.success("Profil mis à jour")
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors) setProfileFieldErrors(err.errors)
        setProfileError(err.message)
      } else {
        setProfileError(err instanceof Error ? err.message : "Échec de l'enregistrement du profil.")
      }
    } finally {
      setProfileSaving(false)
    }
  }

  async function handleSavePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordFieldErrors({})
    setPasswordError(null)
    setPasswordSavedNotice(null)

    const errors: Record<string, string> = {}
    if (!currentPassword) errors.currentPassword = "Saisissez votre mot de passe actuel."
    if (newPassword.length < 8) {
      errors.newPassword = "Le nouveau mot de passe doit contenir au moins 8 caractères."
    } else if (newPassword === currentPassword) {
      errors.newPassword = "Choisissez un mot de passe différent de l'actuel."
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
      toast.success("Mot de passe mis à jour")
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors) setPasswordFieldErrors(err.errors)
        setPasswordError(err.message)
      } else {
        setPasswordError(err instanceof Error ? err.message : "Impossible de modifier le mot de passe.")
      }
    } finally {
      setPasswordSaving(false)
    }
  }

  const totalPages = Math.max(1, directoryResult?.page.totalPages ?? 1)
  const colleagues = directoryResult?.items ?? []

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Colonne gauche : Mon profil & Mot de passe */}
      <div className="space-y-6 lg:col-span-5">
        <section
          aria-labelledby="mon-profil-titre"
          className="overflow-hidden rounded-xl border border-border bg-background shadow-sm"
        >
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <UserRound className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <h2 id="mon-profil-titre" className="text-base font-semibold tracking-tight">
                Mon profil
              </h2>
              <p className="text-xs text-muted-foreground">
                Informations visibles par les collègues actifs de votre entreprise.
              </p>
            </div>
          </div>

          {profileLoading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Chargement de votre profil…</p>
          ) : (
            <form onSubmit={(event) => void handleSaveProfile(event)} className="space-y-4 p-5" noValidate>
              {profileError && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  {profileError}
                </div>
              )}

              {profileSavedNotice && (
                <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  {profileSavedNotice}
                </div>
              )}

              <div className="flex items-center gap-4">
                <Avatar className="size-14 border border-border">
                  {avatarUrl.trim() && <AvatarImage src={avatarUrl.trim()} alt="Aperçu de mon avatar" />}
                  <AvatarFallback className="text-sm font-semibold">
                    {initialsOf(firstName, lastName, me?.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1">
                  <label htmlFor="profile-avatar-url" className="block text-xs font-medium text-foreground">
                    URL de l'avatar
                  </label>
                  <div className="flex gap-2">
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
                        <X className="size-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                  {profileFieldErrors.profilePictureUrl && (
                    <p role="alert" className="text-xs text-destructive">
                      {profileFieldErrors.profilePictureUrl}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="profile-first-name" className="block text-sm font-medium text-foreground">
                    Prénom
                  </label>
                  <Input
                    id="profile-first-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    required
                  />
                  {profileFieldErrors.firstName && (
                    <p role="alert" className="text-xs text-destructive">
                      {profileFieldErrors.firstName}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="profile-last-name" className="block text-sm font-medium text-foreground">
                    Nom
                  </label>
                  <Input
                    id="profile-last-name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    required
                  />
                  {profileFieldErrors.lastName && (
                    <p role="alert" className="text-xs text-destructive">
                      {profileFieldErrors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="profile-bio" className="block text-sm font-medium text-foreground">
                    Biographie
                  </label>
                  <span className="text-xs text-muted-foreground">{bio.length} / 2000</span>
                </div>
                <Textarea
                  id="profile-bio"
                  rows={4}
                  maxLength={2000}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Présentez votre rôle, votre équipe et vos sujets…"
                />
                {profileFieldErrors.bio && (
                  <p role="alert" className="text-xs text-destructive">
                    {profileFieldErrors.bio}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={profileSaving}>
                  <Save className="size-4" aria-hidden="true" />
                  {profileSaving ? "Enregistrement…" : "Enregistrer mon profil"}
                </Button>
              </div>
            </form>
          )}
        </section>

        <section
          aria-labelledby="mot-de-passe-titre"
          className="overflow-hidden rounded-xl border border-border bg-background shadow-sm"
        >
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <KeyRound className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <h2 id="mot-de-passe-titre" className="text-base font-semibold tracking-tight">
                Modifier mon mot de passe
              </h2>
              <p className="text-xs text-muted-foreground">
                Minimum 8 caractères, chiffré côté serveur avec BCrypt.
              </p>
            </div>
          </div>

          <form onSubmit={(event) => void handleSavePassword(event)} className="space-y-4 p-5" noValidate>
            {passwordError && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                {passwordError}
              </div>
            )}

            {passwordSavedNotice && (
              <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                {passwordSavedNotice}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="current-password" className="block text-sm font-medium text-foreground">
                Mot de passe actuel
              </label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
              {passwordFieldErrors.currentPassword && (
                <p role="alert" className="text-xs text-destructive">
                  {passwordFieldErrors.currentPassword}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="new-password" className="block text-sm font-medium text-foreground">
                  Nouveau mot de passe
                </label>
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
                  <p role="alert" className="text-xs text-destructive">
                    {passwordFieldErrors.newPassword}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm-new-password" className="block text-sm font-medium text-foreground">
                  Confirmation
                </label>
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
                  <p role="alert" className="text-xs text-destructive">
                    {passwordFieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="outline" disabled={passwordSaving}>
                {passwordSaving ? "Mise à jour…" : "Mettre à jour le mot de passe"}
              </Button>
            </div>
          </form>
        </section>
      </div>

      {/* Colonne droite : Annuaire de l'entreprise & Fiche collègue */}
      <div className="space-y-6 lg:col-span-7">
        <section
          aria-labelledby="annuaire-entreprise-titre"
          className="overflow-hidden rounded-xl border border-border bg-background shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Users className="size-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <div>
                <h2 id="annuaire-entreprise-titre" className="text-base font-semibold tracking-tight">
                  Annuaire de l'entreprise
                </h2>
                <p className="text-xs text-muted-foreground">
                  Recherchez vos collègues actifs, consultez leur profil et lancez une conversation privée.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {directoryResult?.page.totalElements ?? 0} membre
                {(directoryResult?.page.totalElements ?? 0) > 1 ? "s" : ""} actif
                {(directoryResult?.page.totalElements ?? 0) > 1 ? "s" : ""}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefreshDirectory}
                disabled={directoryLoading}
              >
                <RefreshCw className={directoryLoading ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
                Actualiser
              </Button>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                aria-label="Rechercher un collègue"
                placeholder="Rechercher par nom, prénom, identifiant ou email…"
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="pl-9"
              />
            </div>

            {directoryError && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                {directoryError}
              </div>
            )}

            {directoryLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Chargement de l'annuaire…</p>
            ) : colleagues.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                <p className="text-sm font-medium text-foreground">Aucun collègue trouvé</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Modifiez votre recherche pour parcourir les membres actifs de votre entreprise.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {colleagues.map((colleague) => {
                  const isMe = me?.id === colleague.id
                  const isSelected = selectedColleague?.id === colleague.id
                  return (
                    <li
                      key={colleague.id}
                      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors ${
                        isSelected ? "bg-secondary/50" : "hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-10 border border-border">
                          <AvatarFallback className="text-xs font-semibold">
                            {initialsOf(colleague.firstName, colleague.lastName, colleague.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium text-foreground">
                              {fullNameOf(colleague)}
                            </p>
                            {isMe && <Badge variant="secondary">Vous</Badge>}
                            {colleague.role === "COMPANY_ADMIN" && <Badge variant="outline">Admin</Badge>}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            @{colleague.username} · {colleague.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
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
                            <MessageSquare className="size-4" aria-hidden="true" />
                            Message
                          </Button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              <span>
                Page {page + 1} sur {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={directoryLoading || page <= 0}
                  onClick={() => handleChangePage(page - 1)}
                  aria-label="Page précédente de l'annuaire"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
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
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {selectedColleague && (
          <section
            aria-labelledby="profil-collegue-titre"
            className="overflow-hidden rounded-xl border border-border bg-background shadow-sm"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-11 border border-border">
                  {colleagueProfile?.profilePictureUrl && (
                    <AvatarImage
                      src={colleagueProfile.profilePictureUrl}
                      alt={`Avatar de ${fullNameOf(selectedColleague)}`}
                    />
                  )}
                  <AvatarFallback className="text-xs font-semibold">
                    {initialsOf(selectedColleague.firstName, selectedColleague.lastName, selectedColleague.username)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 id="profil-collegue-titre" className="text-base font-semibold tracking-tight">
                    {fullNameOf(selectedColleague)}
                  </h3>
                  <p className="text-xs text-muted-foreground">@{selectedColleague.username}</p>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Fermer la fiche profil"
                onClick={() => setSelectedColleague(null)}
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-3.5" aria-hidden="true" />
                  {selectedColleague.email}
                </span>
                <Badge variant="outline">
                  {selectedColleague.role === "COMPANY_ADMIN" ? "Administrateur d'entreprise" : "Membre"}
                </Badge>
              </div>

              {colleagueLoading ? (
                <p className="text-sm text-muted-foreground">Chargement de la biographie…</p>
              ) : (
                <p className="rounded-lg border border-border bg-muted/20 p-3.5 text-sm leading-relaxed text-foreground">
                  {colleagueProfile?.bio?.trim()
                    ? colleagueProfile.bio
                    : "Ce membre n'a pas encore renseigné de biographie."}
                </p>
              )}

              {me?.id !== selectedColleague.id && onOpenConversation && (
                <div className="flex justify-end">
                  <Button type="button" onClick={() => onOpenConversation(selectedColleague)}>
                    <MessageSquare className="size-4" aria-hidden="true" />
                    Ouvrir une conversation privée
                  </Button>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
