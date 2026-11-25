import { useState, type FormEvent } from "react"
import { AlertCircle, Building2, CheckCircle2, Plus } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldRow } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Cluster, IconTile, Stack } from "@/components/ui/layout"
import { Separator } from "@/components/ui/separator"
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
    <Card aria-labelledby="creation-entreprise-titre">
      <CardHeader className="border-b">
        <Cluster gap="md" wrap={false}>
          <IconTile tone="brand">
            <Building2 aria-hidden="true" />
          </IconTile>
          <Stack gap="xs">
            <CardTitle>
              <h2 id="creation-entreprise-titre">
                Créer une entreprise et son premier administrateur
              </h2>
            </CardTitle>
            <CardDescription>
              Isolée des autres entreprises, elle disposera de son code d&apos;inscription et de son compte administrateur actif.
            </CardDescription>
          </Stack>
        </Cluster>
      </CardHeader>

      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        <CardContent>
          <FieldGroup>
            {formError && (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            {created && (
              <Alert variant="success">
                <CheckCircle2 aria-hidden="true" />
                <AlertDescription>
                  Entreprise <strong>{created.company.name}</strong> (code{" "}
                  <strong>{created.company.code ?? "—"}</strong>) créée avec l&apos;administrateur{" "}
                  <strong>{created.admin.username}</strong> ({created.admin.email}).
                </AlertDescription>
              </Alert>
            )}

            <FieldRow>
              <Field>
                <Label htmlFor="company-name">Nom de l&apos;entreprise</Label>
                <Input
                  id="company-name"
                  name="companyName"
                  value={form.companyName}
                  onChange={(event) => updateField("companyName", event.target.value)}
                  placeholder="Ex : Acme SAS"
                  required
                />
                {fieldErrors.companyName && <FieldError>{fieldErrors.companyName}</FieldError>}
              </Field>

              <Field>
                <Label htmlFor="company-code">Code d&apos;entreprise</Label>
                <Input
                  id="company-code"
                  name="companyCode"
                  value={form.companyCode}
                  onChange={(event) => updateField("companyCode", event.target.value)}
                  placeholder="EX : ACME-2026"
                  className="uppercase placeholder:normal-case"
                  required
                />
                {fieldErrors.companyCode && <FieldError>{fieldErrors.companyCode}</FieldError>}
              </Field>
            </FieldRow>

            <Separator />

            <FieldRow>
              <Field>
                <Label htmlFor="admin-first-name">Prénom de l&apos;administrateur</Label>
                <Input
                  id="admin-first-name"
                  name="adminFirstName"
                  value={form.adminFirstName}
                  onChange={(event) => updateField("adminFirstName", event.target.value)}
                  required
                />
                {fieldErrors.adminFirstName && <FieldError>{fieldErrors.adminFirstName}</FieldError>}
              </Field>

              <Field>
                <Label htmlFor="admin-last-name">Nom de l&apos;administrateur</Label>
                <Input
                  id="admin-last-name"
                  name="adminLastName"
                  value={form.adminLastName}
                  onChange={(event) => updateField("adminLastName", event.target.value)}
                  required
                />
                {fieldErrors.adminLastName && <FieldError>{fieldErrors.adminLastName}</FieldError>}
              </Field>
            </FieldRow>

            <FieldRow>
              <Field>
                <Label htmlFor="admin-username">Identifiant administrateur</Label>
                <Input
                  id="admin-username"
                  name="adminUsername"
                  value={form.adminUsername}
                  onChange={(event) => updateField("adminUsername", event.target.value)}
                  placeholder="prenom.nom"
                  required
                />
                {fieldErrors.adminUsername && <FieldError>{fieldErrors.adminUsername}</FieldError>}
              </Field>

              <Field>
                <Label htmlFor="admin-email">Email administrateur</Label>
                <Input
                  id="admin-email"
                  type="email"
                  name="adminEmail"
                  value={form.adminEmail}
                  onChange={(event) => updateField("adminEmail", event.target.value)}
                  placeholder="admin@entreprise.fr"
                  required
                />
                {fieldErrors.adminEmail && <FieldError>{fieldErrors.adminEmail}</FieldError>}
              </Field>
            </FieldRow>

            <FieldRow>
              <Field>
                <Label htmlFor="admin-password">Mot de passe initial</Label>
                <Input
                  id="admin-password"
                  type="password"
                  name="adminPassword"
                  value={form.adminPassword}
                  onChange={(event) => updateField("adminPassword", event.target.value)}
                  minLength={8}
                  required
                />
                {fieldErrors.adminPassword && <FieldError>{fieldErrors.adminPassword}</FieldError>}
              </Field>

              <Field>
                <Label htmlFor="admin-confirm-password">Confirmation du mot de passe</Label>
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
                  <FieldError>{fieldErrors.adminConfirmPassword}</FieldError>
                )}
              </Field>
            </FieldRow>
          </FieldGroup>
        </CardContent>

        <CardFooter className="mt-5 justify-end border-t">
          <Button type="submit" disabled={submitting}>
            <Plus aria-hidden="true" />
            {submitting ? "Création en cours…" : "Créer l'entreprise"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
