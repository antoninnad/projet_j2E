import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { CompanyAdminPanel } from "@/components/admin/company-admin-panel"
import { createPreviewApi } from "@/data/api-preview"

describe("CompanyAdminPanel (T17)", () => {
  it("permet de désactiver puis réactiver un compte salarié, tout en empêchant de désactiver son propre compte", async () => {
    const user = userEvent.setup()
    const client = createPreviewApi()
    render(<CompanyAdminPanel client={client} />)

    // Le bouton de désactivation sur son propre compte (Alice Martin) est désactivé
    const selfDisableButton = await screen.findByRole("button", {
      name: "Désactiver le compte de Alice Martin",
    })
    expect(selfDisableButton).toBeDisabled()

    // Désactivation de Léa Dubois avec confirmation
    const disableLea = screen.getByRole("button", {
      name: "Désactiver le compte de Léa Dubois",
    })
    await user.click(disableLea)
    await user.click(screen.getByRole("button", { name: "Confirmer" }))

    expect(await screen.findByText("Désactivé")).toBeInTheDocument()

    // Réactivation
    await user.click(screen.getByRole("button", { name: "Réactiver" }))
    await waitFor(() => {
      expect(screen.queryByText("Désactivé")).not.toBeInTheDocument()
    })
  })

  it("permet de créer un département, affecter un membre avec son niveau L, modifier son niveau et le retirer", async () => {
    const user = userEvent.setup()
    const client = createPreviewApi()
    render(<CompanyAdminPanel client={client} />)

    // Départements initiaux chargés
    expect(await screen.findByRole("button", { name: "Finance" })).toBeInTheDocument()

    // Création d'un nouveau département
    fireEvent.change(screen.getByLabelText("Nouveau département"), {
      target: { value: "Juridique" },
    })
    await user.click(screen.getByRole("button", { name: "Créer le département" }))

    expect(await screen.findByText(/Membres du département « Juridique »/i)).toBeInTheDocument()

    // Affectation de Hugo Petit au niveau L = 3
    const select = screen.getByLabelText("Affecter un membre actif")
    fireEvent.change(select, { target: { value: "4" } })
    fireEvent.change(screen.getByLabelText("Niveau L", { selector: "#assign-member-level" }), {
      target: { value: "3" },
    })
    await user.click(screen.getByRole("button", { name: "Affecter" }))

    expect(await screen.findByRole("button", {
      name: "Retirer Hugo Petit du département",
    })).toBeInTheDocument()
    const hugoLevelInput = screen.getByDisplayValue("3")
    expect(hugoLevelInput).toBeInTheDocument()

    // Retrait de Hugo Petit du département
    await user.click(screen.getByRole("button", { name: "Retirer Hugo Petit du département" }))
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Retirer Hugo Petit du département" }),
      ).not.toBeInTheDocument()
    })
  })
})
