import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { CompanyCreationPanel } from "@/components/admin/company-creation-panel"
import { createPreviewApi } from "@/data/api-preview"
import { ApiError } from "@/lib/api-client"

function fillCompanyForm(overrides: Partial<Record<string, string>> = {}) {
  const values: Record<string, string> = {
    "Nom de l'entreprise": "Acme SAS",
    "Code d'entreprise": "acme-2026",
    "Prénom de l'administrateur": "Claire",
    "Nom de l'administrateur": "Moreau",
    "Identifiant administrateur": "claire.moreau",
    "Email administrateur": "claire@acme.fr",
    "Mot de passe initial": "Secret123!",
    "Confirmation du mot de passe": "Secret123!",
    ...overrides,
  }

  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
  }
}

describe("CompanyCreationPanel", () => {
  it("vérifie la concordance des mots de passe avant d'appeler l'API", async () => {
    const user = userEvent.setup()
    const createCompany = vi.fn()
    render(<CompanyCreationPanel client={{ createCompany }} />)

    fillCompanyForm({ "Confirmation du mot de passe": "Autre123!" })
    await user.click(screen.getByRole("button", { name: "Créer l'entreprise" }))

    expect(screen.getByRole("alert")).toHaveTextContent(/La confirmation ne correspond pas au mot de passe/i)
    expect(createCompany).not.toHaveBeenCalled()
  })

  it("crée une entreprise et son premier administrateur via l'API puis affiche la confirmation", async () => {
    const user = userEvent.setup()
    const client = createPreviewApi()
    render(<CompanyCreationPanel client={client} />)

    fillCompanyForm()
    await user.click(screen.getByRole("button", { name: "Créer l'entreprise" }))

    const status = await screen.findByRole("status")
    expect(status).toHaveTextContent("Acme SAS")
    expect(status).toHaveTextContent("ACME-2026")
    expect(status).toHaveTextContent("claire.moreau")
  })

  it("affiche les erreurs métier par champ renvoyées par le serveur (ex. code déjà utilisé)", async () => {
    const user = userEvent.setup()
    const createCompany = vi.fn().mockRejectedValue(
      new ApiError(409, {
        code: "CONFLICT",
        message: "Ce code d'entreprise est déjà utilisé.",
        errors: { companyCode: "Ce code d'entreprise existe déjà." },
      }),
    )
    render(<CompanyCreationPanel client={{ createCompany }} />)

    fillCompanyForm()
    await user.click(screen.getByRole("button", { name: "Créer l'entreprise" }))

    await waitFor(() => {
      expect(screen.getByText("Ce code d'entreprise existe déjà.")).toBeInTheDocument()
    })
    expect(screen.getByText("Ce code d'entreprise est déjà utilisé.")).toBeInTheDocument()
  })
})
