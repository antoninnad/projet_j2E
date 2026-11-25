import { useState, type FormEvent } from "react"
import { Building2, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, type Api } from "@/lib/api"
import { ApiError } from "@/lib/api-client"
import type { CreateCompanyRequest, CreateCompanyResponse } from "@/types/api"

type CompanyCreationApi = Pick<Api, "createCompany">

const INITIAL_FORM: CreateCompanyRequest = {
  companyName: "",
  companyCode: "",
  adminFirstName: "",
  adminLastName: "",
  adminUsername: "",
  adminEmail: "",
  adminPassword: "",
  adminConfirmPassword: "",
}

export function CompanyCreationPanel({ client = api }: { client?: CompanyCreationApi }) {
  const [form, setForm] = useState<CreateCompanyRequest>(INITIAL_FORM)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreateCompanyResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function updateField<K extends keyof CreateCompanyRequest>(field: K, value: CreateCompanyRequest[K]) {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    setFormError(null)
    setCreated(null)

    const nextErrors: Record<string, string> = {}
    if (!form.companyName.trim()) nextErrors.companyName = "Le nom de l'entreprise est obligatoire."
    if (!form.companyCode.trim()) nextErrors.companyCode = "Le code d'entreprise est obligatoire."
    if (!form.adminFirstName.trim()) nextErrors.adminFirstName = "Le prénom est obligatoire."
    if (!form.adminLastName.trim()) nextErrors.adminLastName = "Le nom est obligatoire."
    if (!form.adminUsername.trim()) nextErrors.adminUsername = "L'identifiant est obligatoire."
    if (!form.adminEmail.trim()) nextErrors.adminEmail = "L'adresse email est obligatoire."
    if (form.adminPassword.length < 8) {
      nextErrors.adminPassword = "Le mot de passe doit contenir au moins 8 caractères."
    }
    if (form.adminPassword !== form.adminConfirmPassword) {
      nextErrors.adminConfirmPassword = "La confirmation ne correspond pas au mot de passe."
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    setSubmitting(true)
    try {
      const response = await client.createCompany({
        ...form,
        companyName: form.companyName.trim(),
        companyCode: form.companyCode.trim().toUpperCase(),
        adminFirstName: form.adminFirstName.trim(),
        adminLastName: form.adminLastName.trim(),
        adminUsername: form.adminUsername.trim(),
        adminEmail: form.adminEmail.trim(),
      })
      setCreated(response)
      setForm(INITIAL_FORM)
      toast.success(`Entreprise ${response.company.name} créée`, {
        description: `Premier administrateur : ${response.admin.email}`,
      })
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors) setFieldErrors(err.errors)
        setFormError(err.message)
      } else {
        setFormError(err instanceof Error ? err.message : "Impossible de créer l'entreprise pour le moment.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section
      aria-labelledby="creation-entreprise-titre"
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-primary-subtle-foreground ring-1 ring-primary/15">
            <Building2 className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="creation-entreprise-titre" className="text-base font-semibold tracking-tight">
              Créer une entreprise et son premier administrateur
            </h2>
            <p className="text-xs text-muted-foreground">
              Isolée des autres entreprises, elle disposera de son code d'inscription et de son compte administrateur actif.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4 p-5" noValidate>
        {formError && (
          <div role="alert" className="rounded-lg border border-destructive-border bg-destructive-subtle px-4 py-3 text-sm text-destructive-foreground">
            {formError}
          </div>
        )}

        {created && (
          <div role="status" className="rounded-lg border border-success-border bg-success-subtle px-4 py-3 text-sm text-success-foreground">
            Entreprise <strong>{created.company.name}</strong> (code{" "}
            <strong>{created.company.code ?? "—"}</strong>) créée avec l'administrateur{" "}
            <strong>{created.admin.username}</strong> ({created.admin.email}).
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="company-name" className="block text-sm font-medium text-foreground">
              Nom de l'entreprise
            </label>
            <Input
              id="company-name"
              name="companyName"
              value={form.companyName}
              onChange={(event) => updateField("companyName", event.target.value)}
              placeholder="Ex : Acme SAS"
              required
            />
            {fieldErrors.companyName && (
              <p role="alert" className="text-xs text-destructive">
                {fieldErrors.companyName}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="company-code" className="block text-sm font-medium text-foreground">
              Code d'entreprise
            </label>
            <Input
              id="company-code"
              name="companyCode"
              value={form.companyCode}
              onChange={(event) => updateField("companyCode", event.target.value)}
              placeholder="EX : ACME-2026"
              className="uppercase placeholder:normal-case"
              required
            />
            {fieldErrors.companyCode && (
              <p role="alert" className="text-xs text-destructive">
                {fieldErrors.companyCode}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="admin-first-name" className="block text-sm font-medium text-foreground">
              Prénom de l'administrateur
            </label>
            <Input
              id="admin-first-name"
              name="adminFirstName"
              value={form.adminFirstName}
              onChange={(event) => updateField("adminFirstName", event.target.value)}
              required
            />
            {fieldErrors.adminFirstName && (
              <p role="alert" className="text-xs text-destructive">
                {fieldErrors.adminFirstName}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="admin-last-name" className="block text-sm font-medium text-foreground">
              Nom de l'administrateur
            </label>
            <Input
              id="admin-last-name"
              name="adminLastName"
              value={form.adminLastName}
              onChange={(event) => updateField("adminLastName", event.target.value)}
              required
            />
            {fieldErrors.adminLastName && (
              <p role="alert" className="text-xs text-destructive">
                {fieldErrors.adminLastName}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="admin-username" className="block text-sm font-medium text-foreground">
              Identifiant administrateur
            </label>
            <Input
              id="admin-username"
              name="adminUsername"
              value={form.adminUsername}
              onChange={(event) => updateField("adminUsername", event.target.value)}
              placeholder="prenom.nom"
              required
            />
            {fieldErrors.adminUsername && (
              <p role="alert" className="text-xs text-destructive">
                {fieldErrors.adminUsername}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="admin-email" className="block text-sm font-medium text-foreground">
              Email administrateur
            </label>
            <Input
              id="admin-email"
              type="email"
              name="adminEmail"
              value={form.adminEmail}
              onChange={(event) => updateField("adminEmail", event.target.value)}
              placeholder="admin@entreprise.fr"
              required
            />
            {fieldErrors.adminEmail && (
              <p role="alert" className="text-xs text-destructive">
                {fieldErrors.adminEmail}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="admin-password" className="block text-sm font-medium text-foreground">
              Mot de passe initial
            </label>
            <Input
              id="admin-password"
              type="password"
              name="adminPassword"
              value={form.adminPassword}
              onChange={(event) => updateField("adminPassword", event.target.value)}
              minLength={8}
              required
            />
            {fieldErrors.adminPassword && (
              <p role="alert" className="text-xs text-destructive">
                {fieldErrors.adminPassword}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="admin-confirm-password" className="block text-sm font-medium text-foreground">
              Confirmation du mot de passe
            </label>
            <Input
              id="admin-confirm-password"
              type="password"
              name="adminConfirmPassword"
              value={form.adminConfirmPassword}
              onChange={(event) => updateField("adminConfirmPassword", event.target.value)}
              minLength={8}
              required
            />
            {fieldErrors.adminConfirmPassword && (
              <p role="alert" className="text-xs text-destructive">
                {fieldErrors.adminConfirmPassword}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={submitting}>
            <Plus className="size-4" aria-hidden="true" />
            {submitting ? "Création en cours…" : "Créer l'entreprise"}
          </Button>
        </div>
      </form>
    </section>
  )
}
